/**
 * React Query 훅 생성 메인 로직
 * Bruno 파일들을 읽어서 React Query 훅들을 생성
 */

import { readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parseBrunoFile } from '../parser/bruParser';
import { extractApiFunction } from './apiClientGenerator';
import { generateReactQueryHook } from './reactQueryGenerator';
import { generateQueryKeyFile } from './queryKeyGenerator';
import { generateMSWHandler, generateDomainHandlersIndex, generateMSWIndex } from './mswGenerator';

export interface GenerateHooksOptions {
  brunoDir: string;
  outputDir: string;
  axiosInstancePath?: string;
  mswOutputDir?: string; // MSW 핸들러 출력 디렉토리
}

/**
 * Bruno 디렉토리에서 모든 .bru 파일 찾기
 */
function findBrunoFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.bru')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 파일 경로에서 도메인 추출
 * - "Solid Connection" 최상단 폴더를 제거하고 대괄호 패턴이 있는 첫 번째 폴더를 도메인으로 인식
 * - "숫자) 한글명 [영문키]" 형식: 1) 어드민 [Admin] → Admin
 * - "한글명 [영문키]" 형식: 사용자 [users] → users
 */
function extractDomain(filePath: string, brunoDir: string): string {
  const relativePath = relative(brunoDir, filePath);
  const parts = relativePath.split('/');
  
  // "Solid Connection" 폴더 제거
  const filteredParts = parts.filter(part => part !== 'Solid Connection');
  
  // 대괄호 패턴이 있는 첫 번째 폴더 찾기
  const bracketPattern = /\[([^\]]+)\]/;
  for (const part of filteredParts) {
    const bracketMatch = part.match(bracketPattern);
    if (bracketMatch) {
      return bracketMatch[1].trim(); // 대괄호 안의 영문키
    }
  }
  
  // 패턴이 없으면 파일이 있는 폴더명 사용 (마지막에서 두 번째)
  return filteredParts[filteredParts.length - 2] || filteredParts[0] || 'default';
}

/**
 * React Query 훅 생성
 */
export async function generateHooks(options: GenerateHooksOptions): Promise<void> {
  const { brunoDir, outputDir, axiosInstancePath = '@/utils/axiosInstance', mswOutputDir } = options;

  console.log('🔍 Searching for .bru files...');
  const brunoFiles = findBrunoFiles(brunoDir);
  console.log(`✅ Found ${brunoFiles.length} .bru files`);

  if (brunoFiles.length === 0) {
    console.log('⚠️  No .bru files found');
    return;
  }

  // Bruno 파일 파싱
  const parsedFiles = brunoFiles.map(filePath => {
    try {
      const parsed = parseBrunoFile(filePath);
      const domain = extractDomain(filePath, brunoDir);
      return { filePath, parsed, domain };
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error);
      return null;
    }
  }).filter(Boolean) as Array<{ filePath: string; parsed: any; domain: string }>;

  console.log(`📝 Parsed ${parsedFiles.length} files successfully`);

  // 출력 디렉토리 생성
  mkdirSync(outputDir, { recursive: true });

  // Query Keys 파일 생성
  console.log('\n📦 Generating query keys...');
  const queryKeyContent = generateQueryKeyFile(
    parsedFiles.map(f => ({ path: f.filePath, parsed: f.parsed, domain: f.domain }))
  );
  const queryKeyPath = join(outputDir, 'queryKeys.ts');
  writeFileSync(queryKeyPath, queryKeyContent, 'utf-8');
  console.log(`✅ Generated: ${queryKeyPath}`);

  // 도메인별 훅 생성
  console.log('\n🎣 Generating React Query hooks...');
  const domainDirs = new Set<string>();

  for (const { filePath, parsed, domain } of parsedFiles) {
    const apiFunc = extractApiFunction(parsed, filePath);
    if (!apiFunc) {
      console.log(`⚠️  Skipped ${filePath}: Invalid API function`);
      continue;
    }

    // 훅 생성
    const hook = generateReactQueryHook(parsed, apiFunc, domain, axiosInstancePath);

    // 도메인 디렉토리 생성
    const domainDir = join(outputDir, domain);
    if (!domainDirs.has(domainDir)) {
      mkdirSync(domainDir, { recursive: true });
      domainDirs.add(domainDir);
    }

    // 훅 파일 작성
    const hookPath = join(domainDir, hook.fileName);
    writeFileSync(hookPath, hook.content, 'utf-8');
    console.log(`✅ Generated: ${hookPath}`);
  }

  // 인덱스 파일 생성 (선택사항)
  console.log('\n📄 Generating index files...');
  for (const domainDir of domainDirs) {
    const domain = relative(outputDir, domainDir);
    const files = readdirSync(domainDir).filter(f => f.endsWith('.ts'));

    const indexContent = files
      .map(file => {
        const name = file.replace('.ts', '');
        return `export { default as ${name} } from './${name}';`;
      })
      .join('\n') + '\n';

    const indexPath = join(domainDir, 'index.ts');
    writeFileSync(indexPath, indexContent, 'utf-8');
    console.log(`✅ Generated: ${indexPath}`);
  }

  console.log('\n✨ All hooks generated successfully!');
  console.log(`\n📂 Output directory: ${outputDir}`);
  console.log('\n📚 Usage example:');
  console.log(`import { useGetApplicationsCompetitors } from './${relative(process.cwd(), join(outputDir, 'applications'))}';\n`);
  console.log(`const { data, isLoading, error } = useGetApplicationsCompetitors();`);

  // MSW 핸들러 생성 (옵션이 제공된 경우)
  if (mswOutputDir) {
    console.log('\n🎭 Generating MSW handlers...');
    await generateMSWHandlers(parsedFiles, mswOutputDir);
  }
}

/**
 * MSW 핸들러 생성
 */
async function generateMSWHandlers(
  parsedFiles: Array<{ filePath: string; parsed: any; domain: string }>,
  mswOutputDir: string
): Promise<void> {
  // MSW 출력 디렉토리 생성
  mkdirSync(mswOutputDir, { recursive: true });

  // 도메인별로 핸들러 그룹화
  const domainHandlers = new Map<string, Array<{ fileName: string; content: string }>>();

  for (const { filePath, parsed, domain } of parsedFiles) {
    const handler = generateMSWHandler(parsed, filePath, domain);

    if (!handler) {
      // done: true 또는 docs 없음
      continue;
    }

    if (!domainHandlers.has(domain)) {
      domainHandlers.set(domain, []);
    }

    domainHandlers.get(domain)!.push({
      fileName: handler.fileName,
      content: handler.content,
    });
  }

  // 도메인별 디렉토리 및 파일 생성
  const domains: string[] = [];

  for (const [domain, handlers] of domainHandlers.entries()) {
    domains.push(domain);

    // 도메인 디렉토리 생성
    const domainDir = join(mswOutputDir, domain);
    mkdirSync(domainDir, { recursive: true });

    // 각 핸들러 파일 작성
    const handlerInfos: Array<{ fileName: string; handlerName: string }> = [];

    for (const handler of handlers) {
      const handlerPath = join(domainDir, handler.fileName);
      writeFileSync(handlerPath, handler.content, 'utf-8');
      console.log(`✅ MSW Generated: ${handlerPath}`);

      handlerInfos.push({
        fileName: handler.fileName,
        handlerName: handler.fileName.replace('.ts', ''),
      });
    }

    // 도메인별 index 파일 생성
    const domainIndexContent = generateDomainHandlersIndex(domain, handlerInfos);
    const domainIndexPath = join(domainDir, 'index.ts');
    writeFileSync(domainIndexPath, domainIndexContent, 'utf-8');
    console.log(`✅ MSW Index Generated: ${domainIndexPath}`);
  }

  // 전체 handlers index 파일 생성
  if (domains.length > 0) {
    const mswIndexContent = generateMSWIndex(domains);
    const mswIndexPath = join(mswOutputDir, 'handlers.ts');
    writeFileSync(mswIndexPath, mswIndexContent, 'utf-8');
    console.log(`✅ MSW Main Index Generated: ${mswIndexPath}`);

    console.log(`\n🎭 MSW handlers generated successfully!`);
    console.log(`📂 MSW Output directory: ${mswOutputDir}`);
    console.log(`\n📚 Usage example:`);
    console.log(`import { handlers } from './${relative(process.cwd(), mswIndexPath).replace('.ts', '')}';\n`);
    console.log(`const worker = setupWorker(...handlers);`);
  } else {
    console.log(`ℹ️  No MSW handlers generated (all files have done: true or missing docs)`);
  }
}

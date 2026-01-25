/**
 * React Query 훅 생성 메인 로직
 * Bruno 파일들을 읽어서 React Query 훅들을 생성
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parseBrunoFile } from '../parser/bruParser';
import { extractApiFunction } from './apiClientGenerator';
import { generateReactQueryHook } from './reactQueryGenerator';
import { generateQueryKeyFile } from './queryKeyGenerator';
import { generateMSWHandler, generateDomainHandlersIndex, generateMSWIndex } from './mswGenerator';
import { generateApiFactory } from './apiFactoryGenerator';
import { BrunoHashCache } from './brunoHashCache';
import { toCamelCase } from './typeGenerator';

export interface GenerateHooksOptions {
  brunoDir: string;
  outputDir: string;
  axiosInstancePath?: string;
  mswOutputDir?: string; // MSW 핸들러 출력 디렉토리
  force?: boolean; // 강제 재생성 플래그
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
      } else if (entry.endsWith('.bru') && entry !== 'collection.bru') {
        // collection.bru는 메타데이터 파일이므로 제외
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
  const { brunoDir, outputDir, axiosInstancePath = '@/utils/axiosInstance', mswOutputDir, force = false } = options;

  // 해시 캐시 초기화
  const hashCache = new BrunoHashCache(outputDir);
  hashCache.load();

  console.log('🔍 Searching for .bru files...');
  const brunoFiles = findBrunoFiles(brunoDir);
  console.log(`✅ Found ${brunoFiles.length} .bru files`);

  if (brunoFiles.length === 0) {
    console.log('⚠️  No .bru files found');
    return;
  }

  // 변경된 파일 필터링
  let changedFiles: string[] = [];
  const skippedFiles: string[] = [];

  if (force) {
    console.log('🔨 Force mode: regenerating all hooks');
    changedFiles = brunoFiles;
  } else {
    for (const filePath of brunoFiles) {
      if (hashCache.hasChanged(filePath)) {
        changedFiles.push(filePath);
      } else {
        skippedFiles.push(filePath);
      }
    }
  }

  console.log(`📊 Changed: ${changedFiles.length}, Skipped: ${skippedFiles.length}`);

  // 변경이 없으면 종료
  if (changedFiles.length === 0) {
    console.log('✅ All hooks are up to date!');
    return;
  }

  // 변경된 파일 파싱
  const parsedChangedFiles = changedFiles.map(filePath => {
    try {
      const parsed = parseBrunoFile(filePath);
      const domain = extractDomain(filePath, brunoDir);
      return { filePath, parsed, domain };
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error);
      return null;
    }
  }).filter(Boolean) as Array<{ filePath: string; parsed: any; domain: string }>;

  // 전체 파일 파싱 (QueryKeys, API 팩토리용)
  const allParsedFiles = brunoFiles.map(filePath => {
    try {
      const parsed = parseBrunoFile(filePath);
      const domain = extractDomain(filePath, brunoDir);
      return { filePath, parsed, domain };
    } catch (error) {
      return null;
    }
  }).filter(Boolean) as Array<{ filePath: string; parsed: any; domain: string }>;

  console.log(`📝 Parsed ${parsedChangedFiles.length} changed files successfully`);

  // 출력 디렉토리 생성
  mkdirSync(outputDir, { recursive: true });

  // Query Keys 파일 생성 (항상 전체)
  console.log('\n📦 Generating query keys...');
  const queryKeyContent = generateQueryKeyFile(
    allParsedFiles.map(f => ({ path: f.filePath, parsed: f.parsed, domain: f.domain }))
  );
  const queryKeyPath = join(outputDir, 'queryKeys.ts');
  writeFileSync(queryKeyPath, queryKeyContent, 'utf-8');
  console.log(`✅ Generated: ${queryKeyPath}`);

  // 영향받는 도메인 수집
  const affectedDomains = new Set(parsedChangedFiles.map(f => f.domain));

  // 도메인별로 API 함수 그룹화 (전체 파일)
  const domainApiFunctions = new Map<string, Array<{ apiFunc: any; parsed: any }>>();
  const domainDirs = new Set<string>();

  for (const { filePath, parsed, domain } of allParsedFiles) {
    const apiFunc = extractApiFunction(parsed, filePath);
    if (!apiFunc) {
      continue;
    }

    // 도메인 디렉토리 생성
    const domainDir = join(outputDir, domain);
    if (!domainDirs.has(domainDir)) {
      mkdirSync(domainDir, { recursive: true });
      domainDirs.add(domainDir);
    }

    // 도메인별 API 함수 수집
    if (!domainApiFunctions.has(domain)) {
      domainApiFunctions.set(domain, []);
    }
    domainApiFunctions.get(domain)!.push({ apiFunc, parsed });
  }

  // 영향받는 도메인의 API 팩토리만 재생성
  console.log('\n🏭 Generating API factories...');
  for (const domain of affectedDomains) {
    const domainDir = join(outputDir, domain);
    mkdirSync(domainDir, { recursive: true });
    const apiFunctions = domainApiFunctions.get(domain) || [];
    const factoryContent = generateApiFactory(apiFunctions, domain, axiosInstancePath);
    const factoryPath = join(domainDir, 'api.ts');
    writeFileSync(factoryPath, factoryContent, 'utf-8');
    console.log(`✅ Generated: ${factoryPath}`);
  }

  // 훅 생성 (변경된 파일만)
  console.log('\n🎣 Generating React Query hooks...');
  for (const { filePath, parsed, domain } of parsedChangedFiles) {
    const apiFunc = extractApiFunction(parsed, filePath);

    // extractApiFunction이 실패해도 해시는 업데이트 (다음번에 스킵하기 위해)
    const currentHash = hashCache.calculateHash(filePath);

    if (!apiFunc) {
      // API 함수 추출 실패 시에도 해시 저장 (빈 outputFiles 배열)
      hashCache.setHash(filePath, currentHash, []);
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

    // 훅 파일 직접 생성/덮어쓰기 (Legacy 로직 제거)
    const hookPath = join(domainDir, hook.fileName);
    writeFileSync(hookPath, hook.content, 'utf-8');

    // 해시 업데이트
    hashCache.setHash(filePath, currentHash, [hookPath]);

    console.log(`✅ Generated: ${hookPath}`);
  }

  // 인덱스 파일 생성 (영향받는 도메인만)
  console.log('\n📄 Generating index files...');
  for (const domain of affectedDomains) {
    const domainDir = join(outputDir, domain);
    const files = readdirSync(domainDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

    const indexContent = files
      .map(file => {
        const name = file.replace('.ts', '');
        // api.ts는 named export이므로 특별 처리
        if (name === 'api') {
          const factoryName = `${toCamelCase(domain)}Api`;
          return `export { ${factoryName} } from './api';`;
        }
        // 훅 파일들은 default export
        return `export { default as ${name} } from './${name}';`;
      })
      .join('\n') + '\n';

    const indexPath = join(domainDir, 'index.ts');
    writeFileSync(indexPath, indexContent, 'utf-8');
    console.log(`✅ Generated: ${indexPath}`);
  }

  // 캐시 정리 및 저장
  hashCache.cleanup();
  hashCache.save();
  console.log(`\n💾 Hash cache saved: ${hashCache.getCachePath()}`);

  console.log('\n✨ All hooks generated successfully!');
  console.log(`\n📂 Output directory: ${outputDir}`);
  console.log('\n📚 Usage example:');
  console.log(`import { useGetApplicationsCompetitors } from './${relative(process.cwd(), join(outputDir, 'applications'))}';\n`);
  console.log(`const { data, isLoading, error } = useGetApplicationsCompetitors();`);

  // MSW 핸들러 생성 (옵션이 제공된 경우)
  if (mswOutputDir) {
    console.log('\n🎭 Generating MSW handlers...');
    await generateMSWHandlers(parsedChangedFiles, mswOutputDir);
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

    // MSW 핸들러는 항상 생성 (docs 없어도 기본 응답 사용)
    if (!handler) {
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
    console.log(`ℹ️  No MSW handlers generated`);
  }
}

#!/usr/bin/env node

/**
 * bruno-api-typescript CLI
 * Generate TypeScript API clients, React Query hooks, and OpenAPI specs from Bruno files
 */

import { Command } from 'commander';
import { existsSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { convertBrunoToOpenAPI } from '../converter/openapiConverter';
import { detectChanges } from '../diff/changeDetector';
import { generateChangelog, formatConsoleOutput, ChangelogFormat } from '../diff/changelogGenerator';
import { generateHooks } from '../generator/index';
import { BrunoHashCache } from '../generator/brunoHashCache';

const program = new Command();

program
  .name('bruno-api')
  .description('Generate TypeScript API clients, React Query hooks, and OpenAPI specs from Bruno files')
  .version('0.3.0');

program
  .command('generate')
  .description('Generate OpenAPI spec from Bruno collection')
  .option('-i, --input <path>', 'Bruno collection directory', './bruno')
  .option('-o, --output <path>', 'Output OpenAPI file', './openapi.json')
  .option('--title <title>', 'API title', 'API Documentation')
  .option('--version <version>', 'API version', '1.0.0')
  .option('--description <description>', 'API description')
  .option('--base-url <url>', 'Base URL for API')
  .option('--diff', 'Detect changes from previous version', false)
  .option('--changelog <path>', 'Generate changelog file')
  .option(
    '--changelog-format <format>',
    'Changelog format: markdown | json | html',
    'markdown'
  )
  .option('--breaking-only', 'Show only breaking changes', false)
  .action(async (options) => {
    try {
      const inputDir = resolve(process.cwd(), options.input);
      const outputFile = resolve(process.cwd(), options.output);

      // 입력 디렉토리 확인
      if (!existsSync(inputDir)) {
        console.error(`❌ Bruno directory not found: ${inputDir}`);
        process.exit(1);
      }

      console.log('🔄 Generating OpenAPI spec...');

      // 이전 버전 백업 (diff 모드일 때)
      let oldSpecPath: string | null = null;
      if (options.diff && existsSync(outputFile)) {
        oldSpecPath = outputFile + '.old';
        copyFileSync(outputFile, oldSpecPath);
      }

      // OpenAPI 생성
      const spec = convertBrunoToOpenAPI(inputDir, {
        title: options.title,
        version: options.version,
        description: options.description,
        baseUrl: options.baseUrl,
      });

      // 파일 저장
      writeFileSync(outputFile, JSON.stringify(spec, null, 2), 'utf-8');
      console.log(`✅ OpenAPI spec generated: ${outputFile}`);

      // 변경사항 감지
      if (options.diff && oldSpecPath && existsSync(oldSpecPath)) {
        console.log('\n🔍 Detecting changes...');

        try {
          const report = detectChanges(oldSpecPath, outputFile);

          // 콘솔 출력
          console.log(formatConsoleOutput(report, options.breakingOnly));

          // Changelog 생성
          if (options.changelog) {
            const changelogPath = resolve(process.cwd(), options.changelog);
            const format = options.changelogFormat as ChangelogFormat;

            generateChangelog(report, {
              format,
              output: changelogPath,
              breakingOnly: options.breakingOnly,
            });
          }

          // Breaking changes가 있으면 exit code 1
          if (report.summary.breaking > 0 && options.breakingOnly) {
            console.log(
              '\n⚠️  Breaking changes detected! Please review the changes carefully.\n'
            );
            process.exit(1);
          }
        } catch (error: any) {
          console.warn(`⚠️  Failed to detect changes: ${error.message}`);
        }
      }

      console.log('\n✨ Done!\n');
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('generate-hooks')
  .description('Generate React Query hooks from Bruno collection')
  .option('-i, --input <path>', 'Bruno collection directory', './bruno')
  .option('-o, --output <path>', 'Output hooks directory', './src/apis')
  .option('--axios-path <path>', 'Axios instance import path', '@/utils/axiosInstance')
  .option('--msw-output <path>', 'Output MSW handlers directory (optional)')
  .option('--force', 'Force regenerate all hooks (ignore hash cache)', false)
  .option('--clear-cache', 'Clear hash cache before generation', false)
  .action(async (options) => {
    try {
      const inputDir = resolve(process.cwd(), options.input);
      const outputDir = resolve(process.cwd(), options.output);
      const mswOutputDir = options.mswOutput ? resolve(process.cwd(), options.mswOutput) : undefined;

      // 입력 디렉토리 확인
      if (!existsSync(inputDir)) {
        console.error(`❌ Bruno directory not found: ${inputDir}`);
        process.exit(1);
      }

      // --clear-cache 처리
      if (options.clearCache) {
        const cache = new BrunoHashCache(outputDir);
        cache.clear();
        cache.save();
        console.log('🗑️  Hash cache cleared\n');
      }

      console.log('🎣 Generating React Query hooks...\n');

      await generateHooks({
        brunoDir: inputDir,
        outputDir,
        axiosInstancePath: options.axiosPath,
        mswOutputDir,
        force: options.force,
      });

      console.log('\n🎉 React Query hooks generated successfully!');
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();

/**
 * CLI 기능 테스트
 * Node.js 기본 test runner 사용
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { existsSync, rmSync, mkdirSync, readFileSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');

const FIXTURES_DIR = join(__dirname, 'fixtures');
const TEST_OUTPUT_DIR = join(__dirname, 'output');

// 테스트 전 정리
before(() => {
  if (existsSync(TEST_OUTPUT_DIR)) {
    rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
});

// 테스트 후 정리
after(() => {
  if (existsSync(TEST_OUTPUT_DIR)) {
    rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
});

describe('OpenAPI 생성 테스트', () => {
  test('기본 OpenAPI 스펙 생성', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputFile = join(TEST_OUTPUT_DIR, 'openapi.json');

    // CLI 실행
    execSync(`node dist/cli/index.js generate -i ${inputDir} -o ${outputFile}`, {
      cwd: join(__dirname, '..'),
    });

    // 파일 생성 확인
    assert.ok(existsSync(outputFile), 'OpenAPI 파일이 생성되어야 함');

    // JSON 파싱 가능 확인
    const spec = JSON.parse(readFileSync(outputFile, 'utf-8'));

    // 기본 구조 검증
    assert.ok(spec.openapi, 'openapi 버전이 있어야 함');
    assert.ok(spec.info, 'info 객체가 있어야 함');
    assert.ok(spec.paths, 'paths 객체가 있어야 함');

    // 엔드포인트 확인
    assert.ok(spec.paths['/users/profile'], '/users/profile 엔드포인트가 있어야 함');
    assert.ok(spec.paths['/applications/competitors'], '/applications/competitors 엔드포인트가 있어야 함');

    // GET 메서드 확인
    assert.ok(spec.paths['/users/profile'].get, 'GET /users/profile가 있어야 함');
    assert.ok(spec.paths['/applications/competitors'].get, 'GET /applications/competitors가 있어야 함');

    console.log('✅ OpenAPI 생성 테스트 통과');
  });

  test('도메인별 태그 그룹화', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputFile = join(TEST_OUTPUT_DIR, 'openapi-tags.json');

    execSync(`node dist/cli/index.js generate -i ${inputDir} -o ${outputFile}`, {
      cwd: join(__dirname, '..'),
    });

    const spec = JSON.parse(readFileSync(outputFile, 'utf-8'));

    // 태그 확인
    assert.ok(spec.paths['/users/profile'].get.tags, '태그가 있어야 함');
    assert.ok(spec.paths['/users/profile'].get.tags.includes('users'), 'users 태그가 있어야 함');

    console.log('✅ 도메인별 태그 그룹화 테스트 통과');
  });

  test('응답 스키마 생성', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputFile = join(TEST_OUTPUT_DIR, 'openapi-schema.json');

    execSync(`node dist/cli/index.js generate -i ${inputDir} -o ${outputFile}`, {
      cwd: join(__dirname, '..'),
    });

    const spec = JSON.parse(readFileSync(outputFile, 'utf-8'));

    // 응답 스키마 확인
    const userProfileResponse = spec.paths['/users/profile'].get.responses['200'];
    assert.ok(userProfileResponse, '200 응답이 있어야 함');
    assert.ok(userProfileResponse.content, 'content가 있어야 함');
    assert.ok(userProfileResponse.content['application/json'], 'application/json이 있어야 함');
    assert.ok(userProfileResponse.content['application/json'].schema, 'schema가 있어야 함');

    const schema = userProfileResponse.content['application/json'].schema;
    assert.ok(schema.properties, 'properties가 있어야 함');
    assert.ok(schema.properties.id, 'id 필드가 있어야 함');
    assert.ok(schema.properties.username, 'username 필드가 있어야 함');

    console.log('✅ 응답 스키마 생성 테스트 통과');
  });
});

describe('React Query Hooks 생성 테스트', () => {
  test('기본 훅 파일 생성', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputDir = join(TEST_OUTPUT_DIR, 'apis');

    execSync(`node dist/cli/index.js generate-hooks -i ${inputDir} -o ${outputDir}`, {
      cwd: join(__dirname, '..'),
    });

    // queryKeys.ts 생성 확인
    const queryKeysFile = join(outputDir, 'queryKeys.ts');
    assert.ok(existsSync(queryKeysFile), 'queryKeys.ts가 생성되어야 함');

    // 도메인별 디렉토리 생성 확인
    const usersDir = join(outputDir, 'users');
    const applicationsDir = join(outputDir, 'applications');
    assert.ok(existsSync(usersDir), 'users 디렉토리가 생성되어야 함');
    assert.ok(existsSync(applicationsDir), 'applications 디렉토리가 생성되어야 함');

    // 훅 파일 생성 확인
    const userProfileHook = join(usersDir, 'get-getProfile.ts');
    const competitorsHook = join(applicationsDir, 'get-getCompetitors.ts');
    
    assert.ok(existsSync(userProfileHook), 'getProfile 훅이 생성되어야 함');
    assert.ok(existsSync(competitorsHook), 'getCompetitors 훅이 생성되어야 함');

    console.log('✅ 기본 훅 파일 생성 테스트 통과');
  });

  test('훅 파일 내용 검증', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputDir = join(TEST_OUTPUT_DIR, 'apis-content');

    execSync(`node dist/cli/index.js generate-hooks -i ${inputDir} -o ${outputDir}`, {
      cwd: join(__dirname, '..'),
    });

    const userProfileHook = join(outputDir, 'users', 'get-getProfile.ts');
    const content = readFileSync(userProfileHook, 'utf-8');

    // 필수 import 확인
    assert.ok(content.includes('import { useQuery }'), 'useQuery import가 있어야 함');
    assert.ok(content.includes('import { AxiosError }'), 'AxiosError import가 있어야 함');
    assert.ok(content.includes('QueryKeys'), 'QueryKeys import가 있어야 함');

    // 타입 정의 확인
    assert.ok(content.includes('interface'), 'interface가 있어야 함');
    assert.ok(content.includes('export'), 'export가 있어야 함');

    // 함수 정의 확인
    assert.ok(content.includes('const use'), '훅 함수가 있어야 함');
    assert.ok(content.includes('export default'), 'default export가 있어야 함');

    console.log('✅ 훅 파일 내용 검증 테스트 통과');
  });

  test('index 파일 생성', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputDir = join(TEST_OUTPUT_DIR, 'apis-index');

    execSync(`node dist/cli/index.js generate-hooks -i ${inputDir} -o ${outputDir}`, {
      cwd: join(__dirname, '..'),
    });

    // 도메인별 index.ts 파일 확인
    const usersIndex = join(outputDir, 'users', 'index.ts');
    const applicationsIndex = join(outputDir, 'applications', 'index.ts');

    assert.ok(existsSync(usersIndex), 'users/index.ts가 생성되어야 함');
    assert.ok(existsSync(applicationsIndex), 'applications/index.ts가 생성되어야 함');

    // index 파일 내용 확인
    const usersIndexContent = readFileSync(usersIndex, 'utf-8');
    assert.ok(usersIndexContent.includes('export'), 'export가 있어야 함');
    assert.ok(usersIndexContent.includes('default'), 'default가 있어야 함');

    console.log('✅ index 파일 생성 테스트 통과');
  });
});

describe('변경사항 감지 테스트', () => {
  test('변경사항 감지 기능', () => {
    const brunoV1 = join(FIXTURES_DIR, 'bruno');
    const brunoV2 = join(FIXTURES_DIR, 'bruno-v2');
    const outputV1 = join(TEST_OUTPUT_DIR, 'openapi-v1.json');
    const outputV2 = join(TEST_OUTPUT_DIR, 'openapi-v2.json');

    // V1 생성
    execSync(`node dist/cli/index.js generate -i ${brunoV1} -o ${outputV1}`, {
      cwd: join(__dirname, '..'),
    });

    // V2 생성 (변경사항 포함)
    execSync(`node dist/cli/index.js generate -i ${brunoV2} -o ${outputV2}`, {
      cwd: join(__dirname, '..'),
    });

    // 파일 비교
    const specV1 = JSON.parse(readFileSync(outputV1, 'utf-8'));
    const specV2 = JSON.parse(readFileSync(outputV2, 'utf-8'));

    // V2에 추가된 엔드포인트 확인
    const v1Paths = Object.keys(specV1.paths);
    const v2Paths = Object.keys(specV2.paths);

    assert.ok(v2Paths.length >= v1Paths.length, 'V2가 V1보다 많거나 같은 엔드포인트를 가져야 함');

    console.log('✅ 변경사항 감지 기능 테스트 통과');
  });
});

describe('새로운 폴더명 패턴 테스트', () => {
  test('[한글명] 숫자 영문키 패턴 추출', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputDir = join(TEST_OUTPUT_DIR, 'apis-pattern');

    execSync(`node dist/cli/index.js generate-hooks -i ${inputDir} -o ${outputDir}`, {
      cwd: join(__dirname, '..'),
    });

    // [어드민] 7 Admin 폴더가 생성되었는지 확인
    const adminDir = join(outputDir, '7 Admin');
    assert.ok(existsSync(adminDir), '[어드민] 7 Admin 폴더가 생성되어야 함');

    // 훅 파일 생성 확인
    const hookFile = join(adminDir, 'get-getList.ts');
    assert.ok(existsSync(hookFile), 'getList 훅이 생성되어야 함');

    console.log('✅ [한글명] 숫자 영문키 패턴 테스트 통과');
  });

  test('[한국어 키] 영어 파일명 패턴 추출', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputDir = join(TEST_OUTPUT_DIR, 'apis-filename-pattern');

    execSync(`node dist/cli/index.js generate-hooks -i ${inputDir} -o ${outputDir}`, {
      cwd: join(__dirname, '..'),
    });

    // QueryKeys 파일 확인
    const queryKeysFile = join(outputDir, 'queryKeys.ts');
    const queryKeysContent = readFileSync(queryKeysFile, 'utf-8');

    // [목록 조회] get-list.bru → getList로 추출되어야 함
    assert.ok(queryKeysContent.includes('getList'), 'getList 쿼리 키가 생성되어야 함');
    assert.ok(queryKeysContent.includes("'7 Admin.getList'"), '7 Admin.getList 쿼리 키가 생성되어야 함');

    // 훅 파일 확인
    const hookFile = join(outputDir, '7 Admin', 'get-getList.ts');
    assert.ok(existsSync(hookFile), '[목록 조회] get-list.bru에서 getList 훅이 생성되어야 함');

    const hookContent = readFileSync(hookFile, 'utf-8');
    assert.ok(hookContent.includes('getList'), '훅 내용에 getList가 포함되어야 함');
    assert.ok(hookContent.includes('useGetList'), 'useGetList 훅이 생성되어야 함');

    console.log('✅ [한국어 키] 영어 파일명 패턴 테스트 통과');
  });
});

describe('상태 코드별 응답 파싱 테스트', () => {
  test('200 OK만 추출 (404 무시)', () => {
    const inputDir = join(FIXTURES_DIR, 'bruno');
    const outputFile = join(TEST_OUTPUT_DIR, 'openapi-status-codes.json');

    execSync(`node dist/cli/index.js generate -i ${inputDir} -o ${outputFile}`, {
      cwd: join(__dirname, '..'),
    });

    const spec = JSON.parse(readFileSync(outputFile, 'utf-8'));

    // /mentors 엔드포인트 확인
    const mentorsPath = spec.paths['/mentors'];
    assert.ok(mentorsPath, '/mentors 엔드포인트가 있어야 함');

    // 200 응답만 있는지 확인 (404는 무시되어야 함)
    const getMethod = mentorsPath.get;
    assert.ok(getMethod, 'GET 메서드가 있어야 함');
    assert.ok(getMethod.responses['200'], '200 응답이 있어야 함');
    assert.ok(!getMethod.responses['404'], '404 응답은 포함되지 않아야 함');

    // 200 응답의 스키마 확인
    const response200 = getMethod.responses['200'];
    assert.ok(response200.content, 'content가 있어야 함');
    assert.ok(response200.content['application/json'], 'application/json이 있어야 함');
    assert.ok(response200.content['application/json'].schema, 'schema가 있어야 함');

    const schema = response200.content['application/json'].schema;
    assert.ok(schema.properties, 'properties가 있어야 함');
    assert.ok(schema.properties.nextPageNumber, 'nextPageNumber 필드가 있어야 함');
    assert.ok(schema.properties.content, 'content 필드가 있어야 함');

    console.log('✅ 상태 코드별 응답 파싱 테스트 통과');
  });
});

console.log('\n🎉 모든 테스트 완료!');


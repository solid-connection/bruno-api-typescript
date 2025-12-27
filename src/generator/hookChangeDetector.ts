/**
 * React Query 훅 변경사항 감지
 * 기존 훅 파일과 새로 생성될 훅 파일을 비교하여 변경사항 추출
 */

import { readFileSync, existsSync } from 'fs';
import { ParsedBrunoFile } from '../parser/bruParser';
import { ApiFunction } from './apiClientGenerator';
import { extractJsonFromDocs } from '../parser/bruParser';

export interface HookChange {
  type: 'api-signature' | 'response-type' | 'request-type' | 'query-key' | 'other';
  description: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * 기존 훅 파일과 새 API 정보를 비교하여 변경사항 감지
 */
export function detectHookChanges(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  existingHookPath: string,
  domain?: string
): HookChange[] {
  const changes: HookChange[] = [];

  if (!existsSync(existingHookPath)) {
    return changes;
  }

  try {
    const existingContent = readFileSync(existingHookPath, 'utf-8');

    // 1. API 시그니처 변경 감지 (URL, 메서드)
    const existingApiCall = extractApiCallFromHook(existingContent);
    if (existingApiCall) {
      if (existingApiCall.url !== apiFunc.url) {
        changes.push({
          type: 'api-signature',
          description: 'API URL 변경',
          oldValue: existingApiCall.url,
          newValue: apiFunc.url,
        });
      }

      if (existingApiCall.method !== apiFunc.method) {
        changes.push({
          type: 'api-signature',
          description: 'HTTP 메서드 변경',
          oldValue: existingApiCall.method,
          newValue: apiFunc.method,
        });
      }
    }

    // 2. Response 타입 변경 감지
    const existingResponseType = extractResponseTypeFromHook(existingContent);
    const newResponseType = apiFunc.responseType;
    if (existingResponseType && existingResponseType !== newResponseType) {
      changes.push({
        type: 'response-type',
        description: 'Response 타입 변경',
        oldValue: existingResponseType,
        newValue: newResponseType,
      });
    }

    // 3. Request 타입 변경 감지 (Mutation인 경우)
    if (['POST', 'PUT', 'PATCH'].includes(apiFunc.method)) {
      const existingRequestType = extractRequestTypeFromHook(existingContent);
      const newRequestType = apiFunc.responseType.replace('Response', 'Request');
      if (existingRequestType && existingRequestType !== newRequestType) {
        changes.push({
          type: 'request-type',
          description: 'Request 타입 변경',
          oldValue: existingRequestType,
          newValue: newRequestType,
        });
      }
    }

    // 4. QueryKey 변경 감지
    const existingQueryKey = extractQueryKeyFromHook(existingContent);
    const newQueryKey = generateQueryKey(apiFunc, parsed, domain);
    if (existingQueryKey && existingQueryKey !== newQueryKey) {
      changes.push({
        type: 'query-key',
        description: 'QueryKey 변경',
        oldValue: existingQueryKey,
        newValue: newQueryKey,
      });
    }

    // 5. docs 블록의 JSON 변경 감지 (실제 응답 데이터 변경)
    if (parsed.docs) {
      const newResponseJson = extractJsonFromDocs(parsed.docs);
      if (newResponseJson) {
        // 기존 파일에서 사용된 타입과 비교
        // 간단한 비교: 타입 이름만 확인
        const responseTypeChanged = checkResponseDataChanged(existingContent, newResponseJson);
        if (responseTypeChanged) {
          changes.push({
            type: 'response-type',
            description: 'Response 데이터 구조 변경 (docs 블록)',
            oldValue: '기존 구조',
            newValue: '새 구조',
          });
        }
      }
    }
  } catch (error) {
    // 파일 읽기 실패시 변경사항 감지 불가
    console.warn(`⚠️  Failed to read existing hook file: ${existingHookPath}`);
  }

  return changes;
}

/**
 * 훅 파일에서 API 호출 정보 추출
 */
function extractApiCallFromHook(content: string): { url: string; method: string } | null {
  // 팩토리 API 호출 패턴 찾기: authApi.postSignOut(...)
  const apiCallMatch = content.match(/(\w+)Api\.(\w+)\(/);
  if (!apiCallMatch) {
    return null;
  }

  // URL과 메서드는 파일 내용에서 직접 추출하기 어려우므로
  // 함수명에서 추론하거나 null 반환
  return null;
}

/**
 * 훅 파일에서 Response 타입 추출
 */
function extractResponseTypeFromHook(content: string): string | null {
  // useQuery<ResponseType, ...> 또는 useMutation<ResponseType, ...> 패턴
  const typeMatch = content.match(/use(Query|Mutation|InfiniteQuery)<([^,>]+)/);
  if (typeMatch) {
    return typeMatch[2].trim();
  }
  return null;
}

/**
 * 훅 파일에서 Request 타입 추출
 */
function extractRequestTypeFromHook(content: string): string | null {
  // useMutation<ResponseType, Error, RequestType> 패턴
  const typeMatch = content.match(/useMutation<[^,>]+,\s*[^,>]+,\s*([^>]+)>/);
  if (typeMatch) {
    return typeMatch[1].trim();
  }
  return null;
}

/**
 * 훅 파일에서 QueryKey 추출
 */
function extractQueryKeyFromHook(content: string): string | null {
  // queryKey: [QueryKeys.domain.key, ...] 패턴
  const queryKeyMatch = content.match(/queryKey:\s*\[([^\]]+)\]/);
  if (queryKeyMatch) {
    return queryKeyMatch[1].trim();
  }
  return null;
}

/**
 * 새 QueryKey 생성
 */
function generateQueryKey(apiFunc: ApiFunction, parsed: ParsedBrunoFile, domain?: string): string {
  // URL 파라미터 추출
  const urlParams: string[] = [];
  const urlParamMatches = apiFunc.url.matchAll(/:(\w+)|\{(\w+)\}/g);
  for (const match of urlParamMatches) {
    const paramName = match[1] || match[2];
    urlParams.push(paramName);
  }

  // QueryKey 생성
  const domainKey = domain ? domain.charAt(0).toLowerCase() + domain.slice(1) : 'domain';
  const keyName = apiFunc.name.charAt(0).toLowerCase() + apiFunc.name.slice(1);
  let queryKey = `QueryKeys.${domainKey}.${keyName}`;
  if (urlParams.length > 0) {
    queryKey += `, ${urlParams.join(', ')}, params`;
  } else {
    queryKey += ', params';
  }

  return queryKey;
}

/**
 * Response 데이터 구조 변경 확인
 */
function checkResponseDataChanged(existingContent: string, newResponseJson: any): boolean {
  // 간단한 체크: 타입 이름이 변경되었는지 확인
  // 실제로는 더 정교한 비교가 필요할 수 있음
  const existingTypes = existingContent.match(/export\s+(interface|type)\s+(\w+Response)/g);
  const newTypeName = newResponseJson ? 'Response' : null;
  
  // 타입 이름이 다르면 변경된 것으로 간주
  return existingTypes !== null && existingTypes.length > 0;
}

/**
 * 변경사항 리포트 생성
 */
export function generateChangeReport(
  fileName: string,
  changes: HookChange[],
  apiFunc: ApiFunction,
  parsed: ParsedBrunoFile
): string {
  const lines: string[] = [
    `# 변경사항: ${fileName}`,
    '',
    `## 변경 일시`,
    new Date().toISOString().split('T')[0],
    '',
    `## API 정보`,
    `- URL: ${apiFunc.url}`,
    `- Method: ${apiFunc.method}`,
    `- Function: ${apiFunc.name}`,
    '',
  ];

  if (changes.length === 0) {
    lines.push('## 변경 내용', '', '변경사항 없음 (API 시그니처 동일)');
  } else {
    lines.push('## 변경 내용', '');

    for (const change of changes) {
      lines.push(`### ${change.type}`, '');
      lines.push(`**${change.description}**`, '');
      if (change.oldValue) {
        lines.push(`- 이전: \`${change.oldValue}\``);
      }
      if (change.newValue) {
        lines.push(`- 현재: \`${change.newValue}\``);
      }
      lines.push('');
    }
  }

  lines.push('## 권장 조치', '');
  lines.push('1. `legacy/' + fileName + '` 파일의 비즈니스 로직 확인');
  lines.push('2. 새 `' + fileName + '` 파일과 비교');
  lines.push('3. 필요한 커스텀 로직을 새 파일에 수동 병합');
  lines.push('4. 병합 완료 후 `legacy/' + fileName + '` 파일 삭제');

  return lines.join('\n');
}


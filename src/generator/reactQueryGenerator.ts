/**
 * React Query 훅 생성기
 * Bruno 파일로부터 useQuery, useMutation, useInfiniteQuery 훅 생성
 */

import { ParsedBrunoFile, extractJsonFromDocs } from "../parser/bruParser";
import {
  generateTypeScriptInterface,
  urlToFunctionName,
  functionNameToTypeName,
  toCamelCase,
} from "./typeGenerator";
import { ApiFunction } from "./apiClientGenerator";

export interface ReactQueryHook {
  fileName: string;
  content: string;
  domain: string;
}

/**
 * React Query 훅 생성
 */
export function generateReactQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string = "@/utils/axiosInstance"
): ReactQueryHook {
  const { method } = apiFunc;

  // GET -> useQuery, POST/PUT/PATCH/DELETE -> useMutation
  const isQuery = method === "GET";

  const content = isQuery
    ? generateUseQueryHook(parsed, apiFunc, domain, axiosInstancePath)
    : generateUseMutationHook(parsed, apiFunc, domain, axiosInstancePath);

  // apiFunc.name이 이미 메서드 프리픽스를 포함하므로 파일명에는 그대로 사용
  const fileName = `${apiFunc.name}.ts`;

  return {
    fileName,
    content,
    domain,
  };
}

/**
 * useQuery 훅 생성
 */
function generateUseQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string
): string {
  const { name, responseType, hasParams } = apiFunc;
  const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;

  const factoryName = `${toCamelCase(domain)}Api`;
  const lines: string[] = [
    `import { AxiosError } from "axios";`,
    `import { useQuery } from "@tanstack/react-query";`,
    `import { ${factoryName}, ${responseType} } from "./api";`,
    `import { QueryKeys } from "../queryKeys";`,
    ``,
  ];

  // 훅 파라미터
  const urlParams = extractUrlParams(apiFunc.url);
  const hookParams = urlParams.map((p) => `${p}: string | number`);
  const optionalParams: string[] = ["params?: Record<string, any>"];

  const allParams = [...hookParams, ...optionalParams];
  const paramsStr = allParams.length > 0 ? allParams.join(", ") : "";

  // queryKey 생성 - request의 모든 값 포함 (URL params + query params)
  // queryKeyGenerator.ts와 일관성을 위해 domain을 그대로 사용
  // 하이픈이나 점이 포함된 도메인 이름은 대괄호 표기법 사용
  const queryKeyDomainAccess =
    domain.includes("-") || domain.includes(".")
      ? `QueryKeys['${domain}']`
      : `QueryKeys.${domain}`;
  // apiFunc.name에서 메서드 프리픽스 제거 후 camelCase로 변환
  const baseName = apiFunc.name.replace(
    /^(get|post|put|patch|delete|head|options)/i,
    ""
  );
  const queryKeyEndpoint = baseName.charAt(0).toLowerCase() + baseName.slice(1);
  let queryKeyStr = `[${queryKeyDomainAccess}.${queryKeyEndpoint}`;
  if (urlParams.length > 0) {
    queryKeyStr += `, ${urlParams.join(", ")}`;
  }
  // query params도 queryKey에 포함
  queryKeyStr += `, params]`;

  // 훅 생성
  lines.push(`const ${hookName} = (${paramsStr}) => {`);
  lines.push(`  return useQuery<${responseType}, AxiosError>({`);
  lines.push(`    queryKey: ${queryKeyStr},`);

  // queryFn
  if (urlParams.length > 0) {
    // URL 파라미터가 있는 경우
    const fnParams = [...urlParams.map((p) => p), "params"].filter(Boolean);
    const fnCallParams = `{ ${fnParams.join(", ")} }`;
    lines.push(`    queryFn: () => ${factoryName}.${name}(${fnCallParams}),`);
  } else {
    // URL 파라미터가 없는 경우 - params만 조건부로 전달
    lines.push(
      `    queryFn: () => ${factoryName}.${name}(params ? { params } : {}),`
    );
  }

  // 추가 옵션
  if (urlParams.length > 0) {
    const enableCondition = urlParams.map((p) => `!!${p}`).join(" && ");
    lines.push(`    enabled: ${enableCondition},`);
  }

  lines.push(`  });`);
  lines.push(`};`);
  lines.push("");
  lines.push(`export default ${hookName};`);

  return lines.join("\n");
}

/**
 * useMutation 훅 생성
 */
function generateUseMutationHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string
): string {
  const { name, responseType, method } = apiFunc;
  const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const requestType = responseType.replace("Response", "Request");
  const factoryName = `${toCamelCase(domain)}Api`;

  const lines: string[] = [
    `import { AxiosError } from "axios";`,
    `import { useMutation } from "@tanstack/react-query";`,
    `import { ${factoryName}, ${responseType}, ${requestType} } from "./api";`,
    ``,
  ];

  // 훅 생성
  const urlParams = extractUrlParams(apiFunc.url);
  const mutationVariables =
    urlParams.length > 0
      ? `{ ${urlParams
          .map((p) => `${p}: string | number;`)
          .join(" ")} data: ${requestType} }`
      : requestType;

  lines.push(`const ${hookName} = () => {`);
  lines.push(
    `  return useMutation<${responseType}, AxiosError, ${mutationVariables}>({`
  );

  if (urlParams.length > 0) {
    lines.push(
      `    mutationFn: (variables) => ${factoryName}.${name}(variables),`
    );
  } else {
    lines.push(`    mutationFn: (data) => ${factoryName}.${name}({ data }),`);
  }

  lines.push(`  });`);
  lines.push(`};`);
  lines.push("");
  lines.push(`export default ${hookName};`);

  return lines.join("\n");
}

/**
 * URL에서 파라미터 추출
 */
function extractUrlParams(url: string): string[] {
  const params: string[] = [];

  // 1. {{URL}} 제거
  let processedUrl = url.replace(/\{\{URL\}\}/g, "");

  // 2. 브루노 변수 {{변수명}} 처리 (URL 제외)
  const brunoVarPattern = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = brunoVarPattern.exec(processedUrl)) !== null) {
    const varName = match[1];
    if (varName === "URL") continue;
    const camelVarName = varName.replace(/-([a-z])/g, (_, c) =>
      c.toUpperCase()
    );
    if (!params.includes(camelVarName)) {
      params.push(camelVarName);
    }
  }

  // 3. 기존 URL 파라미터 패턴 처리 (:param, {param})
  const urlParamMatches = processedUrl.matchAll(/:(\w+)|\{(\w+)\}/g);
  for (const match of urlParamMatches) {
    const paramName = match[1] || match[2];
    if (!params.includes(paramName)) {
      params.push(paramName);
    }
  }

  return params;
}

/**
 * useInfiniteQuery 훅 생성 (페이지네이션용)
 */
export function generateUseInfiniteQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string,
  pageParamName: string = "page",
  nextPageField: string = "nextPageNumber"
): string {
  const { name, responseType } = apiFunc;
  const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const factoryName = `${toCamelCase(domain)}Api`;

  const lines: string[] = [
    `import { AxiosError } from "axios";`,
    `import { useInfiniteQuery } from "@tanstack/react-query";`,
    `import { ${factoryName} } from "./api";`,
    `import { QueryKeys } from "../queryKeys";`,
    ``,
  ];

  // 훅 파라미터
  const urlParams = extractUrlParams(apiFunc.url);
  const hookParams = urlParams.map((p) => `${p}: string | number`);
  const allParams = [...hookParams, "size?: number"];
  const paramsStr = allParams.length > 0 ? allParams.join(", ") : "";

  // queryKey - request의 모든 값 포함 (URL params + query params)
  // queryKeyGenerator.ts와 일관성을 위해 domain을 그대로 사용
  // 하이픈이나 점이 포함된 도메인 이름은 대괄호 표기법 사용
  const queryKeyDomainAccess =
    domain.includes("-") || domain.includes(".")
      ? `QueryKeys['${domain}']`
      : `QueryKeys.${domain}`;
  // apiFunc.name에서 메서드 프리픽스 제거 후 camelCase로 변환
  const baseName = apiFunc.name.replace(
    /^(get|post|put|patch|delete|head|options)/i,
    ""
  );
  const queryKeyEndpoint = baseName.charAt(0).toLowerCase() + baseName.slice(1);
  let queryKeyStr = `[${queryKeyDomainAccess}.${queryKeyEndpoint}`;
  if (urlParams.length > 0) {
    queryKeyStr += `, ${urlParams.join(", ")}`;
  }
  // size는 pagination params이므로 queryKey에 포함
  queryKeyStr += `, size]`;

  // 훅 생성
  lines.push(`const ${hookName} = (${paramsStr}) => {`);
  lines.push(`  return useInfiniteQuery<${responseType}, AxiosError>({`);
  lines.push(`    queryKey: ${queryKeyStr},`);
  lines.push(
    `    queryFn: ({ pageParam = 0 }) => ${factoryName}.${name}({ ${urlParams.join(
      ", "
    )}, params: { size, ${pageParamName}: pageParam } }),`
  );
  lines.push(`    initialPageParam: 0,`);
  lines.push(`    getNextPageParam: (lastPage: ${responseType}) => {`);
  lines.push(
    `      return (lastPage as any).${nextPageField} === -1 ? undefined : (lastPage as any).${nextPageField};`
  );
  lines.push(`    },`);

  if (urlParams.length > 0) {
    const enableCondition = urlParams.map((p) => `!!${p}`).join(" && ");
    lines.push(`    enabled: ${enableCondition},`);
  }

  lines.push(`  });`);
  lines.push(`};`);
  lines.push("");
  lines.push(`export default ${hookName};`);

  return lines.join("\n");
}

# React Query 훅 변경사항 처리 가이드

## 개요

이 프로젝트는 기존 React Query 훅 파일의 비즈니스 로직을 보호하기 위해 다음과 같은 전략을 사용합니다:

1. **API 팩토리 (api.ts)**: 항상 덮어쓰기 (최신 API 시그니처 유지)
2. **React Query 훅**: 기존 파일이 있으면 `legacy/` 폴더로 이동 후 새 파일 생성

## 파일 구조

```
src/apis/
├── Auth/
│   ├── api.ts                    # 항상 덮어쓰기됨
│   ├── post-signOut.ts          # 새로 생성됨
│   ├── legacy/                   # 기존 파일 보관
│   │   ├── post-signOut.ts      # 기존 파일 (비즈니스 로직 포함)
│   │   └── post-signOut.CHANGES.md  # 변경사항 리포트
│   └── index.ts
```

## 동작 방식

### 1. 기존 파일이 없는 경우

새 API가 추가되면 훅 파일이 새로 생성됩니다.

```
Auth/
├── api.ts
├── post-signOut.ts  # 새로 생성
└── index.ts
```

### 2. 기존 파일이 있는 경우

기존 훅 파일이 있으면:

1. `legacy/` 폴더로 이동
2. 변경사항 감지 및 리포트 생성
3. 새 훅 파일 생성

```
Auth/
├── api.ts
├── post-signOut.ts  # 새로 생성됨
├── legacy/
│   ├── post-signOut.ts  # 기존 파일 (보호됨)
│   └── post-signOut.CHANGES.md  # 변경사항 리포트
└── index.ts
```

## 변경사항 리포트

각 변경된 훅 파일에 대해 `CHANGES.md` 파일이 생성됩니다.

### 리포트 예시

```markdown
# 변경사항: post-signOut.ts

## 변경 일시
2025-01-XX

## API 정보
- URL: /auth/sign-out
- Method: POST
- Function: postSignOut

## 변경 내용

### response-type
**Response 타입 변경**
- 이전: `SignOutResponse`
- 현재: `SignOutResponseV2`

### api-signature
**API URL 변경**
- 이전: `/auth/sign-out`
- 현재: `/auth/v2/sign-out`

## 권장 조치
1. `legacy/post-signOut.ts` 파일의 비즈니스 로직 확인
2. 새 `post-signOut.ts` 파일과 비교
3. 필요한 커스텀 로직을 새 파일에 수동 병합
4. 병합 완료 후 `legacy/post-signOut.ts` 파일 삭제
```

## 수동 병합 방법

### 1. 변경사항 확인

```bash
# 변경사항 리포트 확인
cat src/apis/Auth/legacy/post-signOut.CHANGES.md

# 기존 파일과 새 파일 비교
diff src/apis/Auth/legacy/post-signOut.ts src/apis/Auth/post-signOut.ts
```

### 2. 커스텀 로직 확인

기존 파일에서 추가한 커스텀 로직을 확인합니다:

```typescript
// legacy/post-signOut.ts
const usePostSignOut = () => {
  return useMutation({
    mutationFn: authApi.postSignOut,
    // 커스텀 옵션
    onSuccess: (data) => {
      // 커스텀 성공 핸들러
      queryClient.invalidateQueries({ queryKey: [QueryKeys.auth.profile] });
    },
    onError: (error) => {
      // 커스텀 에러 핸들러
      toast.error('로그아웃 실패');
    },
  });
};
```

### 3. 새 파일에 병합

새 파일에 커스텀 로직을 추가합니다:

```typescript
// post-signOut.ts
const usePostSignOut = () => {
  return useMutation({
    mutationFn: authApi.postSignOut,
    // 기존 커스텀 로직 추가
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.auth.profile] });
    },
    onError: (error) => {
      toast.error('로그아웃 실패');
    },
  });
};
```

### 4. Legacy 파일 정리

병합이 완료되면 legacy 파일을 삭제합니다:

```bash
rm -rf src/apis/Auth/legacy/post-signOut.ts
rm src/apis/Auth/legacy/post-signOut.CHANGES.md
```

## 주의사항

### API 팩토리는 항상 덮어쓰기됨

`api.ts` 파일은 항상 최신 상태로 덮어쓰기되므로, 이 파일에는 커스텀 로직을 추가하지 마세요.

### 훅 파일만 보호됨

React Query 훅 파일만 보호됩니다. 다른 파일들 (queryKeys.ts, index.ts 등)은 덮어쓰기됩니다.

### 변경사항이 없어도 이동됨

API 시그니처가 동일해도 기존 파일은 legacy 폴더로 이동됩니다. 이는 향후 변경사항을 추적하기 위함입니다.

## 자주 묻는 질문

### Q: Legacy 파일을 언제 삭제해야 하나요?

A: 커스텀 로직을 새 파일에 병합한 후 삭제하세요. 병합이 완료되지 않았다면 보관해두는 것이 안전합니다.

### Q: API가 변경되었는데 훅 파일이 업데이트되지 않았어요

A: 훅 파일은 보호되므로 수동으로 병합해야 합니다. `CHANGES.md` 파일을 확인하고 필요한 부분만 업데이트하세요.

### Q: 여러 파일이 변경되었을 때 어떻게 처리하나요?

A: 각 파일마다 별도의 `CHANGES.md` 파일이 생성되므로, 하나씩 확인하고 병합하세요.



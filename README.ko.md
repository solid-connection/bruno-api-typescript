# bruno-api-typescript

> **Bruno .bru 파일로 OpenAPI 스펙 자동 생성**

Bruno API 컬렉션을 OpenAPI 3.0 스펙으로 자동 변환하고, 변경사항을 추적합니다.

**[영문 README](./README.md)** | **[📝 Bruno 파일 작성 가이드](./docs/bruno-guide.md)**

## 핵심 메시지

**변경점이 거의 없습니다!** 기존 Bruno 파일 작성 방식 그대로 사용하시면 됩니다. 단, `docs` 블록에 응답 JSON을 정확히 작성해주세요.

## 설치

```bash
npm install -D bruno-api-typescript
```

## 빠른 시작

### 1. Bruno 파일 작성

기존과 동일하게 작성하되, **`docs` 블록에 응답 JSON을 포함**하세요:

````bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
````

}

````

### 2. OpenAPI 생성

```bash
# OpenAPI 스펙 생성
npx bruno-api generate -i ./bruno -o ./openapi.json

# 변경사항 확인
npx bruno-api generate --diff

# Changelog 생성
npx bruno-api generate --diff --changelog CHANGELOG.md
````

### package.json 스크립트

```json
{
  "scripts": {
    "api:generate": "bruno-api generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-api generate --diff",
    "api:changelog": "bruno-api generate --diff --changelog CHANGELOG.md"
  }
}
```

## 백엔드 개발자 워크플로우

```bash
# 1. Bruno 파일 작성/수정 (docs 블록 필수!)
vim bruno/applications/get-competitors.bru

# 2. 변경사항 확인
npm run api:diff

# 3. Changelog 생성
npm run api:changelog

# 4. 커밋
git add bruno/ CHANGELOG.md openapi.json
git commit -m "feat: 경쟁자 조회 API 추가"
git push
```

끝입니다! 프론트엔드 팀은 자동으로 변경사항을 확인할 수 있습니다.

## 프로젝트 구조

```
bruno/
├── 지원서 [applications]/  # 한글명 [영문키] 형식 지원
│   ├── get-competitors.bru
│   └── create-application.bru
├── 사용자 [users]/
│   └── get-profile.bru
└── bruno.json
```

**참고**: 폴더명은 `한글명 [EnglishKey]` 형식을 지원하며, 대괄호 안의 `EnglishKey`만 사용됩니다.

## 필수 작성 규칙

### `docs` 블록이 핵심입니다

`docs` 블록의 JSON으로 타입과 스키마가 자동 생성됩니다.

**올바른 예시:**

````bru
docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "createdAt": "2025-01-01T00:00:00Z"
  }
````

}

```

**주의사항:**
- ✅ 유효한 JSON 형식만 사용
- ✅ 모든 필드 포함 (옵셔널도)
- ✅ 타입 명확히 (문자열은 `"..."`, 숫자는 숫자)
- ✅ 배열은 최소 1개 요소 포함
- ✅ 날짜는 ISO 8601 형식

자세한 내용은 [Bruno 파일 작성 가이드](./docs/bruno-guide.md)를 참조하세요.

## 변경사항 감지

### Breaking Changes

다음 변경사항은 **Breaking**으로 판단됩니다:
- 엔드포인트 제거
- 응답에서 필드 제거
- 필드 타입 변경 (예: `number` → `string`)

### 안전한 변경사항

다음은 **Minor** 변경사항입니다:
- 새 엔드포인트 추가
- 응답에 새 필드 추가

## CLI 옵션

```

bruno-api generate [옵션]

옵션:
-i, --input <경로> Bruno 컬렉션 디렉토리 (기본값: "./bruno")
-o, --output <경로> 출력할 OpenAPI 파일 (기본값: "./openapi.json")
--title <제목> API 제목 (기본값: "API Documentation")
--version <버전> API 버전 (기본값: "1.0.0")
--base-url <URL> API Base URL

변경사항 추적:
--diff 이전 버전과 비교하여 변경사항 감지
--changelog <경로> Changelog 파일 생성
--changelog-format <형식> 형식: markdown | json | html (기본값: "markdown")
--breaking-only Breaking changes만 표시

```

## 주요 기능

- **Bruno → OpenAPI**: .bru 파일을 OpenAPI 3.0으로 자동 변환
- **변경사항 자동 감지**: 이전 버전과 비교하여 변경사항 추출
- **Breaking Changes 경고**: 기존 코드를 깨뜨릴 수 있는 변경사항 자동 식별
- **Changelog 자동 생성**: Markdown, JSON, HTML 형식 지원
- **도메인별 그룹화**: 폴더 구조 기반 자동 분류

## 추가 문서

### 시작하기
- **[빠른 시작](./docs/quickstart.md)** - 5분 완성 가이드
- **[무엇이 달라졌나?](./docs/whats-new.md)** - 기존 Bruno 사용자 필독

### Bruno 파일 작성
- **[Bruno 파일 작성 튜토리얼](./docs/bruno-tutorial.md)** - 단계별 따라하기 (초보자용)
- **[Bruno 파일 작성 가이드](./docs/bruno-guide.md)** - 레퍼런스 (숙련자용)

### 자동화 (선택사항)
- **[GitHub Apps 연결 (5분)](./docs/github-apps-simple.md)** - Bruno ↔ 프론트엔드 자동 연결

## 라이선스

MIT

---

**bruno-api-typescript v0.3.0** - 더 나은 API 협업을 위해
```

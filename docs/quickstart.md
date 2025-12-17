# 빠른 시작 가이드

## 1. 설치

```bash
npm install -D bruno-api-typescript
```

## 2. package.json 스크립트 추가

```json
{
  "scripts": {
    "api:generate": "bruno-api generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-api generate --diff",
    "api:changelog": "bruno-api generate --diff --changelog CHANGELOG.md"
  }
}
```

## 3. Bruno 파일 작성

기존과 동일하게 작성하되, **`docs` 블록에 응답 JSON을 포함**하세요:

```bru
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
  ```
}
```

**핵심**: `docs` 블록에 실제 응답 JSON 넣기!

## 4. OpenAPI 생성

```bash
npm run api:generate
```

**생성됨**: `openapi.json`

## 백엔드 개발자 워크플로우

```bash
# 1. Bruno 파일 작성/수정
vim bruno/users/get-profile.bru

# 2. 변경사항 확인
npm run api:diff

# 3. Changelog 생성
npm run api:changelog

# 4. 커밋
git add bruno/ CHANGELOG.md openapi.json
git commit -m "feat: 프로필 조회 API 추가"
git push
```

## 주요 명령어

```bash
# OpenAPI 생성
npm run api:generate

# 변경사항 확인
npm run api:diff

# Changelog 생성
npm run api:changelog
```

## 자주 묻는 질문

**Q: docs 블록이 뭔가요?**  
A: Bruno 파일에서 응답 예시를 넣는 곳. 여기 JSON으로 타입이 자동 생성됩니다.

**Q: Breaking change는 언제 발생하나요?**  
A: 필드 제거, 타입 변경 (number → string), 엔드포인트 제거

---

자세한 내용은 [Bruno 파일 작성 가이드](./bruno-guide.md)를 참조하세요.

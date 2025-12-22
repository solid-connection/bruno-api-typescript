# 무엇이 달라졌나?

> **핵심**: 거의 변화 없음! 기존 Bruno 사용법 그대로 유지됩니다.

## 기존 방식

### Bruno 파일 작성

```bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}
```

이렇게만 작성하면 끝이었습니다.

### 선택사항

- OpenAPI 생성 (필요시)
- Swagger 문서화 (필요시)

---

## 새로운 방식 (거의 동일!)

### Bruno 파일 작성 (유일한 변경점!)

```bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {                          ← 이 부분만 추가!
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
  ```
}
```

**변경점**: `docs` 블록에 응답 JSON 예시 작성

### 자동으로 생성되는 것들

```bash
# 명령어 1개로
npx bruno-api generate-hooks -i ./bruno -o ./src/apis
```

**생성됨**:
- ✅ OpenAPI 스펙
- ✅ React Query hooks
- ✅ TypeScript 타입
- ✅ MSW mock handlers (선택사항)

---

## 실제로 달라지는 것

### 1. `docs` 블록 필수

**이전**: 선택사항  
**지금**: 필수 (타입 생성을 위해)

```bru
docs {
  ```json
  {
    "id": 1,
    "username": "johndoe"
  }
  ```
}
```

### 2. 한글 폴더명 지원

**이전**: 영문 폴더명만  
**지금**: 한글 폴더명 + 영문 키 조합 가능

```
bruno/
├── users/                    ← 기존 방식 (여전히 가능)
└── 사용자 [users]/          ← 새로운 방식 (선택사항)
```

### 3. MSW 생성 제어

**이전**: N/A  
**지금**: `meta.done` 필드로 제어 가능

```bru
meta {
  name: Get User Profile
  type: http
  done: true    ← 백엔드 완료시 MSW 생성 건너뛰기
}
```

---

## 달라지지 않는 것

### ✅ Bruno 앱 사용법

- 그대로 사용 가능
- 기존 .bru 파일 그대로 동작
- 변수, 환경 설정 동일

### ✅ 파일 구조

```
bruno/
├── users/
│   └── get-profile.bru
└── products/
    └── get-list.bru
```

동일한 구조 유지

### ✅ HTTP 메서드, headers, body 작성 방식

```bru
post /users

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "username": "johndoe"
  }
}
```

모두 동일

### ✅ Bruno CLI

기존 bruno CLI 명령어 그대로 사용 가능

---

## 마이그레이션 가이드

### 기존 Bruno 파일이 있다면?

**1단계**: docs 블록만 추가

```bash
# 기존 파일
vim users/get-profile.bru

# docs 블록 추가
docs {
  ```json
  {
    "id": 1,
    "username": "johndoe"
  }
  ```
}
```

**2단계**: 명령어 실행

```bash
npm install -D bruno-api-typescript
npx bruno-api generate -i ./bruno -o ./openapi.json
```

끝!

### 주의사항

- docs 블록의 JSON은 **실제 API 응답과 동일하게** 작성
- 모든 필드 포함 (옵셔널 필드도)
- 배열은 최소 1개 요소 포함
- 유효한 JSON 형식 사용

---

## FAQ

### Q: 기존 Bruno 파일을 수정해야 하나요?

**A**: docs 블록만 추가하면 됩니다. 나머지는 그대로!

### Q: Bruno 앱을 계속 사용할 수 있나요?

**A**: 네! bruno-api-typescript는 Bruno 앱과 완전히 호환됩니다.

### Q: docs 블록이 없으면 어떻게 되나요?

**A**: OpenAPI는 생성되지만, 응답 스키마가 비어있습니다. React Query hooks는 `any` 타입으로 생성됩니다.

### Q: 기존 API 문서를 옮겨야 하나요?

**A**: 아니요. 기존 문서는 그대로 두고, 새로운 API부터 docs 블록을 추가하세요.

### Q: 팀원들이 적응하기 어렵지 않나요?

**A**: docs 블록만 추가하면 되므로, 5분이면 적응 가능합니다.

---

## 실전 예시

### 변경 전

```bru
meta {
  name: Get Products
  type: http
}

get /products

headers {
  Authorization: Bearer {{token}}
}
```

### 변경 후

```bru
meta {
  name: Get Products
  type: http
}

get /products

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "products": [
      {
        "id": 1,
        "name": "Laptop",
        "price": 1200.50
      }
    ],
    "total": 1
  }
  ```
}
```

**차이**: docs 블록 추가 (약 10줄)

---

## 결론

**99% 동일, 1% 추가**

- ✅ 기존 Bruno 사용법 그대로
- ✅ docs 블록만 추가
- ✅ 자동으로 타입 안전성 확보

**추가 학습 필요**: 거의 없음 (docs 블록 작성법만)

---

**더 알아보기**:
- [Bruno 파일 작성 튜토리얼](./bruno-tutorial.md) - 단계별 가이드
- [Bruno 파일 작성 가이드](./bruno-guide.md) - 레퍼런스


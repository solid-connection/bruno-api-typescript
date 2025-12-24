# Bruno 파일 작성 튜토리얼 (따라하기)

> **단계별로 따라하면서 Bruno 파일 작성을 마스터하세요**

## 시작하기 전에

### 필요한 도구

1. **텍스트 에디터** (VS Code, Cursor 등)
2. **Bruno 앱** (선택사항) - [다운로드](https://www.usebruno.com/downloads)

### 폴더 구조 준비

```bash
mkdir -p bruno/users
mkdir -p bruno/products
```

---

## 튜토리얼 1: 첫 GET 요청 만들기

### 목표

사용자 프로필을 조회하는 API 작성

### 단계 1: 파일 생성

```bash
touch bruno/users/get-profile.bru
```

### 단계 2: meta 블록 작성

파일을 열고 다음을 입력하세요:

```bru
meta {
  name: Get User Profile
  type: http
}
```

**설명**:

- `name`: API 이름 (자유롭게 작성)
- `type`: 항상 `http`

### 단계 3: HTTP 메서드와 경로 추가

```bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile
```

**설명**:

- `get`: HTTP 메서드 (소문자)
- `/users/profile`: API 경로

### 단계 4: 헤더 추가

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

**설명**:

- 인증이 필요한 API는 `Authorization` 헤더 추가
- `{{token}}`: Bruno 변수 (나중에 설정)

### 단계 5: docs 블록 추가 (가장 중요!)

`````bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {
  ````json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2025-01-01T00:00:00Z"
  }
  ````
}
`````

**설명**:

- `docs` 블록에 **실제 API 응답 JSON** 작성
- 이 JSON으로 타입이 자동 생성됩니다!

### 완성!

첫 Bruno 파일 완성입니다!

**참고**: 이 프로젝트는 GitHub Actions에서 자동으로 실행됩니다. 로컬에서 테스트하려면 저장소를 클론하고 빌드한 후 사용하세요.

---

## 튜토리얼 2: POST 요청 만들기

### 목표

상품을 생성하는 API 작성

### 단계 1: 파일 생성

```bash
touch bruno/products/create-product.bru
```

### 단계 2: 기본 구조 작성

```bru
meta {
  name: Create Product
  type: http
}

post /products

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}
```

### 단계 3: 요청 body 추가

```bru
meta {
  name: Create Product
  type: http
}

post /products

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "name": "Laptop",
    "price": 1200.50,
    "category": "Electronics",
    "inStock": true
  }
}
```

**설명**:

- `body:json`: POST/PUT 요청 시 필요
- 중괄호 안에 JSON 작성

### 단계 4: 응답 docs 추가

`````bru
meta {
  name: Create Product
  type: http
}

post /products

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "name": "Laptop",
    "price": 1200.50,
    "category": "Electronics",
    "inStock": true
  }
}

docs {
  ````json
  {
    "id": 101,
    "name": "Laptop",
    "price": 1200.50,
    "category": "Electronics",
    "inStock": true,
    "createdAt": "2025-12-23T00:00:00Z",
    "message": "Product created successfully"
  }
  ````
}
`````

### 완성!

POST 요청이 완성되었습니다.

---

## 튜토리얼 3: Path Parameter 사용하기

### 목표

특정 상품을 조회하는 API 작성 (`/products/:id`)

### 단계 1: 파일 생성

```bash
touch bruno/products/get-product.bru
```

### 단계 2: Path Parameter 포함 경로 작성

`````bru
meta {
  name: Get Product by ID
  type: http
}

get /products/:id

headers {
  Authorization: Bearer {{token}}
}

docs {
  ````json
  {
    "id": 101,
    "name": "Laptop",
    "price": 1200.50,
    "category": "Electronics",
    "inStock": true,
    "description": "High-performance laptop for professionals",
    "createdAt": "2025-12-23T00:00:00Z"
  }
  ````
}
`````

**설명**:

- `:id`: Path Parameter (동적 값)
- docs에는 실제 응답 예시 작성

### Bruno 앱에서 테스트하기

Bruno 앱에서:

1. 파일 열기
2. `:id` 부분에 `101` 입력
3. Send 버튼 클릭

---

## 튜토리얼 4: Query Parameter 사용하기

### 목표

필터링이 가능한 상품 목록 조회 (`/products?category=Electronics&inStock=true`)

`````bru
meta {
  name: Get Products List
  type: http
}

get /products

headers {
  Authorization: Bearer {{token}}
}

docs {
  ````json
  {
    "products": [
      {
        "id": 101,
        "name": "Laptop",
        "price": 1200.50,
        "category": "Electronics",
        "inStock": true
      },
      {
        "id": 102,
        "name": "Mouse",
        "price": 25.00,
        "category": "Electronics",
        "inStock": true
      }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 10
  }
  ````
}
`````

**설명**:

- Query Parameter는 경로에 적지 않아도 됨
- docs에 배열 응답 예시 작성 (최소 1개 요소 필요!)

---

## 튜토리얼 5: 한글 폴더명 및 파일명 사용하기

### 한글 폴더명 지원

**권장 형식: `숫자) 한글명 [영문키]`**

```bash
mkdir "bruno/7) 어드민 [Admin]"
touch "bruno/7) 어드민 [Admin]/목록 조회 [get-list].bru"
```

**규칙**:

- `숫자) 한글명 [영문키]` 형식 (권장)
- `한글명 [영문키]` 형식 (기존 호환)
- 대괄호 `[]` 안의 영문키만 사용됨

**예시**:

```
bruno/
├── 7) 어드민 [Admin]/        → Admin으로 인식
├── 8) 사용자 [Users]/        → Users로 인식
├── 지원서 [applications]/    → applications로 인식 (기존 방식)
└── 상품 [products]/          → products로 인식 (기존 방식)
```

### 한글 파일명 지원

**권장 형식: `한글명 [영문키]`**

```bash
touch "bruno/7) 어드민 [Admin]/목록 조회 [get-list].bru"
touch "bruno/7) 어드민 [Admin]/생성 [post-create].bru"
```

**규칙**:

- `한글명 [영문키]` 형식
- 대괄호 `[]` 안의 영문키만 사용됨
- 예: `목록 조회 [get-list].bru` → `get-list` → `getList` (쿼리 키)

---

## 실전 연습

### 연습 1: 상품 삭제 API 만들기

**조건**:

- DELETE 메서드
- 경로: `/products/:id`
- 응답: `{ "success": true, "message": "Product deleted" }`

<details>
<summary>정답 보기</summary>

`````bru
meta {
  name: Delete Product
  type: http
}

delete /products/:id

headers {
  Authorization: Bearer {{token}}
}

docs {
  ````json
  {
    "success": true,
    "message": "Product deleted",
    "deletedId": 101
  }
  ````
}
`````

</details>

### 연습 2: 상품 업데이트 API 만들기

**조건**:

- PUT 메서드
- 경로: `/products/:id`
- 요청 body: 가격과 재고 상태 업데이트
- 응답: 업데이트된 상품 정보

<details>
<summary>정답 보기</summary>

`````bru
meta {
  name: Update Product
  type: http
}

put /products/:id

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "price": 999.99,
    "inStock": false
  }
}

docs {
  ````json
  {
    "id": 101,
    "name": "Laptop",
    "price": 999.99,
    "category": "Electronics",
    "inStock": false,
    "updatedAt": "2025-12-23T01:00:00Z"
  }
  ````
}
`````

</details>

---

## 일반적인 실수와 해결방법

### 실수 1: JSON 형식 오류

**❌ 잘못된 예시:**

`````bru
docs {
  ````json
  {
    id: 1,  // 키에 따옴표 없음
    "name": '홍길동'  // 작은따옴표 사용
  }
  ````
}
`````

**✅ 올바른 예시:**

`````bru
docs {
  ````json
  {
    "id": 1,
    "name": "홍길동"
  }
  ````
}
`````

**해결**: [JSONLint](https://jsonlint.com/)에서 JSON 검증

### 실수 2: 빈 배열

**❌ 잘못된 예시:**

`````bru
docs {
  ````json
  {
    "products": []  // 타입 추론 불가
  }
  ````
}
`````

**✅ 올바른 예시:**

`````bru
docs {
  ````json
  {
    "products": [
      {
        "id": 1,
        "name": "예시"
      }
    ]
  }
  ````
}
`````

### 실수 3: docs 블록 누락

**❌ 잘못된 예시:**

```bru
meta {
  name: Get User
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

# docs 블록이 없음!
```

**해결**: docs 블록은 필수입니다!

---

## 체크리스트

새 Bruno 파일을 작성한 후:

- [ ] `meta` 블록 작성 (name 필수)
- [ ] HTTP 메서드와 경로 명확히 표기
- [ ] 인증 필요시 `headers` 블록에 Authorization
- [ ] POST/PUT이면 `body:json` 블록 작성
- [ ] **`docs` 블록 반드시 작성**
- [ ] JSON이 유효한가? ([JSONLint](https://jsonlint.com/)로 확인)
- [ ] 모든 필드가 포함되었나?
- [ ] 배열에 최소 1개 요소가 있나?
- [ ] 날짜는 ISO 8601 형식인가? (`2025-01-01T00:00:00Z`)

---

## 다음 단계

축하합니다! Bruno 파일 작성을 마스터했습니다.

**다음으로 할 일**:

1. 실제 API 엔드포인트로 Bruno 파일 작성
2. OpenAPI 생성: `npm run api:generate`
3. React Query hooks 생성: `npm run api:hooks`

**더 알아보기**:

- [Bruno 파일 작성 가이드](./bruno-guide.md) - 레퍼런스
- [빠른 시작](./quickstart.md) - 명령어 정리

---

**Happy Coding! 🚀**

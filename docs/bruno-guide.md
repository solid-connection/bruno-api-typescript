# Bruno 파일 작성 가이드 (백엔드 개발자용)

> **핵심**: `docs` 블록에 응답 JSON을 정확히 작성하면 끝입니다.

## 기본 구조

`````bru
meta {
  name: API 이름
  type: http
  done: true  # 선택사항: 백엔드 완료시 MSW 생성 건너뛰기
}

get /api/endpoint

headers {
  Authorization: Bearer {{token}}
}

body:json {
  {
    "key": "value"
  }
}

docs {
  ````json
  {
    "id": 1,
    "username": "johndoe"
  }
  ````
}
`````

## 필수 작성 규칙

### 1. `docs` 블록이 핵심

**`docs` 블록이 전부입니다!** 이 블록의 JSON으로 타입과 스키마가 자동 생성됩니다.

**올바른 예시 (단일 응답):**

`````bru
docs {
  ````json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-01T00:00:00Z",
    "profile": {
      "age": 25,
      "city": "Seoul"
    },
    "tags": ["developer", "backend"]
  }
  ````
}
`````

**올바른 예시 (상태 코드별 응답):**

여러 상태 코드를 정의할 수 있지만, **200 OK만 사용**됩니다:

````bru
docs {
  ## 200 OK
  ```
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
  ```

  ## 404 Not Found
  ```
  {
    "message": "사용자를 찾을 수 없습니다."
  }
  ```
}
````

**참고**: 현재는 200 OK 응답만 타입 생성에 사용됩니다. 다른 상태 코드(404, 500 등)는 문서화 목적으로만 작성할 수 있습니다.

### 2. JSON 작성 규칙

- ✅ **실제 응답과 동일하게** 작성
- ✅ **모든 필드를 포함** (옵셔널 필드도)
- ✅ **타입이 명확한 값 사용**:
  - 문자열: `"hello"`
  - 숫자: `123` 또는 `4.5`
  - 불린: `true` / `false`
  - 배열: `[1, 2, 3]` (최소 1개 요소 포함)
  - 객체: `{ "key": "value" }`
  - null: `null`
- ✅ **날짜는 ISO 8601 형식**: `"2025-01-01T00:00:00Z"`

### 3. 자주 하는 실수

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

**❌ 빈 배열:**

`````bru
docs {
  ````json
  {
    "users": []  // 타입 추론 불가
  }
  ````
}
`````

**✅ 올바른 예시:**

`````bru
docs {
  ````json
  {
    "users": [
      {
        "id": 1,
        "name": "예시"
      }
    ]
  }
  ````
}
`````

## 파일명 및 폴더명 가이드라인

파일명과 폴더명은 생성되는 코드의 구조와 이름에 직접 영향을 미칩니다. 일관된 네이밍을 위해 다음 규칙을 따르세요.

### 폴더명 규칙

폴더명은 생성되는 도메인 디렉토리 이름이 됩니다.

#### 지원하는 형식

1. **`[한글명] 숫자 영문키` 형식** (권장)
   ```
   [어드민] 7 Admin/          → 생성 폴더: 7 Admin
   [사용자] 8 Users/          → 생성 폴더: 8 Users
   [멘토] 9 Mentor/           → 생성 폴더: 9 Mentor
   ```
   - 대괄호 뒤의 모든 내용(숫자 + 영문키)이 폴더명이 됩니다
   - 한글명은 가독성을 위해 사용, 실제 폴더명에는 포함되지 않음

2. **`한글명 [EnglishKey]` 형식** (기존 방식, 호환)
   ```
   지원서 [applications]/    → 생성 폴더: applications
   사용자 [users]/            → 생성 폴더: users
   ```
   - 대괄호 안의 `EnglishKey`만 사용됩니다
   - 기존 프로젝트와 호환됩니다

3. **영문 폴더명** (가장 단순)
   ```
   applications/              → 생성 폴더: applications
   users/                     → 생성 폴더: users
   ```
   - 패턴이 없으면 폴더명 그대로 사용

#### 폴더명 예시

| Bruno 폴더명 | 생성되는 폴더 | 설명 |
|-------------|--------------|------|
| `[어드민] 7 Admin` | `7 Admin` | 숫자와 공백 포함 가능 |
| `지원서 [applications]` | `applications` | 대괄호 안의 키만 사용 |
| `users` | `users` | 그대로 사용 |

### 파일명 규칙

**파일명이 쿼리 키와 훅 이름에 직접 사용됩니다!**

#### 권장 형식

**✅ 올바른 예시:**

```
get-competitors.bru        → QueryKeys.applications.getCompetitors
get-user-profile.bru       → QueryKeys.users.getUserProfile
post-create-application.bru → QueryKeys.applications.postCreateApplication
put-update-profile.bru     → QueryKeys.users.putUpdateProfile
delete-user.bru            → QueryKeys.users.deleteUser
```

#### 네이밍 규칙

1. **kebab-case 사용** (하이픈으로 단어 구분)

   - ✅ `get-user-profile.bru`
   - ❌ `getUserProfile.bru` (camelCase)
   - ❌ `get_user_profile.bru` (snake_case)
   - ❌ `GetUserProfile.bru` (PascalCase)

2. **HTTP 메서드로 시작** (선택사항이지만 권장)

   - ✅ `get-list.bru`, `post-create.bru`, `put-update.bru`, `delete-item.bru`
   - 이렇게 하면 쿼리 키가 `getList`, `postCreate` 등으로 생성되어 일관성 유지

3. **명확하고 간결한 이름**

   - ✅ `get-competitors.bru` (명확함)
   - ✅ `create-application.bru` (명확함)
   - ❌ `api1.bru` (불명확)
   - ❌ `test.bru` (불명확)

4. **한글 파일명 피하기**
   - ❌ `멘토 목록 조회.bru` (쿼리 키 생성 시 문제 가능)
   - ✅ `get-mentor-list.bru` (영문 사용)

#### 변환 규칙

파일명은 자동으로 camelCase로 변환됩니다:

| 파일명                        | 쿼리 키 이름               | 훅 이름                       |
| ----------------------------- | -------------------------- | ----------------------------- |
| `get-competitors.bru`         | `getCompetitors`           | `useGetCompetitors`           |
| `get-user-profile.bru`        | `getUserProfile`           | `useGetUserProfile`           |
| `post-create-application.bru` | `postCreateApplication`    | `usePostCreateApplication`    |
| `멘토 목록 조회.bru`          | `멘토목록조회` (문제 가능) | `use멘토목록조회` (문제 가능) |

**핵심**: 파일명을 영문 kebab-case로 작성하면, 자동으로 일관된 쿼리 키와 훅 이름이 생성됩니다!

### 전체 구조 예시

```
bruno/
├── [어드민] 7 Admin/              # 폴더명: 7 Admin
│   ├── get-list.bru               # → QueryKeys["7 Admin"].getList
│   ├── post-create.bru           # → QueryKeys["7 Admin"].postCreate
│   └── put-update.bru             # → QueryKeys["7 Admin"].putUpdate
├── 지원서 [applications]/        # 폴더명: applications
│   ├── get-competitors.bru        # → QueryKeys.applications.getCompetitors
│   ├── get-details.bru            # → QueryKeys.applications.getDetails
│   └── post-create.bru            # → QueryKeys.applications.postCreate
├── 사용자 [users]/                # 폴더명: users
│   ├── get-profile.bru            # → QueryKeys.users.getProfile
│   └── put-update-profile.bru     # → QueryKeys.users.putUpdateProfile
└── bruno.json
```

**생성되는 구조:**
```
src/apis/
├── 7 Admin/
│   ├── get-getList.ts
│   ├── post-postCreate.ts
│   └── index.ts
├── applications/
│   ├── get-getCompetitors.ts
│   ├── get-getDetails.ts
│   └── index.ts
├── users/
│   ├── get-getProfile.ts
│   └── index.ts
└── queryKeys.ts
```

## 실전 예시

### GET - 목록 조회

`````bru
meta {
  name: Get Competitors
  type: http
}

get /applications/competitors

headers {
  Authorization: Bearer {{token}}
}

docs {
  ````json
  {
    "firstChoice": [
      {
        "universityId": 1,
        "koreanName": "데겐도르프대학",
        "studentCapacity": 150,
        "applicantCount": 120
      }
    ],
    "secondChoice": [],
    "thirdChoice": []
  }
  ````
}
`````

### POST - 생성

`````bru
meta {
  name: Create Application
  type: http
}

post /applications

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "universityId": 1,
    "choice": "first"
  }
}

docs {
  ````json
  {
    "id": 123,
    "status": "pending",
    "submittedAt": "2025-11-12T05:30:00Z"
  }
  ````
}
`````

### GET - 상세 조회 (Path Parameter)

`````bru
meta {
  name: Get Application Detail
  type: http
}

get /applications/:id

headers {
  Authorization: Bearer {{token}}
}

docs {
  ````json
  {
    "id": 123,
    "userId": 456,
    "status": "approved",
    "reviewer": {
      "id": 789,
      "name": "심사자"
    }
  }
  ````
}
`````

## MSW 생성 제어

`meta.done: true`를 추가하면 MSW 핸들러 생성을 건너뜁니다.

```bru
meta {
  name: Get User Profile
  type: http
  done: true  # 백엔드 완료, MSW 불필요
}
```

**언제 사용하나요?**

- ✅ 백엔드 API 완료 → `done: true`
- ❌ 백엔드 API 개발 중 → `done` 생략 (MSW 생성)

## 체크리스트

새 API 엔드포인트를 만들 때:

- [ ] `meta` 블록 작성 (name 필수)
- [ ] HTTP 메서드와 경로 명확히 표기
- [ ] 인증 필요시 `headers` 블록에 Authorization
- [ ] POST/PUT이면 `body:json` 블록 작성
- [ ] **`docs` 블록 반드시 작성** (가장 중요!)
- [ ] JSON이 유효한가? (온라인 validator로 확인)
- [ ] 모든 필드가 포함되었나?
- [ ] 배열에 최소 1개 요소가 있나?
- [ ] 날짜는 ISO 8601 형식인가?

## 빠른 템플릿

### GET 템플릿

````bru
meta {
  name: [API 이름]
  type: http
}

get /[경로]

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "field": "value"
  }
````

}

````

### POST 템플릿

```bru
meta {
  name: [API 이름]
  type: http
}

post /[경로]

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "field": "value"
  }
}

docs {
  ```json
  {
    "id": 1,
    "status": "success"
  }
````

}

```

## 문제 해결

1. **파싱 에러**: docs 블록의 JSON을 복사해서 [JSONLint](https://jsonlint.com/)로 검증
2. **타입이 이상함**: 값의 타입 확인 (숫자는 따옴표 없이, 문자열은 따옴표)
3. **필드가 안보임**: docs 블록에 해당 필드 추가했는지 확인

---

**핵심은 `docs` 블록을 정확하게 작성하는 것!**
```

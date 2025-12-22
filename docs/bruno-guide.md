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

**올바른 예시:**
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

## 도메인별 폴더 구조

```
bruno/
├── 지원서 [applications]/    # 한글명 [영문키] 형식
│   ├── get-list.bru
│   └── create.bru
├── 사용자 [users]/
│   └── get-profile.bru
└── bruno.json
```

**폴더명 규칙**: `한글명 [EnglishKey]` 형식으로 작성하면, 대괄호 안의 `EnglishKey`만 사용됩니다.

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

```bru
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
  ```
}
```

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
  ```
}
```

## 문제 해결

1. **파싱 에러**: docs 블록의 JSON을 복사해서 [JSONLint](https://jsonlint.com/)로 검증
2. **타입이 이상함**: 값의 타입 확인 (숫자는 따옴표 없이, 문자열은 따옴표)
3. **필드가 안보임**: docs 블록에 해당 필드 추가했는지 확인

---

**핵심은 `docs` 블록을 정확하게 작성하는 것!**

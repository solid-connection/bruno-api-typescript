# GitHub Apps 연결 (5분 가이드)

> Bruno 저장소와 프론트엔드 저장소를 자동으로 연결하여 변경사항을 자동 PR로 생성

## 왜 필요한가?

Bruno 저장소에서 `.bru` 파일이 변경되면, 프론트엔드 저장소에 자동으로:
- React Query hooks 생성
- TypeScript 타입 생성
- PR 자동 생성

**결과**: 백엔드 개발자가 Bruno 파일만 수정하면, 프론트엔드 개발자는 PR만 확인하면 끝!

---

## 5분 설정

### 1단계: GitHub App 생성 (2분)

#### 1-1. GitHub Settings 이동

1. GitHub 우측 상단 프로필 → **Settings**
2. 왼쪽 메뉴 하단 → **Developer settings**
3. **GitHub Apps** → **New GitHub App**

#### 1-2. 앱 정보 입력

**필수 입력 사항**:
- GitHub App name: `bruno-sync-app` (조직명 추가 가능)
- Homepage URL: `https://github.com/your-org/bruno-api`
- Webhook: **비활성화** (체크 해제)

**권한 설정 (Repository permissions)**:
- **Contents**: Read & Write
- **Pull requests**: Read & Write
- **Workflows**: Read & Write

**Where can this GitHub App be installed?**:
- **Only on this account** 선택 (조직 계정이면 조직 선택)

#### 1-3. 생성 및 Private Key 다운로드

1. **Create GitHub App** 클릭
2. 생성된 앱 페이지에서 스크롤 다운
3. **Generate a private key** 클릭
4. `bruno-sync-app.{date}.private-key.pem` 파일 다운로드

**App ID 복사**:
- 페이지 상단에 표시된 **App ID** 복사 (예: `123456`)

### 2단계: App 설치 (1분)

#### 2-1. 앱 설치

1. GitHub App 설정 페이지에서 **Install App** (왼쪽 메뉴)
2. 조직 또는 개인 계정 선택
3. **All repositories** 또는 **Only select repositories** 선택
   - Bruno 저장소와 프론트엔드 저장소 선택
4. **Install** 클릭

#### 2-2. Installation ID 확인

설치 후 URL을 확인하세요:
```
https://github.com/settings/installations/{installation_id}
```

`{installation_id}` 숫자를 복사하세요 (예: `789012`)

### 3단계: Secrets 설정 (1분)

#### Bruno 저장소 Secrets

Bruno 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

다음 3개 Secret 추가:

1. **APP_ID**: `123456` (1단계에서 복사한 App ID)
2. **APP_PRIVATE_KEY**: `bruno-sync-app.pem` 파일 전체 내용 복사 붙여넣기
3. **INSTALLATION_ID**: `789012` (2단계에서 확인한 Installation ID)

#### 프론트엔드 저장소 Secrets

프론트엔드 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

동일한 3개 Secret 추가 (값 동일)

### 4단계: Workflow 파일 추가 (1분)

#### Bruno 저장소 Workflow

파일: `.github/workflows/sync-to-frontend.yml`

```yaml
name: Sync to Frontend

on:
  push:
    branches:
      - main
    paths:
      - '**/*.bru'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate App Token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: "frontend-repo"  # 프론트엔드 저장소 이름
      
      - name: Trigger Frontend Workflow
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ steps.app-token.outputs.token }}" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/${{ github.repository_owner }}/frontend-repo/dispatches \
            -d '{"event_type":"bruno_updated","client_payload":{"sha":"${{ github.sha }}"}}'
```

**수정 필요**:
- `frontend-repo`: 실제 프론트엔드 저장소 이름으로 변경

#### 프론트엔드 저장소 Workflow

파일: `.github/workflows/sync-from-bruno.yml`

```yaml
name: Sync from Bruno

on:
  repository_dispatch:
    types: [bruno_updated]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate App Token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
      
      - name: Clone Bruno Repo
        run: |
          git clone https://x-access-token:${{ steps.app-token.outputs.token }}@github.com/${{ github.repository_owner }}/bruno-api.git /tmp/bruno
      
      - name: Clone bruno-api-typescript
        run: |
          git clone https://github.com/solid-connection/bruno-api-typescript.git /tmp/bruno-api-typescript
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Build bruno-api-typescript
        working-directory: /tmp/bruno-api-typescript
        run: |
          npm install
          npm run build
      
      - name: Generate Hooks
        run: |
          node /tmp/bruno-api-typescript/dist/cli/index.js generate-hooks -i /tmp/bruno -o ./src/apis
      
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ steps.app-token.outputs.token }}
          commit-message: "chore: sync API from Bruno"
          branch: api-sync-${{ github.run_number }}
          title: "🔄 API Sync from Bruno"
          body: |
            ## Bruno API 자동 동기화
            
            Bruno 저장소가 업데이트되어 자동으로 hooks를 생성했습니다.
            
            **변경사항**:
            - React Query hooks 업데이트
            - TypeScript 타입 업데이트
```

**수정 필요**:
- `bruno-api`: 실제 Bruno 저장소 이름으로 변경
- `bruno-api-typescript`: 실제 bruno-api-typescript 저장소 이름으로 변경 (기본값: `solid-connection/bruno-api-typescript`)

---

## 테스트

### Bruno 파일 수정 후 푸시

```bash
# Bruno 저장소에서
vim users/get-profile.bru
git add .
git commit -m "feat: add email field"
git push origin main
```

### 확인

1. Bruno 저장소 Actions 탭 확인
2. 프론트엔드 저장소 Actions 탭 확인
3. 프론트엔드 저장소 Pull Requests 확인

**예상 결과**: 약 1-2분 후 프론트엔드 저장소에 PR 자동 생성!

---

## 트러블슈팅

### 1. "Resource not accessible by integration" 에러

**원인**: App 권한 부족

**해결**:
1. GitHub App 설정 → **Permissions** 확인
2. Contents, Pull requests, Workflows가 **Read & Write**인지 확인
3. 권한 변경 후 → **Install App** → 재설치

### 2. Private Key 오류

**원인**: Secret에 키가 잘못 입력됨

**해결**:
1. `.pem` 파일을 텍스트 에디터로 열기
2. `-----BEGIN RSA PRIVATE KEY-----`부터 `-----END RSA PRIVATE KEY-----`까지 전체 복사
3. Secret 다시 생성

### 3. Workflow가 트리거 안됨

**원인**: `.bru` 파일이 변경되지 않음

**해결**:
- Bruno 저장소에서 `.bru` 파일을 수정하고 푸시
- Workflow 파일의 `paths` 필터 확인

### 4. "npm error 404 Not Found - bruno-api-typescript" 에러

**원인**: npm 패키지가 아니므로 `npx`로 실행 불가

**해결**:
- Workflow에서 저장소를 클론하고 빌드한 후 사용
- 위의 Workflow 예시처럼 `git clone` → `npm install` → `npm run build` → `node dist/cli/index.js` 순서로 실행

---

## 더 자세한 가이드

심화 내용은 [상세 GitHub Apps 가이드](./archived/github-apps.md)를 참조하세요.

---

**설정 완료! 🎉**


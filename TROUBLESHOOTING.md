# 🔍 mandatory 가이드 시스템 문제 해결

## 현상

Docker 재빌드 후에도 Claude Copilot이 여전히 하드코딩된 데이터를 생성합니다.

```typescript
// ❌ 여전히 잘못된 코드 생성
const members = ref([
  { 순번: "999", 이메일: "email@email.com", ... }
]);
```

---

## 🔍 진단 체크리스트

### 1. Docker 재빌드 확인

```bash
# 컨테이너 이미지 ID 확인
docker images | grep mcp-code-mode

# 이미지 생성 시간 확인 (최근 빌드인지)
docker inspect mcp-code-mode-server | grep -A10 "Created"

# 컨테이너가 최신 이미지를 사용하는지 확인
docker ps -a --filter name=mcp-code-mode-server --format "{{.ID}} {{.Image}} {{.Status}}"
```

**예상**: 최근 시간에 생성된 이미지여야 함

### 2. 컨테이너 내부 파일 확인

```bash
# guides 모듈이 빌드되었는지
docker exec mcp-code-mode-server ls -la /app/mcp-servers/guides/dist/

# mandatory 가이드 파일이 있는지
docker exec mcp-code-mode-server ls -la /app/.github/instructions/guides/api/

# mandatory 로직이 있는지
docker exec mcp-code-mode-server cat /app/mcp-servers/guides/dist/index.js | grep -A3 "mandatory"
```

**예상 출력**:
- `/app/mcp-servers/guides/dist/index.js` 파일 존재
- `/app/.github/instructions/guides/api/mandatory-api-detection.md` 파일 존재
- `mandatory === true` 코드 발견

### 3. MCP 서버 로그 확인

```bash
# 최근 로그 확인
docker logs mcp-code-mode-server --tail 100

# guides 관련 로그 검색
docker logs mcp-code-mode-server 2>&1 | grep -i "guide\|mandatory"

# 에러 로그 검색
docker logs mcp-code-mode-server 2>&1 | grep -i "error\|fail"
```

**예상**: guides 모듈 로딩 성공 메시지, mandatory 가이드 발견 로그

### 4. VSCode MCP 연결 확인

VSCode에서:
1. Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. "MCP: Show Logs" 또는 "MCP: Restart Server"
3. 로그에서 에러 확인

---

## ✅ 해결된 문제

### ✅ 문제 0: guides 경로 오류 (커밋 26ca137)

**증상**:
```
[indexGuides] Scanning directory: /app/mcp-servers/.github/instructions/guides
ENOENT: no such file or directory, scandir '/app/mcp-servers/.github/instructions/guides'
```

**원인**: guides/index.ts가 잘못된 상대 경로 사용
- 기존: `../../.github` → `/app/mcp-servers/.github` (존재 안 함)
- 실제: `/app/.github` (여기에 있음)

**해결**: 커밋 26ca137에서 수정됨
```typescript
// 수정 전
const guidesDir = join(__dirname, '../../.github/instructions/guides');

// 수정 후
const guidesDir = join(__dirname, '../../../.github/instructions/guides');
```

**검증**:
```bash
docker exec -it mcp-code-mode-server node --input-type=module -e "
import('./mcp-servers/guides/dist/index.js')
  .then(m => m.indexGuides())
  .then(guides => {
    const mandatory = guides.filter(g => g.mandatory === true);
    console.log('✅ Mandatory guides found:', mandatory.map(g => g.id));
  });
"
```

**예상 출력**: `✅ Mandatory guides found: [ 'mandatory-api-detection' ]`

---

## 🚨 가능한 문제와 해결책

### 문제 1: Docker 캐시 문제

**증상**: `--no-cache` 없이 빌드했거나, 이전 레이어가 재사용됨

**해결**:
```bash
# 완전히 클린 빌드
docker-compose down -v
docker system prune -af
docker-compose build --no-cache
docker-compose up -d
```

### 문제 2: VSCode MCP 세션 캐시

**증상**: 새 Docker 이미지가 있지만 VSCode가 이전 세션 사용

**해결**:
```bash
# 1. VSCode 완전 종료
killall code  # Mac/Linux
# 또는 작업 관리자에서 모든 Code 프로세스 종료 (Windows)

# 2. VSCode 캐시 삭제 (선택사항)
# Mac: ~/Library/Application Support/Code/User/
# Linux: ~/.config/Code/User/
# Windows: %APPDATA%\Code\User\

# 3. VSCode 재시작
code .

# 4. MCP 서버 재시작
# Command Palette → "MCP: Restart Server"
```

### 문제 3: guides 모듈 런타임 에러

**증상**: 빌드는 성공했지만 런타임에 guides 모듈 로딩 실패

**진단**:
```bash
# guides 모듈 수동 테스트
docker exec -it mcp-code-mode-server node --input-type=module -e "
import('./mcp-servers/guides/dist/index.js')
  .then(m => {
    console.log('✅ guides module loaded');
    return m.indexGuides();
  })
  .then(guides => {
    const mandatory = guides.filter(g => g.mandatory === true);
    console.log('Mandatory guides found:', mandatory.length);
    mandatory.forEach(g => console.log('  -', g.id, ':', g.filePath));
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });
"
```

**예상 출력**:
```
✅ guides module loaded
Mandatory guides found: 1
  - mandatory-api-detection : /app/.github/instructions/guides/api/mandatory-api-detection.md
```

### 문제 4: MCP 서버가 구버전 코드 사용

**증상**: 컨테이너는 업데이트되었지만 MCP 서버가 이전 빌드 사용

**해결**:
```bash
# ai-runner 모듈이 새로 빌드되었는지 확인
docker exec mcp-code-mode-server ls -la /app/packages/ai-runner/dist/

# sandbox.js가 guides/dist/index.js를 import하는지 확인
docker exec mcp-code-mode-server cat /app/packages/ai-runner/dist/sandbox.js | grep "guides"
```

**예상**: `guides/dist/index.js` import 발견

---

## 💡 임시 해결책: 수동 가이드 지정

Docker 재빌드 전까지 임시로 사용할 수 있는 방법:

### Copilot에서 명시적으로 가이드 요청

```
#mcp-code-mode

먼저 다음 가이드를 로드해주세요:
- mandatory-api-detection

그 다음 memberManagement.vue 페이지를 완성해주세요.

프로젝트 구조:
- @airian/proto 패키지 사용
- GetUserListRequest, GetUserListResponse 타입 있음
- useBackendClient composable 사용 가능
- client.getUserList() API 있음

반드시 실제 API를 사용하고, 하드코딩된 데이터를 사용하지 마세요.
```

### 또는 execute 코드에서 직접 확인

```
#mcp-code-mode

다음 코드를 실행해서 mandatory 가이드가 로드되는지 확인해주세요:

const result = await guides.searchGuides({
  keywords: ['api', 'grpc'],
  scope: 'project'
});

console.log('Total guides:', result.results.length);
console.log('Mandatory guides:', result.results.filter(g => g.mandatory).map(g => g.id));

그 다음 mandatory-api-detection 가이드의 지침을 따라서 memberManagement.vue를 완성해주세요.
```

---

## 🔧 완전한 재설정 절차

모든 방법이 실패한 경우:

```bash
# 1. 모든 컨테이너/이미지/볼륨 삭제
docker-compose down -v
docker system prune -af --volumes

# 2. 코드 최신 버전 확인
git fetch origin
git log --oneline -5

# 최신 커밋이 다음인지 확인:
# 641aca5 - docs: Docker 재빌드 및 수정 요약 문서 추가
# dd8ef49 - fix: sandbox.ts에서 guides/dist/index.js 경로 사용
# 2f735a8 - fix: Docker 빌드에 guides 모듈 및 .github 디렉토리 추가

# 3. Docker 완전 재빌드
docker-compose build --no-cache --pull

# 4. 컨테이너 시작
docker-compose up -d

# 5. 빌드 검증
docker exec mcp-code-mode-server ls -la /app/.github/instructions/guides/api/
docker exec mcp-code-mode-server cat /app/mcp-servers/guides/dist/index.js | grep -c "mandatory"

# 6. VSCode 완전 재시작
killall code
code .

# 7. 새 프로젝트 창에서 테스트
cd /path/to/your/vue-project
code .
```

---

## 📊 성공 여부 확인

### ✅ 성공 케이스

Copilot이 다음과 같은 코드를 생성:

```typescript
import type {
  GetUserListRequest,
  GetUserListResponse,
  GetUserListResponse_User
} from '@airian/proto';

const client = useBackendClient("");
const list = ref<GetUserListResponse_User[]>([]);

async function loadMembers(page: number = 1, size: number = 10) {
  const req: GetUserListRequest = { page, size };

  if (filters.keyword) {
    switch (filters.searchType) {
      case "email": req.email = filters.keyword; break;
      case "nickName": req.nickName = filters.keyword; break;
      case "phone": req.phone = filters.keyword; break;
    }
  }

  const response = await client.getUserList(req);
  list.value = response.users || [];
}
```

### ❌ 실패 케이스

여전히 다음과 같은 코드를 생성:

```typescript
const members = ref([
  { 순번: "999", 이메일: "email@email.com", ... }
]);

// No API imports
// No useBackendClient
// No actual API calls
```

---

## 🆘 긴급 지원

위 모든 방법이 실패한 경우:

1. **로그 수집**
   ```bash
   # 모든 관련 로그 수집
   docker logs mcp-code-mode-server > mcp-server.log 2>&1
   docker exec mcp-code-mode-server ls -laR /app > container-files.log
   docker exec mcp-code-mode-server cat /app/mcp-servers/guides/dist/index.js > guides-dist.log
   ```

2. **이슈 리포트 작성**
   - 재빌드 명령어 히스토리
   - 수집한 로그 파일들
   - Copilot 대화 스크린샷
   - VSCode MCP 로그

3. **대안: 가이드 시스템 없이 직접 지시**
   ```
   #mcp-code-mode

   중요: 다음 규칙을 반드시 따르세요

   1. package.json에서 @airian/proto 패키지 확인
   2. proto_connect.d.ts에서 GetUserListRequest, GetUserListResponse 타입 import
   3. useBackendClient composable 사용
   4. client.getUserList(req) API 호출
   5. 절대로 하드코딩된 데이터 사용 금지

   위 규칙을 따라 memberManagement.vue를 완성해주세요.
   ```

---

**작성일**: 2025-11-12
**관련 문서**: FIX_SUMMARY.md, DOCKER_REBUILD_GUIDE.md

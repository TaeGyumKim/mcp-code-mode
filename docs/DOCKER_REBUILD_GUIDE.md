# Docker 재빌드 가이드

## 🚨 중요: mandatory 가이드 시스템 활성화

Dockerfile이 수정되어 다음 기능이 추가되었습니다:
- ✅ `@mcp-code-mode/guides` 모듈 빌드 (mandatory 자동 로드 시스템)
- ✅ `.github/instructions/guides/` 디렉토리 복사 (mandatory-api-detection.md 포함)

**이 변경사항을 적용하려면 Docker 재빌드가 필수입니다.**

---

## 📋 재빌드 단계

### 1. 현재 컨테이너 중지 및 삭제

```bash
# Docker Compose 사용하는 경우
docker-compose down

# 또는 특정 컨테이너만 중지
docker stop mcp-code-mode-server
docker rm mcp-code-mode-server
```

### 2. 이미지 재빌드 (캐시 없이)

```bash
# 캐시를 사용하지 않고 완전히 새로 빌드
docker-compose build --no-cache

# 또는 특정 서비스만 재빌드
docker-compose build --no-cache mcp-code-mode-server
```

### 3. 컨테이너 시작

```bash
# 백그라운드에서 실행
docker-compose up -d

# 또는 로그 확인하며 실행
docker-compose up
```

### 4. 빌드 검증

```bash
# 컨테이너가 정상 실행 중인지 확인
docker ps | grep mcp-code-mode

# 컨테이너 내부 파일 확인
docker exec mcp-code-mode-server ls -la /app/.github/instructions/guides/api/
docker exec mcp-code-mode-server ls -la /app/mcp-servers/guides/dist/

# 로그 확인
docker logs mcp-code-mode-server
```

---

## ✅ 검증 방법

### 1. guides 모듈이 빌드되었는지 확인

```bash
docker exec mcp-code-mode-server cat /app/mcp-servers/guides/dist/index.js | grep -A3 "mandatory"
```

**예상 출력**:
```javascript
// Auto-detect mandatory: true guides
const autoMandatoryIds = allGuides
  .filter(g => g.mandatory === true)
  .map(g => g.id);
```

### 2. mandatory-api-detection.md 파일 존재 확인

```bash
docker exec mcp-code-mode-server cat /app/.github/instructions/guides/api/mandatory-api-detection.md | head -10
```

**예상 출력**:
```markdown
---
id: mandatory-api-detection
version: 1.0.0
scope: project
priority: critical
mandatory: true
tags: [api, grpc, openapi, types, validation]
---

# ⚠️ 필수: API 자동 감지 및 타입 검증
```

### 3. MCP 서버 재시작 확인

VSCode를 재시작하거나 MCP 연결을 새로고침:

1. VSCode 완전 종료
2. VSCode 재시작
3. Copilot Chat 창 열기
4. 테스트: `#mcp-code-mode 현재 로드된 가이드 목록 보여줘`

---

## 🧪 테스트 방법

### Copilot에서 테스트

1. **새 프로젝트 창 열기**
   ```bash
   # 다른 프로젝트 디렉토리로 이동
   cd /path/to/your/vue-project
   code .
   ```

2. **Copilot Chat에서 요청**
   ```
   #mcp-code-mode memberManagement.vue 페이지를 완성해 줘
   ```

3. **예상 결과** (✅ 올바른 코드):
   ```typescript
   // ✅ 타입 import
   import type {
     GetUserListRequest,
     GetUserListResponse,
     GetUserListResponse_User
   } from '@airian/proto';

   // ✅ API 클라이언트 사용
   const client = useBackendClient("");
   const list = ref<GetUserListResponse_User[]>([]);

   // ✅ 실제 API 호출
   async function loadMembers(page: number = 1, size: number = 10) {
     const req: GetUserListRequest = { page, size };
     const response = await client.getUserList(req);
     list.value = response.users || [];
   }
   ```

4. **잘못된 결과** (❌ 하드코딩):
   ```typescript
   // ❌ 하드코딩된 데이터
   const allMembers = ref([
     { 순번: "999", 이메일: "email@email.com" }
   ]);

   // ❌ API 미사용
   ```

---

## 🔍 문제 해결

### 문제: 재빌드 후에도 하드코딩된 데이터 생성

**원인**:
- VSCode가 이전 MCP 서버 세션을 캐시하고 있을 수 있음
- MCP 서버가 제대로 재시작되지 않았을 수 있음

**해결**:

1. **VSCode 완전 재시작**
   ```bash
   # VSCode 프로세스 완전 종료 후 재시작
   killall code  # Mac/Linux
   # 또는 작업 관리자에서 종료 (Windows)
   ```

2. **MCP 서버 로그 확인**
   ```bash
   docker logs mcp-code-mode-server 2>&1 | grep -i "mandatory\|guide"
   ```

3. **수동으로 가이드 로딩 테스트**
   ```bash
   docker exec -it mcp-code-mode-server node -e "
   import('./mcp-servers/guides/dist/index.js').then(m => {
     m.indexGuides().then(guides => {
       const mandatory = guides.filter(g => g.mandatory === true);
       console.log('Mandatory guides:', mandatory.map(g => g.id));
     });
   });
   "
   ```

### 문제: guides 모듈 빌드 실패

```bash
# 빌드 로그 확인
docker-compose logs mcp-code-mode-server | grep -A10 "guides"
```

**원인**:
- yarn 의존성 설치 실패
- TypeScript 컴파일 오류

**해결**:
```bash
# 캐시 완전 삭제 후 재빌드
docker-compose down -v
docker system prune -af
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 최종 확인 체크리스트

완료 후 다음을 확인하세요:

- [ ] Docker 컨테이너가 정상 실행 중
- [ ] `/app/.github/instructions/guides/api/mandatory-api-detection.md` 파일 존재
- [ ] `/app/mcp-servers/guides/dist/index.js`에 `mandatory` 로직 포함
- [ ] VSCode 재시작 완료
- [ ] Copilot에서 API 타입 자동 import 확인
- [ ] Copilot에서 `useBackendClient` 자동 사용 확인
- [ ] 하드코딩된 데이터 미생성 확인

---

## 🎯 기대 효과

재빌드 후:
- ✅ Claude Copilot이 자동으로 API 감지
- ✅ gRPC 타입 자동 import
- ✅ useBackendClient composable 자동 사용
- ✅ 실제 API 호출 코드 생성
- ❌ 하드코딩된 샘플 데이터 생성 방지

---

**작성일**: 2025-11-12
**관련 커밋**: `2f735a8 - fix: Docker 빌드에 guides 모듈 및 .github 디렉토리 추가`

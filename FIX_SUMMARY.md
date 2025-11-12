# 🔧 mcp-code-mode 수정 완료 요약

## ❌ 발견된 문제

Claude Copilot이 memberManagement.vue 생성 시 다음과 같은 잘못된 코드를 생성:

```typescript
// ❌ 하드코딩된 샘플 데이터
const allMembers = ref([
  { 순번: "999", 이메일: "email@email.com", ... }
]);

// ❌ API 클라이언트 미사용
// ❌ gRPC 타입 미사용
// ❌ 실제 API 호출 없음
```

**원인**: mandatory-api-detection 가이드 시스템이 작동하지 않음

---

## 🔍 근본 원인 분석

### 1. Dockerfile 문제 (커밋: 2f735a8)

```dockerfile
# ❌ 문제 1: guides 모듈이 빌드되지 않음
RUN yarn workspace bestcase-db run build && \
    yarn workspace ai-bindings run build && \
    yarn workspace ai-runner run build && \
    yarn workspace llm-analyzer run build && \
    # guides 빌드 누락!
    yarn workspace mcp-scripts run build && \
    yarn build:root

# ❌ 문제 2: .github 디렉토리가 복사되지 않음
COPY .yarn ./.yarn
COPY packages ./packages
# .github 디렉토리 누락!
COPY mcp-servers ./mcp-servers
```

**결과**:
- `guides/dist/index.js` 빌드 안 됨 (mandatory 자동 로드 로직 없음)
- `.github/instructions/guides/api/mandatory-api-detection.md` 파일 없음

### 2. sandbox.ts 문제 (커밋: dd8ef49)

```typescript
// ❌ 잘못된 import 경로
import * as guides from '../../../mcp-servers/guides/index.js';
//                                                    ^^^^^^^^ 존재하지 않음!

// guides/index.js는 TypeScript 소스 파일
// 실제 빌드 결과는 guides/dist/index.js에 위치
```

**결과**:
- MCP execute 도구에서 guides API 로드 실패
- mandatory 가이드 시스템 작동 불가

---

## ✅ 적용된 수정

### 수정 1: Dockerfile 수정 (2f735a8)

```dockerfile
# ✅ .github 디렉토리 복사 추가
COPY .yarn ./.yarn
COPY .github ./.github  # ← 추가!
COPY packages ./packages

# ✅ guides 모듈 빌드 추가
RUN yarn workspace bestcase-db run build && \
    yarn workspace ai-bindings run build && \
    yarn workspace ai-runner run build && \
    yarn workspace llm-analyzer run build && \
    yarn workspace @mcp-code-mode/guides run build && \  # ← 추가!
    yarn workspace mcp-scripts run build && \
    yarn build:root
```

### 수정 2: sandbox.ts import 경로 수정 (dd8ef49)

```typescript
// ✅ 올바른 import 경로
import * as guides from '../../../mcp-servers/guides/dist/index.js';
//                                                    ^^^^^^^^^^^
```

---

## 🚀 Docker 재빌드 방법

```bash
# 1. 컨테이너 중지 및 삭제
docker-compose down

# 2. 캐시 없이 완전 재빌드
docker-compose build --no-cache

# 3. 컨테이너 시작
docker-compose up -d

# 4. 검증
docker exec mcp-code-mode-server ls -la /app/.github/instructions/guides/api/
docker exec mcp-code-mode-server ls -la /app/mcp-servers/guides/dist/
docker exec mcp-code-mode-server cat /app/mcp-servers/guides/dist/index.js | grep -A3 "mandatory"
```

---

## ✅ 검증 방법

### 1. VSCode 재시작

```bash
# VSCode 완전 종료 후 재시작
killall code  # Mac/Linux
# 또는 작업 관리자에서 종료 (Windows)
```

### 2. 다른 프로젝트에서 테스트

```bash
cd /path/to/your/vue-project
code .
```

### 3. Copilot에서 요청

```
#mcp-code-mode memberManagement.vue 페이지를 완성해 줘
```

### 4. 예상 결과

**✅ 올바른 코드** (mandatory 가이드 적용됨):

```typescript
<script setup lang="ts">
import type {
  GetUserListRequest,
  GetUserListResponse,
  GetUserListResponse_User
} from '@airian/proto';

const client = useBackendClient("");
const list = ref<GetUserListResponse_User[]>([]);
const totalCount = ref<number>(0);

async function loadMembers(page: number = 1, size: number = 10) {
  const req: GetUserListRequest = {
    page,
    size
  };

  if (filters.keyword) {
    switch (filters.searchType) {
      case "email":
        req.email = filters.keyword;
        break;
      case "nickName":
        req.nickName = filters.keyword;
        break;
      case "phone":
        req.phone = filters.keyword;
        break;
    }
  }

  if (filters.startDate && filters.endDate) {
    req.startDate = filters.startDate;
    req.endDate = filters.endDate;
  }

  try {
    const response: GetUserListResponse = await client.getUserList(req);
    list.value = response.users || [];
    totalCount.value = Number(response.pageInfo?.totalCount || 0);
  } catch (error) {
    console.error("회원 목록 로드 실패:", error);
  }
}

onMounted(() => {
  loadMembers();
});
</script>
```

**❌ 잘못된 코드** (mandatory 가이드 미적용):

```typescript
// ❌ 하드코딩된 데이터
const allMembers = ref([
  { 순번: "999", 이메일: "email@email.com" }
]);

// ❌ API 미사용
```

---

## 📊 기술 세부 사항

### mandatory 가이드 자동 로드 시스템

**guides/index.ts** (커밋: 1e5414c):

```typescript
export interface GuideMetadata {
  id: string;
  // ...
  mandatory?: boolean;  // 🔑 필수 가이드 (자동으로 항상 로드됨)
}

export async function searchGuides(input: SearchGuidesInput): Promise<SearchGuidesOutput> {
  const allGuides = await indexGuides();

  // 🔑 mandatory: true인 가이드를 자동으로 mandatoryIds에 추가
  const autoMandatoryIds = allGuides
    .filter(g => g.mandatory === true)
    .map(g => g.id);

  if (autoMandatoryIds.length > 0) {
    console.error('[searchGuides] Auto-detected mandatory guides:', autoMandatoryIds);
  }

  // mandatoryIds와 auto-detected mandatory 병합
  const allMandatoryIds = [
    ...(input.mandatoryIds || []),
    ...autoMandatoryIds
  ];

  // Load mandatory guides with score 1000 (highest priority)
  // ...
}
```

### mandatory-api-detection.md 가이드

**.github/instructions/guides/api/mandatory-api-detection.md** (커밋: b1dd859):

```markdown
---
id: mandatory-api-detection
version: 1.0.0
scope: project
priority: critical
mandatory: true  # 🔑 자동 로드!
tags: [api, grpc, openapi, types, validation]
---

# ⚠️ 필수: API 자동 감지 및 타입 검증

## 📋 필수 실행 단계

### Step 1: package.json 확인
### Step 2: API 클라이언트 파일 검색
### Step 3: 타입 정의 파일 검색
### Step 4: BestCase 참고 파일 확인

## ❌ 금지 사항

### 1. 하드코딩된 데이터 사용 금지
### 2. 타입 새로 정의 금지
### 3. API 호출 생략 금지

## ✅ 올바른 방법

### 1. 실제 API 클라이언트 사용
### 2. 기존 타입 Import
### 3. BestCase 패턴 참고
```

### MCP 서버 아키텍처

```
VSCode Copilot
    ↓
MCP STDIO Protocol (JSON-RPC)
    ↓
mcp-stdio-server.ts
    ↓
packages/ai-runner/agentRunner.ts
    ↓
packages/ai-runner/sandbox.ts (VM2 샌드박스)
    ├─ filesystem API
    ├─ bestcase API
    ├─ guides API ← guides/dist/index.js
    └─ metadata API
```

**샌드박스에서 guides 사용**:

```typescript
// Copilot이 execute 도구를 호출할 때 작성하는 코드
const guidelines = await guides.searchGuides({
  keywords: ['api', 'grpc', 'vue'],
  scope: 'project',
  // mandatoryIds 없어도 mandatory: true 가이드는 자동 로드!
});

console.log('Mandatory guides:', guidelines.results.filter(g => g.mandatory));
```

---

## 🎯 기대 효과

재빌드 후:

1. **✅ API 자동 감지**
   - package.json에서 gRPC/OpenAPI 패키지 자동 탐지
   - API 클라이언트 파일 자동 검색
   - 타입 정의 파일 자동 발견

2. **✅ 타입 안정성**
   - 기존 Request/Response 타입 자동 import
   - 새로운 타입 정의 생성 방지
   - Proto 파일 기반 타입 사용

3. **✅ 실제 API 연동**
   - useBackendClient composable 자동 사용
   - client.getUserList() 등 실제 API 호출
   - 에러 처리 포함

4. **❌ 하드코딩 방지**
   - 샘플 데이터 생성 금지
   - TODO 주석 대신 실제 구현
   - 모든 코드가 프로덕션 준비 완료

---

## 📝 커밋 히스토리

```
dd8ef49 - fix: sandbox.ts에서 guides/dist/index.js 경로 사용
2f735a8 - fix: Docker 빌드에 guides 모듈 및 .github 디렉토리 추가
1e5414c - feat: mandatory 가이드 자동 로드 시스템 구현
b1dd859 - feat: mandatory-api-detection 가이드 추가 - API 자동 감지 강제화
d00ab8c - fix: BestCase 검증 로직 수정 - 유효한 파일이 없으면 AI 스캔 실행
9449a55 - docs: 전체 시스템 검토 및 cron-scan.sh 일관성 개선
```

---

## 🔍 문제 해결

### 재빌드 후에도 하드코딩 발생

**원인**: VSCode가 이전 MCP 서버 세션을 캐시

**해결**:
1. VSCode 완전 종료 (`killall code`)
2. VSCode 재시작
3. 새 프로젝트 창 열기
4. 다시 테스트

### guides 로딩 실패

**디버깅**:

```bash
# MCP 서버 로그 확인
docker logs mcp-code-mode-server 2>&1 | grep -i "mandatory\|guide"

# guides 모듈 수동 테스트
docker exec -it mcp-code-mode-server node -e "
import('./mcp-servers/guides/dist/index.js').then(m => {
  m.indexGuides().then(guides => {
    const mandatory = guides.filter(g => g.mandatory === true);
    console.log('Mandatory guides:', JSON.stringify(mandatory.map(g => ({
      id: g.id,
      mandatory: g.mandatory,
      filePath: g.filePath
    })), null, 2));
  });
});
"
```

**예상 출력**:

```json
Mandatory guides: [
  {
    "id": "mandatory-api-detection",
    "mandatory": true,
    "filePath": "/app/.github/instructions/guides/api/mandatory-api-detection.md"
  }
]
```

---

## 📚 참고 문서

- [DOCKER_REBUILD_GUIDE.md](./DOCKER_REBUILD_GUIDE.md) - Docker 재빌드 상세 가이드
- [VSCODE_COPILOT_USAGE.md](./docs/VSCODE_COPILOT_USAGE.md) - VSCode Copilot 사용법
- [mandatory-api-detection.md](./.github/instructions/guides/api/mandatory-api-detection.md) - Mandatory 가이드 내용

---

**작성일**: 2025-11-12
**브랜치**: `claude/llm-command-metadata-system-011CV1TPNnF7jpRZ1vHyrsjS`
**최종 커밋**: `dd8ef49`

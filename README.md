# MCP Code Mode Starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)
[![Code Mode](https://img.shields.io/badge/MCP-Code%20Mode-purple)](https://blog.cloudflare.com/code-mode/)

> **🚀 Production-Ready TypeScript Code Mode Implementation**
> 
> Cloudflare와 Anthropic이 제시한 "Code Mode" 패턴을 **완전한 TypeScript**로 구현한 MCP 서버입니다.
> 토큰 사용량을 **98% 절감**하고, GPU 기반 AI 분석으로 코드 품질을 자동 평가합니다.

## ✨ 특징

- 🎯 **Code Mode 표준 준수**: 단일 `execute` 툴 + Sandbox 실행 + TypeScript API
- 💎 **100% TypeScript**: 모든 소스 코드가 TypeScript 5.9.3 strict mode로 작성됨
- 🤖 **AI 코드 분석**: Ollama LLM (qwen2.5-coder:1.5b) + GPU 기반 실시간 품질 측정
- 💾 **BestCase 관리**: 프로젝트 패턴 자동 저장 및 로드
- 🎨 **디자인 시스템 감지**: 7개 주요 UI 프레임워크 자동 감지 (openerd-nuxt3, element-plus, vuetify, quasar, primevue, ant-design-vue, naive-ui)
- 🔧 **유틸리티 라이브러리 감지**: 9개 라이브러리 자동 감지 (vueuse, lodash, date-fns, axios, dayjs + 하이브리드 4개)
- 📦 **로컬 패키지 시스템**: 내부 솔루션을 AI가 자동 분석하여 등록 (Git URL, node_modules, 로컬 경로 지원)
- 🎯 **자동 프로젝트 컨텍스트**: execute 응답에 API 타입/디자인 시스템/유틸리티 정보 자동 포함
- � **동적 지침 로딩**: 메타데이터 기반 지침 검색/병합 시스템 (클로드 스킬과 유사)
- 🛡️ **프리플라이트 검수**: API/의존성/쓰기범위 검증 + 리스크 스코어링
- �🔒 **안전한 실행**: vm2 샌드박스 격리
- 📊 **스마트 스코어링**: API 품질 + 컴포넌트 사용도 자동 평가 (S/A/B/C/D 티어)
- 🐳 **Docker 배포**: GPU 지원 + 자동 스캔 스케줄러
- ⚡ **98% 토큰 절감**: 중간 데이터 격리, 최종 결과만 반환
- 🏗️ **Yarn Berry Workspace**: 모노레포 패키지 관리 (workspaces)

## 🎯 Code Mode란?

Code Mode는 LLM이 직접 tool calling을 하는 대신, **TypeScript 코드를 작성하고 샌드박스에서 실행**하는 패턴입니다.

### 전통적인 MCP vs Code Mode

| 구분 | 전통적인 MCP | Code Mode (본 프로젝트) |
|------|-------------|------------------------|
| **Tool 노출** | 100개 tool 개별 노출 | 단일 `execute` tool |
| **데이터 흐름** | Tool → LLM → Tool | Sandbox 내부 처리 |
| **토큰 소비** | 중간 데이터 전부 전송 | 최종 결과만 반환 |
| **실행 방식** | JSON-RPC tool calls | TypeScript 코드 실행 |

### 토큰 절감 예시

```typescript
// ❌ 전통적인 MCP (150,000 토큰)
{
  "tool": "read_file",
  "result": "<500KB CSV 전체 내용>"  // 전체가 LLM 컨텍스트로
}

// ✅ Code Mode (2,000 토큰)
{
  "tool": "execute",
  "code": `
    const data = filesystem.readTextFile('/data.csv');
    const summary = data.split('\\n').slice(0, 10);  // Sandbox에서 처리
    return summary;  // 10행만 반환
  `
}
```

**결과: 98% 토큰 절감** (150,000 → 2,000 토큰)

## 📋 주요 기능

### 1. 프로젝트 스캔 및 분석

- **자동 탐지**: Vue/TS 파일, gRPC/OpenAPI 패키지 감지
- **AI 분석**: Ollama LLM + GPU 기반 코드 품질 측정
- **패턴 추출**: 컴포넌트 사용 통계, API 타입, 프레임워크 정보
- **디자인 시스템 감지**: 컴포넌트 네이밍 패턴 기반 자동 감지 (CommonButton → openerd-nuxt3, ElButton → element-plus, VBtn → vuetify 등)

### 2. 디자인 시스템 활용 ⭐ NEW

**핵심**: 프로젝트의 디자인 시스템을 자동 감지하여 일관된 코드 생성

- **자동 감지**: 7개 주요 UI 프레임워크 지원 (openerd-nuxt3, element-plus, vuetify, quasar, primevue, ant-design-vue, naive-ui)
- **컴포넌트 매핑**: 디자인 시스템별 컴포넌트 정보 제공 (이름, 사용법, Props 등)
- **가이드 우선순위**: 검색 시 디자인 시스템 관련 가이드 +25~40점 부스트
- **일관성 유지**: 프로젝트의 기존 디자인 시스템에 맞는 컴포넌트 자동 선택
  - `openerd-nuxt3` → CommonTable, CommonButton 사용
  - `element-plus` → ElTable, ElButton 사용
  - `vuetify` → VDataTable, VBtn 사용

**상세 가이드**: [docs/DESIGN_SYSTEM_USAGE.md](./docs/DESIGN_SYSTEM_USAGE.md)

### 3. 유틸리티 라이브러리 활용 ⭐ NEW

**핵심**: 프로젝트의 유틸리티 라이브러리를 자동 감지하여 일관된 함수/composables 사용

- **자동 감지**: 9개 라이브러리 지원 (vueuse, lodash, date-fns, axios, dayjs + 하이브리드 패키지)
- **함수 매핑**: 라이브러리별 함수/composables 정보 제공 (이름, 사용법, 파라미터 등)
- **가이드 우선순위**: 검색 시 유틸리티 라이브러리 관련 가이드 +25~40점 부스트
- **일관성 유지**: 프로젝트의 기존 유틸리티 라이브러리에 맞는 함수 자동 선택
  - `vueuse` → useLocalStorage, useMouse, useFetch 사용
  - `lodash` → debounce, get, chunk 사용
  - `date-fns` → format, parseISO, addDays 사용

**🎨 하이브리드 패키지** (컴포넌트 + 유틸리티):
- **openerd-nuxt3**: CommonTable (디자인) + useTable (유틸)
- **element-plus**: ElTable (디자인) + useFormItem (유틸)
- **vuetify**: VDataTable (디자인) + useDisplay (유틸)
- **quasar**: QTable (디자인) + useQuasar (유틸)

> 하이브리드 패키지는 `designSystem`과 `utilityLibrary` 필드에 **동시에 감지**됩니다.

**상세 가이드**: [docs/UTILITY_LIBRARY_USAGE.md](./docs/UTILITY_LIBRARY_USAGE.md)

### 4. 로컬 패키지 시스템 ⭐ NEW

**핵심**: 조직 내부 디자인 시스템/유틸리티를 AI가 자동 분석하여 등록

- **3가지 소스 타입**: Git URL, node_modules, 로컬 경로
- **AI 자동 분석**: 소스 코드에서 컴포넌트/함수 자동 추출
- **독립 Docker 서비스**: 별도 컨테이너에서 무거운 분석 작업 격리
- **자동 스케줄링**: 매일 자정 미분석 패키지, 주간 재분석
- **Git 지원**: Private 저장소 clone 및 특정 커밋 고정
- **사용 예시**:
  ```json
  {
    "id": "openerd-nuxt3",
    "sourceType": "git",
    "gitUrl": "git+https://git.dev.opnd.io/common/openerd-nuxt3.git#commit=9b400392...",
    "analyzed": false
  }
  ```
  → Docker 서비스가 자동으로 clone → AI 분석 → 컴포넌트/함수 추출 → 감지 패턴 생성

**상세 가이드**: [docs/LOCAL_PACKAGES.md](./docs/LOCAL_PACKAGES.md)

### 5. 자동 프로젝트 컨텍스트 추출 ⭐ NEW

**핵심**: MCP execute 응답에 프로젝트 정보를 자동으로 포함하여 매번 분석 필요 없이 즉시 활용

- **자동 감지**: package.json에서 API 타입, 디자인 시스템, 유틸리티 라이브러리 자동 추출
- **API 타입 감지**: gRPC, OpenAPI, REST, Mixed 자동 구분
  - `@grpc/grpc-js` → gRPC
  - `@openapi`, `swagger` → OpenAPI
  - `axios`, `ky` → REST
- **디자인 시스템 감지**: 7개 주요 UI 프레임워크 자동 인식
- **로컬 패키지 상태**: 미분석 패키지 개수 자동 알림
- **권장 플랜 생성**: 프로젝트 상태에 맞는 다음 단계 자동 제안
- **자동 포함**: 모든 execute 도구 호출에 자동으로 포함됨

**응답 예시**:
```
## 📋 Project Context

**Project Path**: /projects/my-app

### Recommended Plan

✅ API Type: GRPC (@grpc/grpc-js, @grpc/proto-loader)
✅ Design System: @openerd/nuxt3, element-plus - Use these components for consistency
✅ Utility Library: @vueuse/core - Use these utilities for consistency

📋 Recommended Next Steps:
1. Run project metadata analysis if needed
2. Check BestCase for similar projects
3. Load relevant guides based on API type and design system

---
```

> Claude는 이 정보를 매번 자동으로 받아서 프로젝트 특성에 맞는 코드를 생성합니다.

### 6. BestCase 관리

- **자동 저장**: 프로젝트 패턴, 샘플 코드, 점수 저장
- **스마트 로드**: 현재 프로젝트의 BestCase 자동 로드
- **버전 관리**: 타임스탬프 기반 버전 추적

### 7. 동적 지침 로딩 시스템 (MCP 통합 완료)

- **4가지 MCP 도구**: `search_guides`, `load_guide`, `combine_guides`, `execute_workflow`
- **메타데이터 기반 검색**: scope/priority/version/tags로 관련 지침 자동 검색 (BM25-like)
- **필수 지침 강제 포함**: mandatoryIds로 핵심 지침 자동 적용 (1000점 최상위 스코어)
- **프리플라이트 검수**: API 시그니처, 의존성, 쓰기 범위, 지침 충돌 검증
- **리스크 스코어링**: 40점 임계치로 자동 적용 vs 스캐폴딩만 결정
- **우선순위 병합**: project > repo > org > global, requires/excludes 자동 처리
- **감사 추적**: 사용된 지침 id/version/scope 자동 로깅
- **11개 지침 파일**: API, UI, 에러 처리, 워크플로우 등

### 8. 점수 시스템

- **API 품질** (0-100점): gRPC/OpenAPI 사용도 평가
- **컴포넌트 품질** (0-100점): openerd-nuxt3 활용도 평가
- **종합 점수**: API 40% + 컴포넌트 20% + 패턴 40%
- **티어 시스템**: S (90+), A (80-89), B (70-79), C (60-69), D (0-59)

### 9. 자동화

- **Docker 시작 시 자동 검증**: 기존 BestCase 양식 체크 및 오래된 데이터 삭제
- **초기 AI 스캔**: 문제 있는 BestCase 발견 시 자동으로 전체 스캔 실행
- **주간 스캔**: 매주 일요일 02:00 AM 정기 스캔
- **중복 제거**: 프로젝트별 최신 BestCase만 유지
- **Docker 배포**: GPU 지원 + 자동 스케줄러

## 🚀 빠른 시작

### 로컬 실행

```bash
# 1. 의존성 설치
yarn install

# 2. 모든 패키지 빌드 (TypeScript → JavaScript)
yarn workspaces foreach -A run build

# 3. 프로젝트 스캔 (선택)
yarn scan:advanced

# 4. MCP 서버 실행
npx tsx mcp-stdio-server.ts
```

### Docker 실행

```bash
# GPU 사용 (NVIDIA GPU 필요)
docker-compose up -d --build

# 또는 CPU 전용
docker-compose -f docker-compose.cpu.yml up -d --build

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f mcp-code-mode

# GPU 사용 확인 (GPU 버전만)
docker exec ollama-code-analyzer nvidia-smi

# 중지
docker-compose down
```

**실행되는 서비스:**
- **ollama**: LLM 서버 (qwen2.5-coder:7b)
- **mcp-code-mode**: MCP STDIO 서버 (VSCode 연동)
- **local-package-analyzer**: 로컬 패키지 자동 분석 (독립 컨테이너)
  - 매일 자정: 미분석 패키지 자동 분석
  - 매주 일요일 03:00: 전체 패키지 재분석
  - Git 저장소 자동 clone 및 AI 분석
- **cron-scheduler**: BestCase 자동 스캔
  - 시작 시 BestCase 검증 및 초기 AI 스캔
  - 주간 자동 스캔 (일요일 02:00)

**초기화 프로세스:**
1. 🔍 BestCase 검증: 양식 체크, 30일 이상 오래된 데이터 삭제
2. 🤖 AI 스캔: 문제 발견 시 자동으로 전체 프로젝트 재스캔
3. 🔧 로컬 패키지 분석: `.mcp/local-packages.json` 등록된 패키지 자동 분석
4. ⏰ Cron 시작: 주간 자동 스캔 스케줄 등록

**로그 확인:**
```bash
# 로컬 패키지 분석 로그
docker-compose logs -f local-package-analyzer

# BestCase 스캔 로그
docker-compose logs -f cron-scheduler
```

### VS Code MCP 연동

`.vscode/settings.json` 또는 `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "mcp-code-mode": {
      "type": "stdio",
      "command": "docker",
      "args": ["exec", "-i", "mcp-code-mode-server", "node", "/app/mcp-stdio-server.js"]
    }
  }
}
```

---

## 🎯 VSCode Copilot (Claude)으로 사용하기

이 시스템은 **메타데이터 기반 자동 작업 분류**를 제공합니다:

### 📋 워크플로우

```
사용자 요청
  → 대상 프로젝트 메타데이터 추출 (patterns, frameworks, complexity)
  → 서버 BestCase 메타데이터와 비교
  → 작업 분류 (누락된 패턴 자동 파악)
  → 필요한 가이드라인만 로드 (94% 토큰 절감)
  → 고품질 참고 파일 선택 (점수 70점 이상)
  → 코드 생성
```

### ✨ 핵심 기능

- 🎯 **자동 작업 분류**: 메타데이터 비교로 누락된 패턴/개선점 자동 파악
- 📚 **동적 가이드 로딩**: 필요한 가이드만 선택적으로 로드 (94% 토큰 절감)
- 💎 **품질 기반 참고**: 점수(0-100)로 고품질 참고 파일 자동 선택
- ⚡ **토큰 90% 절감**: MCP 도구 최소화 (7개 → 1개) + 선택적 로딩

### 🚀 사용 예시

**VSCode Copilot 채팅에서**:

```
👤 현재 프로젝트를 분석하고 개선점을 알려줘

🤖 프로젝트를 분석하겠습니다...

   📊 분석 결과:
   - Patterns: state-management, api-call
   - Frameworks: nuxt, vue, pinia
   - API Type: grpc
   - Complexity: medium

   📋 개선이 필요한 항목 (2개):

   1. ⚠️ interceptor 패턴 추가 (우선순위: 높음)
      - 참고: useGrpcClient.ts (92점/100점)

   2. ⚠️ 에러 처리 개선 (우선순위: 높음)
      - 현재: 71% vs BestCase: 90%
      - 참고 파일 3개 발견 (70점 이상)

   어떤 항목부터 개선하시겠습니까?
```

### 📚 상세 가이드

**[📖 VSCode Copilot 사용 가이드](./docs/VSCODE_COPILOT_USAGE.md)** 문서를 참고하세요:

- 기본 사용법 (execute 도구)
- 메타데이터 추출
- BestCase 비교 및 작업 분류
- 가이드 로드
- 코드 생성
- 실전 예시
- 문제 해결

### 🎓 주요 API

VSCode Copilot은 `execute` 도구로 TypeScript 코드를 실행합니다:

```typescript
// Sandbox에서 사용 가능한 API
await filesystem.searchFiles({ path: '...' });        // 파일 검색
await bestcase.list();                                 // BestCase 목록
await guides.search({ keywords: [...] });              // 가이드 검색
const analyzer = metadata.createAnalyzer({ ... });    // 메타데이터 분석기
```

**더 자세한 내용**: [docs/VSCODE_COPILOT_USAGE.md](./docs/VSCODE_COPILOT_USAGE.md)

---

## 사용 예제

### 1. 고급 프로젝트 스캔

```bash
# 특정 프로젝트 스캔 (scan-advanced.js에서 PROJECT_NAME 수정)
yarn scan:advanced

# 점수 기반 상세 스캔
yarn scan:score
```

**스캔 내용:**
- ✅ Vue 파일 (*.vue)
- ✅ TypeScript 파일 (*.ts)
- ✅ gRPC 패키지 감지
- ✅ OpenAPI 패키지 감지
- ✅ openerd-nuxt3 컴포넌트 사용 분석
- ✅ Tailwind CSS 통합 확인
- ✅ API 사용 패턴 분석
- ✅ 프레임워크/라이브러리 분석
- ✅ 샘플 코드 수집
- ✅ **점수 자동 계산 (API 품질 + 컴포넌트 사용도)**

### 2. 점수 확인

```bash
# BestCase 목록 및 점수 조회
yarn test:scores
```

**출력 예시:**
```
🏆 Tier C (1 projects)
  50.dktechin/frontend
    Total: 30/100 | API: 40/100 | Component: 20/100

🌟 Top 5 Projects
1. 50.dktechin/frontend (Tier C)
   Total: 30/100 | API: 40/100 | Component: 20/100
```

### 2. BestCase 로드

```javascript
// 프로젝트 로드
const result = await bestcase.loadBestCase({
  projectName: '50.dktechin/frontend',
  category: 'auto-scan'
});

const bc = result.bestCases[0];

// API 정보
console.log(bc.patterns.apiInfo);
// { hasGrpc: false, hasOpenApi: true, apiType: 'OpenAPI' }

// 점수 정보
console.log(bc.patterns.scores);
// { total: 30, api: 40, component: 20, tier: 'C' }

// 컴포넌트 사용 정보
console.log(bc.patterns.componentUsage);
// { CommonTable: 0, CommonButton: 2, CommonLayout: 1, ... }
```

### 3. VS Code MCP 설정

`.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "code-mode": {
      "type": "http",
      "url": "http://localhost:3000/api/agent/execute",
      "name": "Code Mode Server"
    }
  }
}
```

## 프로젝트 구조

```
├── packages/
│   ├── bestcase-db/          # BestCase 저장소
│   ├── ai-bindings/          # API 바인딩
│   └── ai-runner/            # 샌드박스 실행기
├── mcp-servers/
│   ├── filesystem/           # 파일 시스템 API
│   └── bestcase/             # BestCase API
├── apps/
│   └── web/                  # Nuxt3 웹 인터페이스
├── scan-advanced.js          # 고급 스캐너
├── Dockerfile                # Docker 이미지
└── docker-compose.yml        # Docker Compose 설정
```

## API 엔드포인트

### POST /api/agent/execute

코드를 샌드박스에서 실행합니다.

**요청:**
```json
{
  "code": "const files = await filesystem.searchFiles({ path: '/projects', recursive: true }); console.log(files.files.length);",
  "timeoutMs": 30000
}
```

**응답:**
```json
{
  "ok": true,
  "logs": ["92638"],
  "output": null
}
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `HOST_PROJECTS_PATH` | 호스트 머신의 프로젝트 디렉토리 경로 (Docker 볼륨 마운트용) | `D:/01.Work/01.Projects` (Windows) |
| `PROJECTS_PATH` | 컨테이너 내부 프로젝트 디렉토리 경로 | `/projects` |
| `BESTCASE_STORAGE_PATH` | BestCase 저장 경로 | `/projects/.bestcases` |
| `DESIGN_SYSTEMS` | 감지할 디자인 시스템 목록 (쉼표로 구분) | `openerd-nuxt3,element-plus,vuetify,quasar,primevue,ant-design-vue,naive-ui` |
| `UTILITY_LIBRARIES` | 감지할 유틸리티 라이브러리 목록 (쉼표로 구분) | `vueuse,lodash,date-fns,axios,dayjs,openerd-nuxt3,element-plus,vuetify,quasar` |
| `NODE_ENV` | 실행 환경 | `production` |
| `OLLAMA_URL` | Ollama LLM 서버 URL | `http://ollama:11434` |
| `LLM_MODEL` | 사용할 LLM 모델 | `qwen2.5-coder:7b` |
| `CONCURRENCY` | 병렬 처리 동시성 수준 | `2` |
| **로컬 패키지 분석** | | |
| `LOCAL_PACKAGE_ANALYSIS_MODE` | 분석 모드 (unanalyzed, all, force) | `unanalyzed` |
| `GIT_USERNAME` | Git 인증 사용자명 (Private 저장소) | `` |
| `GIT_PASSWORD` | Git 인증 비밀번호 (Private 저장소) | `` |
| `GIT_TOKEN` | Git 인증 토큰 (Private 저장소, 권장) | `` |

## 스캔 결과 예시

### 03.nuxt3_starter

```
📊 통계:
  - Vue 파일: 4개
  - TS 파일: 11개
  - 컴포넌트: 0개
  - API 파일: 0개

🔧 API 정보:
  - gRPC: ✗
  - OpenAPI: ✗
  - 기타: axios

🎨 프레임워크:
  - Nuxt 3
  - TypeScript ✓
  - Pinia ✓
```

### 50.dktechin/frontend

```
📊 통계:
  - Vue 파일: 91개
  - TS 파일: 20,647개
  - 컴포넌트: 다수
  - API 파일: 다수

🔧 API 정보:
  - gRPC: ✗
  - OpenAPI: ✓ (@dktechin/openapi)

🎨 프레임워크:
  - Nuxt 3
  - TypeScript ✓
  - Pinia ✓
```

## 개발

### 새 MCP 서버 API 추가

1. `mcp-servers/<name>/index.ts` 생성
2. TypeScript 함수로 API 작성
3. `packages/ai-bindings/src/index.ts`에 export 추가
4. `yarn build:all`로 빌드

### 테스트

```bash
# 동적 지침 로딩 통합 테스트 ⭐ NEW
npm run test:guides

# YAML 파서 테스트
npm run test:yaml

# 단순 테스트
yarn test:simple

# 특정 프로젝트 테스트
yarn scan:target

# 전체 프로젝트 스캔
yarn scan:all
```

## 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 📚 문서

### 🌟 핵심 문서 (Anthropic MCP Code Mode 기반)

- **[docs/PROCESS_SUMMARY.md](./docs/PROCESS_SUMMARY.md)** - 📋 전체 프로세스 요약 ⭐ **시작하기 좋음**
- **[docs/WORKFLOW_CORRECT.md](./docs/WORKFLOW_CORRECT.md)** - 🎯 올바른 워크플로우 (5단계 상세 설명)
- **[docs/METADATA_SYSTEM.md](./docs/METADATA_SYSTEM.md)** - 🔑 메타데이터 추출 시스템
- **[docs/GUIDES_MCP_INTEGRATION.md](./docs/GUIDES_MCP_INTEGRATION.md)** - 📖 가이드 시스템 Sandbox API 통합

### 🚀 사용 가이드

- **[docs/VSCODE_COPILOT_USAGE.md](./docs/VSCODE_COPILOT_USAGE.md)** - 🎯 VSCode Copilot (Claude) 사용 가이드 ⭐ **실전 사용법**
  - 메타데이터 추출
  - BestCase 비교 및 작업 분류
  - 가이드 로드
  - 코드 생성
  - 실전 예시
  - 문제 해결

### 설정 가이드

- **[docs/MCP_SETUP_GUIDE.md](./docs/MCP_SETUP_GUIDE.md)** - Docker 및 VS Code MCP 설정
- **[docs/DOCKER_REBUILD_GUIDE.md](./docs/DOCKER_REBUILD_GUIDE.md)** - Docker 재빌드 가이드
- **[docs/VSCODE_MCP_GUIDE.md](./docs/VSCODE_MCP_GUIDE.md)** - VS Code 통합 상세 가이드

### 기타 문서

- **[docs/QUICK_START_OTHER_PROJECTS.md](./docs/QUICK_START_OTHER_PROJECTS.md)** - 다른 프로젝트에서 빠른 시작
- **[docs/WEEKLY_SCAN_GUIDE.md](./docs/WEEKLY_SCAN_GUIDE.md)** - 자동 주간 스캔 가이드
- **[docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md)** - 환경변수 설정 가이드

### Deprecated (참고용)

- **[docs/deprecated/SCORING_SYSTEM.md](./docs/deprecated/SCORING_SYSTEM.md)** - 점수 시스템 (메타데이터 시스템으로 대체됨)
- **[docs/deprecated/AI-SCORING-GUIDE.md](./docs/deprecated/AI-SCORING-GUIDE.md)** - AI 스코어링 가이드
- **[.github/instructions/default.instructions.md](./.github/instructions/default.instructions.md)** - AI 코딩 가이드라인

## 📚 참고

- [Anthropic - MCP Code Mode](https://www.anthropic.com/research/building-effective-agents)
- [Cloudflare - MCP Deep Dive](https://blog.cloudflare.com/mcp-deep-dive)
- [AI Sparkup - MCP Code Mode](https://aisparkup.com/articles/mcp-code-mode)

## 기여

이슈와 풀 리퀘스트를 환영합니다!


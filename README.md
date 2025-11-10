# MCP Code Mode Server

코드 실행 기반 MCP (Model Context Protocol) 서버로, 프로젝트 BestCase를 저장하고 토큰을 98% 절감합니다.

## 주요 기능

- 📁 **프로젝트 스캔**: Vue/TS 파일, gRPC/OpenAPI 자동 감지
- 💾 **BestCase 저장**: 프로젝트 패턴과 샘플 코드 저장
- 🤖 **AI 코드 분석**: Ollama LLM 기반 실제 코드 품질 측정 ⭐ NEW
- 🎯 **BestCase 자동 활용**: MCP를 통한 현재 프로젝트 패턴 자동 로드 ⭐ NEW
- 📊 **점수 시스템**: API 품질 + openerd-nuxt3 사용도 자동 평가 (0-100점, S/A/B/C/D 등급)
- 🚀 **토큰 최적화**: 코드 실행으로 중간 데이터 전송 제거 (98% 절감)
- 🔒 **샌드박스 실행**: vm2 기반 안전한 코드 실행
- 🐳 **Docker 배포**: VS Code MCP 연동 지원
- ⏰ **주간 자동 스캔**: 매주 일요일 02:00 AM 자동 실행 (66개 Nuxt 프로젝트)
- 🧹 **중복 관리**: 프로젝트별 최신 BestCase만 자동 유지

## 🎯 BestCase 자동 활용 (핵심 기능)

AI 코딩 에이전트가 **현재 프로젝트의 BestCase를 자동으로 로드**하여 코드를 생성합니다.

### 작동 원리

```typescript
// 사용자 요청: "상품 목록 페이지 만들어줘"

// AI가 자동으로 실행:
// 1. BestCase 로드
const bestCase = await loadCurrentProjectBestCase();
// → API 타입 확인: gRPC or OpenAPI?
// → 자주 쓰는 컴포넌트: CommonTable (15회)
// → 우수 사례 코드: composables/grpc.ts (88점)

// 2. openerd-nuxt3 확인
const component = await checkOpenerdNuxt3("CommonTable");
// → Props: list, headers, v-model:selected
// → Slots: header의 value를 slot name으로

const util = await checkOpenerdNuxt3("formatNumber");
// → 있으면: import from 'openerd-nuxt3/utils'
// → 없으면: 프로젝트에 새로 생성

// 3. BestCase + openerd-nuxt3 기반 코드 생성:
// - gRPC 클라이언트 자동 선택
// - CommonTable 우선 사용 (통계 기반)
// - openerd-nuxt3 Props/Slots 패턴 적용
// - openerd-nuxt3 유틸리티 우선 사용
// - 우수 사례 패턴 적용
```

### 장점

- ✅ **API 타입 자동 감지**: gRPC/OpenAPI 추측 불필요
- ✅ **프로젝트 패턴 준수**: 실제 사용 중인 컴포넌트 우선
- ✅ **openerd-nuxt3 우선 활용**: 컴포넌트/유틸리티 자동 확인
- ✅ **우수 사례 참고**: 85점 이상 코드를 템플릿으로 활용
- ✅ **일관성 유지**: 프로젝트 내 코딩 스타일 자동 적용

**상세 가이드**: [BestCase 활용 가이드](./.github/instructions/bestcase-usage.md)

## 빠른 시작

### 로컬 실행

```bash
# 의존성 설치
yarn install

# 프로젝트 빌드
yarn build:all

# 프로젝트 스캔
yarn scan:advanced

# 개발 서버 실행
yarn dev
```

### Docker 실행

```bash
# Docker 이미지 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

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
| `PROJECTS_PATH` | 프로젝트 디렉토리 경로 | `/projects` |
| `BESTCASE_STORAGE_PATH` | BestCase 저장 경로 | `/projects/.bestcases` |
| `NODE_ENV` | 실행 환경 | `production` |

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
# 단순 테스트
yarn test:simple

# 특정 프로젝트 테스트
yarn scan:target

# 전체 프로젝트 스캔
yarn scan:all
```

## 라이선스

MIT

## 문서

- **[AI_QUICK_START.md](./AI_QUICK_START.md)** - AI 기반 코드 분석 빠른 시작 ⭐ NEW
- **[AI_CODE_ANALYZER.md](./AI_CODE_ANALYZER.md)** - AI 분석 시스템 상세 설계 ⭐ NEW
- **[SCORING_SYSTEM.md](./SCORING_SYSTEM.md)** - 점수 시스템 상세 가이드
- **[AUTO_UPDATE_GUIDE.md](./AUTO_UPDATE_GUIDE.md)** - 자동 BestCase 업데이트 가이드
- **[MCP_SETUP_GUIDE.md](./MCP_SETUP_GUIDE.md)** - Docker 및 VS Code MCP 설정
- **[DOCKER_SETUP_COMPLETE.md](./DOCKER_SETUP_COMPLETE.md)** - Docker 설정 완료 가이드
- **[VSCODE_MCP_GUIDE.md](./VSCODE_MCP_GUIDE.md)** - VS Code 통합 상세 가이드
- **[COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md)** - 구현 요약
- **[.github/instructions/default.instructions.md](./.github/instructions/default.instructions.md)** - AI 코딩 가이드라인

## 참고

- [Anthropic - MCP Code Mode](https://www.anthropic.com/research/building-effective-agents)
- [Cloudflare - MCP Deep Dive](https://blog.cloudflare.com/mcp-deep-dive)
- [AI Sparkup - MCP Code Mode](https://aisparkup.com/articles/mcp-code-mode)
#   m c p - c o d e - m o d e  
 
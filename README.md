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
- 🔒 **안전한 실행**: vm2 샌드박스 격리
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

### 2. BestCase 관리

- **자동 저장**: 프로젝트 패턴, 샘플 코드, 점수 저장
- **스마트 로드**: 현재 프로젝트의 BestCase 자동 로드
- **버전 관리**: 타임스탬프 기반 버전 추적

### 3. 점수 시스템

- **API 품질** (0-100점): gRPC/OpenAPI 사용도 평가
- **컴포넌트 품질** (0-100점): openerd-nuxt3 활용도 평가
- **종합 점수**: API 40% + 컴포넌트 20% + 패턴 40%
- **티어 시스템**: S (90+), A (80-89), B (70-79), C (60-69), D (0-59)

### 4. 자동화

- **주간 스캔**: 매주 일요일 02:00 AM (66개 Nuxt 프로젝트)
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

### Docker 실행 (GPU 지원)

```bash
# 1. Docker 이미지 빌드 및 실행
docker-compose -f docker-compose.ai.yml up -d

# 2. GPU 사용 확인
docker exec ollama-code-analyzer nvidia-smi

# 3. 로그 확인
docker-compose logs -f mcp-code-mode-server

# 4. 중지
docker-compose down
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

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 문서

- **[docs/AI_QUICK_START.md](./docs/AI_QUICK_START.md)** - AI 기반 코드 분석 빠른 시작 ⭐ NEW
- **[docs/AI_CODE_ANALYZER.md](./docs/AI_CODE_ANALYZER.md)** - AI 분석 시스템 상세 설계 ⭐ NEW
- **[docs/SCORING_SYSTEM.md](./docs/SCORING_SYSTEM.md)** - 점수 시스템 상세 가이드
- **[docs/AUTO_UPDATE_GUIDE.md](./docs/AUTO_UPDATE_GUIDE.md)** - 자동 BestCase 업데이트 가이드
- **[docs/MCP_SETUP_GUIDE.md](./docs/MCP_SETUP_GUIDE.md)** - Docker 및 VS Code MCP 설정
- **[docs/DOCKER_SETUP_COMPLETE.md](./docs/DOCKER_SETUP_COMPLETE.md)** - Docker 설정 완료 가이드
- **[docs/VSCODE_MCP_GUIDE.md](./docs/VSCODE_MCP_GUIDE.md)** - VS Code 통합 상세 가이드
- **[docs/COMPLETION_SUMMARY.md](./docs/COMPLETION_SUMMARY.md)** - 구현 요약
- **[.github/instructions/default.instructions.md](./.github/instructions/default.instructions.md)** - AI 코딩 가이드라인

## 참고

- [Anthropic - MCP Code Mode](https://www.anthropic.com/research/building-effective-agents)
- [Cloudflare - MCP Deep Dive](https://blog.cloudflare.com/mcp-deep-dive)
- [AI Sparkup - MCP Code Mode](https://aisparkup.com/articles/mcp-code-mode)

## 기여

이슈와 풀 리퀘스트를 환영합니다!


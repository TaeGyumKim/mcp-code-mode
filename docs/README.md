# MCP Code Mode Starter - 프로젝트 가이드

> **Anthropic Code Mode 패턴 기반 메타데이터 분석 및 자동 가이드 시스템**

## 📚 문서 구조

### 🚀 시작하기 (필수!)

1. **[VSCODE_COPILOT_USAGE.md](./VSCODE_COPILOT_USAGE.md)** ⭐ - VSCode Copilot (Claude) 사용 가이드 (메인)
   - 프로젝트 API/타입 자동 감지
   - 메타데이터 기반 워크플로우
   - 실제 예시: memberManagement.vue 완성
2. **[VSCODE_MCP_GUIDE.md](./VSCODE_MCP_GUIDE.md)** - VSCode MCP 연동 설정
3. **[WEEKLY_SCAN_GUIDE.md](./WEEKLY_SCAN_GUIDE.md)** - 주간 자동 스캔 설정

### 📖 시스템 이해

1. **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Code Mode 개념 및 원리
   - 토큰 98% 절감 원리
   - 동적 가이드 로딩 시스템
2. **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)** - 메타데이터 시스템 상세
   - 메타데이터 추출 프로세스
   - 점수 계산 알고리즘 (S/A/B/C/D)
3. **[WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md)** - 올바른 워크플로우
   - 사용자 요청 → 코드 생성 전체 과정
   - Sandbox API 사용법

### 🎨 디자인 시스템 & 유틸리티

1. **[DESIGN_SYSTEM_USAGE.md](./DESIGN_SYSTEM_USAGE.md)** ⭐ - 디자인 시스템 자동 감지
   - 7개 주요 UI 프레임워크 지원
   - 컴포넌트 일관성 유지
2. **[UTILITY_LIBRARY_USAGE.md](./UTILITY_LIBRARY_USAGE.md)** ⭐ - 유틸리티 라이브러리 활용
   - 9개 라이브러리 자동 감지
   - 함수/composables 매핑
3. **[LOCAL_PACKAGES.md](./LOCAL_PACKAGES.md)** ⭐ - 로컬 패키지 시스템
   - AI 자동 분석
   - Git URL, node_modules, 로컬 경로 지원
   - Docker 서비스 격리

### 🔧 설정 및 운영

1. **[MCP_SETUP_GUIDE.md](./MCP_SETUP_GUIDE.md)** - MCP 서버 설정
2. **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)** - 프로덕션 배포 가이드
3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - 프로젝트 구조 설명

### 📚 참고 문서

1. **[BESTCASE_PRIORITY_GUIDE.md](./BESTCASE_PRIORITY_GUIDE.md)** - BestCase 우선순위 전략
2. **[BESTCASE_RULES_SUMMARY.md](./BESTCASE_RULES_SUMMARY.md)** - BestCase 규칙 요약
3. **[GUIDES_MCP_INTEGRATION.md](./GUIDES_MCP_INTEGRATION.md)** - 가이드 MCP 통합 설명

### 📂 기타

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - 프로젝트 계획 (초기 버전)
- **[deprecated/](./deprecated/)** - 구 버전 문서들

## 🎯 핵심 개념

### Code Mode란?

**전통적인 MCP**:
```
LLM → Tool Call (read_file) → Server → 500KB Data → LLM
→ 150,000 토큰 소비
```

**Code Mode** (본 프로젝트):
```
LLM → execute(code) → Sandbox에서 처리 → 10행 결과 → LLM
→ 2,000 토큰 소비 (98% 절감)
```

### 아키텍처

```
┌─────────────────┐
│  MCP STDIO      │  단일 execute tool
│  Server         │
└────────┬────────┘
         │
    ┌────▼──────┐
    │  vm2      │  TypeScript 코드 실행
    │  Sandbox  │
    └────┬──────┘
         │
    ┌────▼───────────┐
    │  API Bindings  │  filesystem, bestcase
    └────┬───────────┘
         │
    ┌────▼──────┐
    │  Storage  │  BestCase JSON 파일
    └───────────┘
```

## 📊 주요 기능

### 1. 자동 프로젝트 컨텍스트 ⭐ NEW

- **자동 추출**: execute 응답에 프로젝트 정보 자동 포함
- **API 타입 감지**: gRPC, OpenAPI, REST, Mixed 자동 구분
- **디자인 시스템 감지**: 7개 주요 UI 프레임워크 자동 인식
- **유틸리티 라이브러리**: 9개 라이브러리 자동 감지
- **권장 플랜**: 프로젝트 상태 기반 다음 단계 제안

### 2. 로컬 패키지 시스템 ⭐ NEW

- **3가지 소스**: Git URL, node_modules, 로컬 경로 지원
- **AI 분석**: Ollama LLM이 컴포넌트/함수 자동 추출
- **Docker 격리**: 별도 컨테이너에서 무거운 작업 수행
- **자동 스케줄링**: 매일 자정 미분석, 주간 재분석

### 3. BestCase 관리

- **자동 스캔**: Vue/TS 파일, API 타입, 컴포넌트 사용 패턴 추출
- **AI 분석**: Ollama + GPU 기반 코드 품질 측정
- **점수 시스템**: API 40% + 컴포넌트 20% + 패턴 40%
- **티어 분류**: S (90+), A (80-89), B (70-79), C (60-69), D (0-59)

### 4. 토큰 최적화

- **샌드박스 실행**: vm2로 격리된 환경에서 TypeScript 실행
- **중간 데이터 격리**: 파일 읽기/필터링을 샌드박스 내부에서 처리
- **최종 결과만 반환**: 98% 토큰 절감 달성

### 5. 자동화

- **주간 스캔**: 매주 일요일 02:00 AM 자동 실행
- **로컬 패키지 분석**: 매일 자정 자동 분석
- **중복 제거**: 프로젝트별 최신 BestCase만 유지
- **GPU 활용**: NVIDIA GPU로 AI 분석 병렬 처리

## 🚀 빠른 시작

### 로컬 실행

```bash
# 1. 설치
yarn install

# 2. 빌드
yarn build:all

# 3. 스캔
yarn scan:advanced

# 4. 점수 확인
yarn test:scores
```

### Docker 실행

```bash
# 1. GPU 지원 Docker 실행
docker-compose -f docker-compose.ai.yml up -d

# 2. GPU 확인
docker exec ollama-code-analyzer nvidia-smi

# 3. 로그 확인
docker-compose logs -f
```

## 📁 BestCase 예시

```json
{
  "id": "50.dktechin-frontend-auto-scan-ai-1762517275487",
  "projectName": "50.dktechin/frontend",
  "category": "auto-scan-ai",
  "patterns": {
    "apiInfo": {
      "hasGrpc": false,
      "hasOpenApi": true,
      "apiType": "OpenAPI"
    },
    "scores": {
      "final": 50,
      "api": 40,
      "component": 20,
      "tier": "C"
    },
    "aiAnalysis": {
      "averageScore": 51.6,
      "topFiles": [
        { "path": "grpc.ts", "score": 55 }
      ]
    }
  }
}
```

## 🔧 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **언어** | TypeScript 5.9 |
| **런타임** | Node.js 20+ |
| **패키지 매니저** | Yarn 4.9.1 Berry |
| **샌드박스** | vm2 |
| **AI 분석** | Ollama (qwen2.5-coder:1.5b) |
| **GPU** | NVIDIA CUDA |
| **컨테이너** | Docker + Docker Compose |
| **프로토콜** | MCP (Model Context Protocol) |

## 📈 성능

- **토큰 절감**: 98% (150,000 → 2,000 토큰)
- **스캔 속도**: 중형 프로젝트 40-60초
- **GPU 활용**: 84% Compute 사용률
- **병렬 처리**: 3 workers 동시 실행

## 🎓 학습 자료

### 공식 문서

- [Cloudflare - Code Mode](https://blog.cloudflare.com/code-mode/)
- [Anthropic - Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### 프로젝트 문서

1. **초급**: README.md → USAGE_GUIDE.md → QUICK_START_OTHER_PROJECTS.md
2. **중급**: deprecated/SCORING_SYSTEM.md → deprecated/AI-SCORING-GUIDE.md → WEEKLY_SCAN_GUIDE.md
3. **고급**: MCP_SETUP_GUIDE.md → VSCODE_MCP_GUIDE.md → default.instructions.md

## 🐛 문제 해결

### 빌드 에러

```bash
# vm2 타입 정의 누락
→ packages/ai-runner/src/vm2.d.ts 확인

# 모듈 해석 실패
→ 상대 경로 import 사용 (../../packages/...)

# BestCase ID에 슬래시
→ projectName.replace(/\//g, '-')
```

### Docker 문제

```bash
# GPU 미사용
→ docker exec ollama-code-analyzer nvidia-smi

# 컨테이너 재시작
→ CMD ["tail", "-f", "/dev/null"]

# 볼륨 권한
→ :ro 제거, read-write로 변경
```

## 🤝 기여

이슈와 PR을 환영합니다!

## 📄 라이선스

MIT License - [LICENSE](../LICENSE) 참조

---

**더 자세한 내용은 각 문서를 참조하세요.**

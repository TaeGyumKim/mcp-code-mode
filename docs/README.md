# MCP Code Mode Starter - 프로젝트 가이드

> **Code Mode 패턴 기반 MCP 서버 - 종합 가이드**

## 📚 문서 구조

이 프로젝트는 다음 핵심 문서들로 구성되어 있습니다:

### 시작하기

- **[README.md](../README.md)** - 프로젝트 개요, 빠른 시작, 주요 기능
- **[TYPESCRIPT_MIGRATION.md](../TYPESCRIPT_MIGRATION.md)** - TypeScript 마이그레이션 완료 가이드
- **[.github/instructions/default.instructions.md](../.github/instructions/default.instructions.md)** - AI 코딩 가이드라인

### 시스템 설계

1. **[AI_CODE_ANALYZER.md](./AI_CODE_ANALYZER.md)** - Ollama LLM + GPU 기반 AI 분석 시스템
2. **[SCORING_SYSTEM.md](./SCORING_SYSTEM.md)** - BestCase 점수 시스템 (S/A/B/C/D 티어)
3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - 프로젝트 구조 상세 설명

### 배포 및 운영

1. **[DOCKER_SETUP_COMPLETE.md](./DOCKER_SETUP_COMPLETE.md)** - Docker 배포 가이드
2. **[MCP_SETUP_GUIDE.md](./MCP_SETUP_GUIDE.md)** - MCP 서버 설정
3. **[VSCODE_MCP_GUIDE.md](./VSCODE_MCP_GUIDE.md)** - VS Code 통합 가이드

### 자동화

1. **[AUTO_UPDATE_GUIDE.md](./AUTO_UPDATE_GUIDE.md)** - BestCase 자동 업데이트
2. **[WEEKLY_SCAN_GUIDE.md](./WEEKLY_SCAN_GUIDE.md)** - 주간 자동 스캔 설정
3. **[AI_AUTO_SCAN_GUIDE.md](./AI_AUTO_SCAN_GUIDE.md)** - AI 기반 자동 스캔

### 사용 가이드

1. **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - 기본 사용법
2. **[BESTCASE_PRIORITY_GUIDE.md](./BESTCASE_PRIORITY_GUIDE.md)** - BestCase 우선순위 전략
3. **[AI_QUICK_START.md](./AI_QUICK_START.md)** - AI 분석 빠른 시작

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

### 1. BestCase 관리

- **자동 스캔**: Vue/TS 파일, API 타입, 컴포넌트 사용 패턴 추출
- **AI 분석**: Ollama + GPU 기반 코드 품질 측정
- **점수 시스템**: API 40% + 컴포넌트 20% + 패턴 40%
- **티어 분류**: S (90+), A (80-89), B (70-79), C (60-69), D (0-59)

### 2. 토큰 최적화

- **샌드박스 실행**: vm2로 격리된 환경에서 TypeScript 실행
- **중간 데이터 격리**: 파일 읽기/필터링을 샌드박스 내부에서 처리
- **최종 결과만 반환**: 98% 토큰 절감 달성

### 3. 자동화

- **주간 스캔**: 매주 일요일 02:00 AM 자동 실행
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

1. **초급**: README.md → USAGE_GUIDE.md → AI_QUICK_START.md
2. **중급**: SCORING_SYSTEM.md → AI_CODE_ANALYZER.md → AUTO_UPDATE_GUIDE.md
3. **고급**: DOCKER_SETUP_COMPLETE.md → VSCODE_MCP_GUIDE.md → default.instructions.md

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

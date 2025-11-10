# AI 기반 코드 품질 분석 시스템 - 빠른 시작 가이드

## 개요

기존의 키워드 기반 점수 시스템을 **AI 기반 실제 코드 품질 분석**으로 전환합니다.

### 기존 시스템의 문제점

❌ **단순 키워드 매칭**
- `hasOpenApi` → package.json에 패키지 있으면 무조건 점수
- 실제로 잘 사용하는지는 체크 안함

❌ **컴포넌트 사용 횟수만 카운트**
- `v-model` 있으면 점수 부여
- script에서 제대로 처리하는지 확인 안함

❌ **우수 코드 발견 불가**
- 전체 점수 낮아도 특정 부분 뛰어난 경우 놓침

### 새로운 AI 시스템

✅ **실제 코드 품질 측정**
- API 연결이 타입 안전하게 되어있는지 분석
- 에러 핸들링, 로딩 상태 관리 체크
- gRPC interceptor 제대로 구현했는지 검증

✅ **컴포넌트 바인딩 품질**
- `v-model` 사용 시 script에서 watch/computed 처리 확인
- CommonToFromPicker + dateTerm → validation, API 호출 로직 체크
- Props 타입 정의, emit 핸들링 검증

✅ **부분 우수성 발견**
- 파일별 점수 부여 (0-100)
- 85점 이상 코드 스니펫 자동 추출
- 카테고리별 BestCase 생성 (excellent-error-handling, excellent-v-model-binding 등)

## 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   MCP Server     │────────>│  Ollama Server   │          │
│  │  (Node.js)       │  HTTP   │  (LLM Runtime)   │          │
│  │                  │<────────│  qwen2.5-coder   │          │
│  └──────────────────┘         └──────────────────┘          │
│         │                              │                     │
│         v                              v                     │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  BestCase DB     │         │  Model Storage   │          │
│  │  (.bestcases/)   │         │  (7B parameters) │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 설치 및 실행

### Step 1: Ollama Docker 컨테이너 시작

```powershell
# Docker Compose로 Ollama 서버 시작
docker-compose -f docker-compose.ai.yml up -d

# 컨테이너 상태 확인
docker ps
```

**예상 출력:**
```
CONTAINER ID   IMAGE                  STATUS         PORTS
abc123...      ollama/ollama:latest   Up 30 seconds  0.0.0.0:11434->11434/tcp
def456...      mcp-code-mode-starter  Up 30 seconds
```

### Step 2: 코드 분석 모델 다운로드

**PowerShell (Windows):**
```powershell
.\init-ollama.ps1
```

**Bash (Linux/Mac):**
```bash
chmod +x init-ollama.sh
./init-ollama.sh
```

**다운로드되는 모델:**
- `qwen2.5-coder:7b` (4.7GB) - 추천, 최신 코드 분석 모델
- `deepseek-coder:6.7b` (3.8GB) - 코드 분석 특화
- `codellama:7b` (3.8GB) - Meta의 코드 LLM

⚠️ **주의**: 총 12GB 정도 다운로드되므로 시간이 걸릴 수 있습니다 (10-20분).

### Step 3: LLM Analyzer 패키지 빌드

```bash
# llm-analyzer 패키지 빌드
yarn workspace llm-analyzer run build

# 또는 전체 빌드
yarn build:all
```

### Step 4: Ollama 서버 테스트

```bash
# 모델 목록 확인
docker exec ollama-code-analyzer ollama list

# 간단한 테스트
docker exec -it ollama-code-analyzer ollama run qwen2.5-coder:7b "What is TypeScript?"
```

## 사용 방법

### 개별 프로젝트 AI 분석

```bash
# scan-ai-powered.js 파일에서 PROJECT_NAME 수정
yarn scan:ai
```

**분석 내용:**
1. **API 연결 품질 (0-100점)**
   - Type Safety (0-30): TypeScript 인터페이스, 제네릭, 타입 가드
   - Error Handling (0-30): try-catch, 인터셉터, 에러 메시지
   - Best Practices (0-40): 로딩 상태, 요청 취소, 인증 처리

2. **컴포넌트 바인딩 품질 (0-100점)**
   - v-model Usage (0-30): ref 선언, 양방향 바인딩, 타입 안전성
   - Event Handling (0-30): watch/computed, 이벤트 emitter, 부작용 처리
   - Component Integration (0-40): Props 타입, openerd-nuxt3 사용, 데이터 흐름

3. **우수 코드 발견**
   - 85점 이상 코드 스니펫 자동 추출
   - 카테고리별 분류 (error-handling, v-model-binding, api-integration 등)
   - 재사용 가능 패턴 식별

### AI 분석 결과 예시

```json
{
  "filePath": "composables/grpc.ts",
  "category": "api",
  "score": 92,
  "breakdown": {
    "typeSafety": 28,
    "errorHandling": 30,
    "bestPractices": 34
  },
  "apiType": "grpc",
  "strengths": [
    "Excellent error interceptor with retry logic",
    "Comprehensive type definitions",
    "Proper loading state management"
  ],
  "weaknesses": [
    "Missing request cancellation"
  ],
  "excellentCode": {
    "exists": true,
    "lines": "45-78",
    "description": "Perfect gRPC error interceptor implementation"
  },
  "recommendations": [
    "Add AbortController for request cancellation",
    "Consider adding request caching"
  ]
}
```

**컴포넌트 분석 예시:**

```json
{
  "filePath": "pages/faqManagement.vue",
  "score": 85,
  "vModelBindings": [
    {
      "name": "dateTerm",
      "component": "CommonToFromPicker",
      "quality": 90,
      "hasWatch": true,
      "hasValidation": true,
      "hasTypeDefinition": true,
      "recommendation": "Perfect implementation"
    }
  ],
  "componentsUsed": ["CommonToFromPicker", "CommonPaginationTable", "CommonButton"],
  "composablesUsed": ["usePaging", "useBackendClient"],
  "excellentPatterns": [
    "Proper watch usage for dateTerm with debounce",
    "Type-safe ref initialization",
    "Excellent error handling with useModalState"
  ],
  "issues": [],
  "excellentCode": {
    "exists": true,
    "lines": "25-55",
    "description": "Perfect v-model binding with watch, validation, and API integration"
  }
}
```

## BestCase 자동 생성

AI 분석 결과를 바탕으로 카테고리별 BestCase가 자동 생성됩니다:

```
.bestcases/
├── 50.dktechin-frontend-excellent-error-handling-*.json
├── 50.dktechin-frontend-excellent-v-model-binding-*.json
├── 50.dktechin-frontend-excellent-api-integration-*.json
└── 50.dktechin-frontend-excellent-type-safety-*.json
```

**BestCase 구조:**

```json
{
  "projectName": "50.dktechin/frontend",
  "category": "excellent-error-handling",
  "description": "Excellent error handling patterns from 50.dktechin/frontend",
  "files": [
    {
      "path": "composables/grpc.ts",
      "content": "// 실제 코드...",
      "purpose": "Perfect error interceptor implementation",
      "score": 95,
      "lines": "45-78"
    }
  ],
  "patterns": {
    "aiAnalysis": {
      "overallScore": 95,
      "category": "error-handling",
      "strengths": [
        "Comprehensive retry logic",
        "User-friendly error messages",
        "Proper error logging"
      ],
      "usageContext": "When implementing gRPC error handling with retry",
      "reusable": true,
      "tags": ["error-handling", "grpc", "retry", "interceptor"]
    }
  }
}
```

## 성능 및 비용

### Ollama (로컬 LLM)

**장점:**
- ✅ 완전 무료
- ✅ 오프라인 동작
- ✅ 코드 유출 없음 (보안)
- ✅ API 호출 제한 없음

**요구사항:**
- GPU: NVIDIA RTX 3060 이상 (권장)
- RAM: 16GB 이상
- 디스크: 15GB (모델 저장)

**성능:**
- 파일당 분석 시간: 5-15초
- 66개 프로젝트 전체: 약 30-60분

### Claude API (대안)

**장점:**
- ✅ 매우 빠름 (2-3초/파일)
- ✅ 정확도 높음
- ✅ GPU 불필요

**단점:**
- ❌ 비용 발생 ($0.003/1K tokens)
- ❌ API 키 필요
- ❌ 네트워크 필요

**예상 비용:**
- 파일당: ~$0.01
- 66개 프로젝트 (1,000 파일): ~$10

## 하이브리드 방식 (권장)

```typescript
// 기본: Ollama (무료, 느림)
// 정밀 분석: Claude (유료, 빠름)

async function smartAnalysis(file) {
  // 1. 빠른 필터링 (Ollama)
  const quick = await ollamaQuickClassify(file);
  
  if (!quick.worthDeepAnalysis) {
    return quick; // 간단한 파일은 Ollama로만
  }
  
  // 2. 중요 파일은 Claude로 정밀 분석
  if (file.score > 80 || file.category === 'critical') {
    return await claudeDeepAnalysis(file);
  }
  
  // 3. 나머지는 Ollama
  return await ollamaDeepAnalysis(file);
}
```

## 문제 해결

### Ollama 서버 연결 실패

```bash
# 컨테이너 로그 확인
docker logs ollama-code-analyzer

# 컨테이너 재시작
docker-compose -f docker-compose.ai.yml restart ollama
```

### 모델 다운로드 실패

```bash
# 수동으로 모델 다운로드
docker exec ollama-code-analyzer ollama pull qwen2.5-coder:7b
```

### 분석 속도가 너무 느림

**GPU 사용 확인:**
```bash
# NVIDIA GPU 사용 여부 확인
docker exec ollama-code-analyzer nvidia-smi

# GPU 없으면 CPU로 동작 (매우 느림)
```

**해결책:**
1. GPU 서버로 이동
2. Claude API 사용 (유료)
3. 중요 파일만 선택 분석

## 다음 단계

1. **Ollama 설치 및 모델 다운로드** ← 지금 여기
2. **llm-analyzer 패키지 완성**
3. **AI 스캔 스크립트 구현**
4. **BestCase 자동 생성 로직**
5. **auto-scan-projects.js에 통합**
6. **성능 최적화 (캐싱, 병렬 처리)**

## 참고 자료

- [Ollama 공식 문서](https://github.com/ollama/ollama)
- [qwen2.5-coder 모델](https://ollama.com/library/qwen2.5-coder)
- [deepseek-coder 모델](https://ollama.com/library/deepseek-coder)
- [Claude API 문서](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

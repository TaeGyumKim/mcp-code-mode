# AI Code Quality Scoring Guide

## 📊 현재 시스템 개요

**목적**: 프로젝트 코드를 AI로 분석하여 실제 품질 점수를 측정하고 BestCase로 저장

**핵심 개선사항**:
- ❌ 기존: 키워드 기반 단순 점수 (부정확)
- ✅ 신규: Ollama LLM + GPU를 활용한 실제 코드 품질 분석

---

## 🤖 AI 분석 시스템

### LLM 설정

```yaml
Model: deepseek-r1:1.5b
Provider: Ollama
GPU: NVIDIA GeForce GTX 1060 6GB
Concurrency: 3 (병렬 처리)
Context: 4096 tokens
```

### 성능 지표

```
평균 분석 속도: 10-14초/파일
병렬 처리: 3 파일 동시 분석
GPU 사용률: 100% (추론 순간)
예상 완료 시간: 2-3시간 (66개 프로젝트)
```

---

## 📋 점수 체계

### 1. API 파일 분석 (TypeScript/JavaScript)

**총점: 100점**

| 항목 | 배점 | 평가 기준 |
|------|------|-----------|
| **Code Readability** | 0-25 | - 명명 규칙 (변수, 함수명)<br>- 코드 포맷팅<br>- 주석 품질<br>- 이해 용이성 |
| **Code Structure** | 0-25 | - 함수 크기 적정성<br>- 책임 분리 (SRP)<br>- 모듈화<br>- 코드 조직 |
| **Type Safety** | 0-20 | - TypeScript 타입 정의<br>- any 사용 최소화<br>- 인터페이스 활용<br>- 타입 추론 |
| **Error Handling** | 0-15 | - try-catch 사용<br>- 에러 검증<br>- 예외 처리<br>- 안전성 |
| **Best Practices** | 0-15 | - 모던 문법 (ES6+)<br>- async/await 사용<br>- 불변성<br>- 코드 중복 제거 |

**프롬프트 예시**:
```javascript
// Input: agency.ts 파일 (50줄)
export async function getAgencies(customerId: number) {
  const user = useUserStore();
  const result = await user
    .createAxiosInstance(true)
    .get(`/customers/${customerId}/agencies`);
  
  if (result.status < 400) {
    return result.data;
  } else {
    return null;
  }
}

// AI 분석 요청
"Evaluate this API code quality (0-100 total):
1. Code Readability (0-25): naming, formatting, clarity
2. Code Structure (0-25): function size, separation
3. Type Safety (0-20): TypeScript usage
4. Error Handling (0-15): try-catch, validation
5. Best Practices (0-15): modern syntax, async/await"

// AI 응답 (JSON)
{
  "score": 65,
  "breakdown": {
    "readability": 20,    // 명명 양호, 포맷팅 일관적
    "structure": 15,      // 함수 단순, 중복 코드 존재
    "typeSafety": 12,     // TypeScript 사용하지만 AxiosResponse any
    "errorHandling": 10,  // status 체크만, try-catch 없음
    "bestPractices": 8    // async/await 사용, 하지만 에러 처리 부족
  },
  "strengths": [
    "Clean async/await syntax",
    "Consistent naming conventions"
  ],
  "weaknesses": [
    "Missing try-catch blocks",
    "AxiosResponse type not specific",
    "Repeated error handling pattern"
  ],
  "recommendations": [
    "Add try-catch for network errors",
    "Create generic error handler function",
    "Define specific response types"
  ]
}
```

---

### 2. Vue Component 분석

**총점: 100점**

| 항목 | 배점 | 평가 기준 |
|------|------|-----------|
| **Code Readability** | 0-25 | - 템플릿 구조<br>- 스크립트 가독성<br>- 명명 규칙<br>- 주석 |
| **Component Structure** | 0-25 | - 컴포넌트 크기<br>- 재사용성<br>- props/emits 구조<br>- 조직화 |
| **Data Management** | 0-20 | - ref/reactive 사용<br>- 데이터 흐름<br>- 상태 관리<br>- 반응성 |
| **Event Handling** | 0-15 | - 이벤트 리스너<br>- emit 패턴<br>- 검증<br>- 에러 처리 |
| **Best Practices** | 0-15 | - Composition API<br>- TypeScript<br>- <script setup><br>- 성능 최적화 |

**프롬프트 예시**:
```vue
<!-- Input: BrandManagement.vue -->
<template>
  <div class="brand-management">
    <CommonTable :headers="headers" :items="brands" @edit="handleEdit" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Brand } from '~/types';

const brands = ref<Brand[]>([]);
const headers = [
  { title: '브랜드명', value: 'name' },
  { title: '등록일', value: 'createdAt' }
];

function handleEdit(brand: Brand) {
  navigateTo(`/brands/${brand.id}`);
}
</script>

// AI 분석 요청
"Evaluate this Vue component quality (0-100 total):
1. Code Readability (0-25): template structure, naming
2. Component Structure (0-25): size, reusability
3. Data Management (0-20): ref/reactive, data flow
4. Event Handling (0-15): listeners, emits
5. Best Practices (0-15): Composition API, TypeScript"

// AI 응답
{
  "score": 60,
  "breakdown": {
    "readability": 18,      // 깔끔한 템플릿, 명명 일관적
    "structure": 15,        // 단순 구조, 재사용성 보통
    "dataManagement": 12,   // ref 사용, 하지만 초기화 없음
    "eventHandling": 8,     // @edit 핸들러만, 에러 처리 없음
    "bestPractices": 7      // <script setup>, TypeScript 사용
  },
  "strengths": [
    "Uses Composition API with <script setup>",
    "TypeScript type definitions"
  ],
  "weaknesses": [
    "No data loading logic",
    "Missing error handling in handleEdit",
    "brands array not initialized"
  ],
  "recommendations": [
    "Add onMounted to load brands",
    "Implement try-catch in handleEdit",
    "Add loading and error states"
  ]
}
```

---

## 🎯 최종 점수 계산

### 통합 점수 공식

```javascript
// 1. Pattern Score (기존 키워드 분석)
patternScore = (apiPatternScore * 0.35 + componentPatternScore * 0.20) / 0.55 * 100

// 2. AI Score (신규 LLM 분석)
aiScore = average(allFileScores)

// 3. Final Score (AI 60% + Pattern 40%)
finalScore = aiScore * 0.6 + patternScore * 0.4
```

### 점수 분포 예시

```
00.common/frontend_work-dir:
  - Pattern Score: 28/100 (API=35, Component=20)
  - AI Score: 61.7/100 (3 files analyzed)
  - Final Score: 48/100 (61.7*0.6 + 28*0.4)

00.luxurypanda-v2/frontend:
  - Pattern Score: 18/100 (API=35, Component=0)
  - AI Score: 65.0/100 (16 files analyzed)
  - Final Score: 46/100 (65.0*0.6 + 18*0.4)

00.luxurypanda-v2/frontend-admin:
  - Pattern Score: 28/100 (API=35, Component=20)
  - AI Score: 64.0/100 (21 files analyzed)
  - Final Score: 50/100 (64.0*0.6 + 28*0.4)
```

---

## 📁 BestCase 저장 구조

### 파일 위치
```
D:/01.Work/01.Projects/.bestcases/
├── {projectName}-{category}-{timestamp}.json
├── 00.common-frontend_work-dir-auto-scan-ai-1762509089147.json
├── 00.luxurypanda-v2-frontend-auto-scan-ai-1762509161269.json
└── ...
```

### JSON 구조
```json
{
  "id": "00.common-frontend_work-dir-auto-scan-ai-1762509089147",
  "projectName": "00.common/frontend_work-dir",
  "category": "auto-scan-ai",
  "description": "Auto scan with AI code quality analysis",
  "files": [
    {
      "path": "composables/grpc.ts",
      "content": "...",
      "purpose": "gRPC client setup"
    }
  ],
  "patterns": {
    "stats": {
      "totalFiles": 8,
      "vueFiles": 2,
      "tsFiles": 6
    },
    "apiInfo": {
      "hasGrpc": true,
      "hasOpenApi": false
    },
    "aiAnalysis": {
      "filesAnalyzed": 3,
      "averageScore": 61.7,
      "excellentFiles": 0,
      "breakdown": {
        "grpc.ts": {
          "score": 65,
          "readability": 20,
          "structure": 15,
          "typeSafety": 12,
          "errorHandling": 10,
          "bestPractices": 8
        },
        "index.vue": {
          "score": 60,
          "readability": 18,
          "structure": 15,
          "dataManagement": 12,
          "eventHandling": 8,
          "bestPractices": 7
        }
      }
    }
  },
  "metadata": {
    "createdAt": "2025-11-07T09:51:29.147Z",
    "updatedAt": "2025-11-07T09:51:29.147Z",
    "tags": ["nuxt3", "typescript", "ai-analyzed"]
  }
}
```

---

## 🔧 실행 가이드

### Docker 환경 시작

```bash
# 1. GPU 설정 확인
nvidia-smi

# 2. Docker Compose 시작 (CONCURRENCY=3)
docker-compose -f docker-compose.ai.yml up -d

# 3. GPU 인식 확인
docker logs ollama-code-analyzer 2>&1 | Select-String "GeForce"
# 출력: NVIDIA GeForce GTX 1060 6GB

# 4. AI 분석 시작
docker exec -it mcp-code-mode-server node auto-scan-projects-ai.js

# 5. 진행 상황 모니터링
docker logs -f mcp-code-mode-server
```

### 수동 분석 (특정 프로젝트)

```bash
# packages/llm-analyzer 빌드
yarn workspace llm-analyzer run build

# 테스트 실행
node run-ai-analysis.js
```

### GPU 모니터링

```powershell
# 실시간 GPU 사용률 확인 (2초 간격)
while ($true) {
  Clear-Host
  nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,temperature.gpu --format=csv,noheader
  Write-Host "`n$(Get-Date -Format 'HH:mm:ss') - Monitoring..."
  Start-Sleep -Seconds 2
}
```

---

## 🎓 프롬프트 간소화 이력

### 변경 전 (복잡한 아키텍처 분석)
```
API 분석:
1. Type Safety & API Design (0-30)
2. Code Structure & Organization (0-25)
3. Dependency Management & Coupling (0-20)
4. Error Handling & Validation (0-30)
5. Code Cohesion & Flow (0-15)

Component 분석:
1. Data Binding & Reactivity (0-25)
2. Event Handling & Validation (0-25)
3. Component Integration (0-30)
4. Template-Script Cohesion (0-20)
```

### 변경 후 (코드 품질 중심)
```
API 분석:
1. Code Readability (0-25)
2. Code Structure (0-25)
3. Type Safety (0-20)
4. Error Handling (0-15)
5. Best Practices (0-15)

Component 분석:
1. Code Readability (0-25)
2. Component Structure (0-25)
3. Data Management (0-20)
4. Event Handling (0-15)
5. Best Practices (0-15)
```

**개선 효과**:
- 프롬프트 길이: 50% 감소 (120줄 → 60줄)
- 코드 크기: 22% 감소 (7.83KB → 6.07KB)
- 명확성: 향상 (아키텍처 → 코드 품질)
- 점수 일관성: 개선

---

## 📈 성능 최적화

### GPU 병렬 처리 검증

```
CONCURRENCY=1: 4.7초/파일 (최적, 권장)
CONCURRENCY=2: 5.0초/파일 (안정)
CONCURRENCY=3: 6.0초/파일 (안정하지만 느림)

권장 설정: CONCURRENCY=1 (가장 빠르고 안전)
현재 설정: CONCURRENCY=3 (병렬 처리 시연용)
```

### GPU 사용 패턴

```
DeepSeek-R1:1.5b 특성:
- 모델 크기: 1.1GB (매우 작음)
- 추론 속도: 70-172 tokens/s
- GPU 사용 시간: 0.2-0.5초/파일 (순간적)

작업 관리자에서 GPU 사용률이 낮게 보이는 이유:
1. 추론이 너무 빠름 (0.2초)
2. 샘플링 간격이 김 (1-2초)
3. 실제로는 100% GPU 사용 중 (ollama ps 확인)
```

### 확인 명령어

```bash
# Ollama가 GPU 사용 중인지 확인
docker exec ollama-code-analyzer ollama ps
# 출력: PROCESSOR: 100% GPU ✅

# GPU 프로세스 확인
docker exec ollama-code-analyzer nvidia-smi
# 출력: /ollama (PID 138) 1666MiB ✅
```

---

## 🚀 다음 단계

### 1. 분석 완료 후
- BestCase 파일 검토: `D:/01.Work/01.Projects/.bestcases/`
- 우수 코드 확인: 85점 이상 파일 리스트
- 점수 분포 분석: 프로젝트별 평균 점수

### 2. 개선 방향
- 프롬프트 미세 조정: 도메인 특화 평가 기준 추가
- 모델 업그레이드: deepseek-r1:7b (더 정확한 분석)
- 배치 크기 최적화: CONCURRENCY 조정

### 3. 자동화
- Cron 스케줄: 6시간마다 자동 스캔
- 점수 변화 추적: 시간별 품질 추이 분석
- 알림: 점수 하락 시 자동 알림

---

**생성 시간**: 2025-11-07  
**작성자**: AI Code Quality Analyzer  
**버전**: 1.0.0

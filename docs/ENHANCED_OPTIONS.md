# Enhanced Cache, Threshold, and Keyword Options

이 문서는 개선된 캐시 관리, 임계값 설정, 그리고 키워드 커스터마이징 기능에 대해 설명합니다.

## 목차

1. [LRU 캐시 및 환경 변수 설정](#lru-캐시-및-환경-변수-설정)
2. [차원별 임계값 설정](#차원별-임계값-설정)
3. [사용자 정의 키워드](#사용자-정의-키워드)
4. [결과 설명 및 가시성](#결과-설명-및-가시성)
5. [강제 검색 옵션](#강제-검색-옵션)
6. [캐시 일관성](#캐시-일관성)

---

## LRU 캐시 및 환경 변수 설정

### 환경 변수

```bash
# 캐시 TTL (밀리초, 기본: 300000 = 5분)
export CACHE_TTL_MS=600000  # 10분

# 최대 캐시 엔트리 수 (기본: 100)
export CACHE_MAX_ENTRIES=200
```

### LRU (Least Recently Used) 정책

캐시가 최대 엔트리 수를 초과하면 가장 오래 사용되지 않은 항목부터 자동으로 제거됩니다.

```typescript
// 캐시 통계 조회
const stats = getCacheStats();
console.log(stats);
// {
//   size: 45,        // 현재 캐시 엔트리 수
//   maxSize: 100,    // 최대 허용 수
//   ttlMs: 300000    // TTL (밀리초)
// }
```

### 응답에 포함된 캐시 통계

```json
{
  "ok": true,
  "cacheStats": {
    "size": 45,
    "maxSize": 100,
    "ttlMs": 300000
  }
}
```

---

## 차원별 임계값 설정

### 단일 임계값 (기존 방식)

모든 차원에 동일한 임계값을 적용합니다.

```typescript
autoRecommend: {
  currentFile: fileContent,
  filePath: 'pages/users/index.vue',
  description: '사용자 목록 구현',
  minScoreThreshold: 80  // 모든 차원에 80점 적용
}
```

### 차원별 임계값 (새 기능)

각 차원마다 다른 임계값을 설정할 수 있습니다.

```typescript
autoRecommend: {
  currentFile: fileContent,
  filePath: 'pages/users/index.vue',
  description: '사용자 목록 구현',
  minScoreThreshold: {
    apiConnection: 85,     // API 연결은 높은 기준
    errorHandling: 80,     // 에러 처리도 중요
    typeUsage: 70,         // 타입 사용은 중간 기준
    structure: 90          // 구조는 매우 높은 기준
  }
}
```

### 동적 임계값 하한선

동적 임계값이 지나치게 낮아지는 것을 방지합니다.

```typescript
autoRecommend: {
  currentFile: fileContent,
  filePath: 'pages/users/index.vue',
  description: '사용자 목록 구현',
  minScoreThreshold: 75,
  minScoreThresholdFloor: 50,  // 최소 50점 이상 유지
  enableDynamicThreshold: true
}
```

**작동 방식:**
1. 데이터셋 평균이 임계값보다 낮으면 동적 조정
2. `dynamicThreshold = max(avg * 1.1, avg + 10)`
3. `effectiveThreshold = max(dynamicThreshold, floor)`
4. 하한선(floor)이 최종 임계값의 최소값 보장

---

## 사용자 정의 키워드

특수한 도메인 용어나 프로젝트별 키워드를 추가할 수 있습니다.

### 사용 예시

```typescript
autoRecommend: {
  currentFile: fileContent,
  filePath: 'pages/users/index.vue',
  description: 'Swagger API 연동',
  customKeywords: {
    apiConnection: ['swagger', 'openapi', 'spec'],
    errorHandling: ['circuit-breaker', 'retry-policy'],
    performance: ['redis', 'caching-strategy']
  }
}
```

### 키워드 병합 방식

사용자 정의 키워드는 기존 DIMENSION_KEYWORDS에 추가됩니다.

```typescript
// 기존 키워드
apiConnection: ['api', 'grpc', 'rest', ...]

// 사용자 정의 키워드 추가 후
apiConnection: ['api', 'grpc', 'rest', ..., 'swagger', 'openapi', 'spec']
```

### 차원별 키워드 목록

| 차원 | 기존 키워드 예시 | 추가 가능한 예시 |
|------|-----------------|------------------|
| apiConnection | api, grpc, rest, fetch, axios | swagger, openapi, graphql-ws |
| errorHandling | error, try, catch, throw | circuit-breaker, retry-policy |
| typeUsage | type, interface, generic | zod, io-ts, runtime-validation |
| stateManagement | state, store, pinia | zustand, jotai, recoil |
| designSystem | element, ui, component | shadcn, radix, headless |
| structure | pattern, architecture | clean-architecture, hexagonal |
| performance | optimize, lazy, cache | service-worker, edge-cache |
| utilityUsage | util, helper, format | date-fns, lodash, ramda |

---

## 결과 설명 및 가시성

### 선택 이유 포함

각 파일이 선택된 이유를 명확하게 제공합니다.

```typescript
autoRecommend: {
  currentFile: fileContent,
  filePath: 'pages/users/index.vue',
  description: '사용자 목록 구현',
  includeSelectionReasons: true  // 기본값: true
}
```

### 응답 예시

```json
{
  "bestPracticeExamples": [
    {
      "id": "project-a--pages-users-index-vue",
      "filePath": "pages/users/index.vue",
      "excellentIn": ["apiConnection", "structure"],
      "topScore": 90,
      "scores": {
        "apiConnection": 85,
        "structure": 90
      },
      "selectionReasons": [
        "apiConnection: 85점 (임계값 75점 충족)",
        "structure: 90점 (임계값 75점 충족)"
      ]
    }
  ],
  "searchMetadata": {
    "effectiveThresholds": {
      "apiConnection": 75,
      "structure": 75
    },
    "candidatesCount": 150,
    "avgScores": {
      "apiConnection": 68.5,
      "structure": 72.3
    }
  }
}
```

### 검색 메타데이터

응답에 포함된 메타데이터로 검색 과정을 이해할 수 있습니다:

- **effectiveThresholds**: 실제 적용된 임계값 (동적 조정 후)
- **candidatesCount**: 검색 대상 파일 수
- **avgScores**: 각 차원별 평균 점수

---

## 강제 검색 옵션

### forceBestPracticeSearch 플래그

skipBestPracticeSearch 조건을 무시하고 강제로 검색을 수행합니다.

```typescript
autoRecommend: {
  currentFile: fileContent,
  filePath: 'pages/users/index.vue',
  description: '사용자 목록 구현',
  skipBestPracticeSearch: true,   // 일반적으로 스킵
  forceBestPracticeSearch: true   // 하지만 강제로 검색
}
```

### 사용 사례

1. **디버깅**: RAG 추천이 없어도 BestPractice 검색 결과 확인
2. **명시적 요청**: 사용자가 항상 우수 사례를 원할 때
3. **테스트**: 다양한 조건에서 검색 결과 확인

---

## 캐시 일관성

### 자동 캐시 클리어

FileCase 저장/삭제 시 캐시가 자동으로 클리어되어 데이터 일관성을 보장합니다.

```typescript
// 저장 시
await fileCaseStorage.save(fileCase);
// 자동으로 clearCache() 호출됨

// 삭제 시
await fileCaseStorage.delete(id);
// 자동으로 clearCache() 호출됨
```

### 로그 메시지

```
[2025-01-01T12:00:00.000Z] FileCase saved, cache cleared for consistency: {"id":"project-a--pages-users-index-vue"}
[2025-01-01T12:00:00.000Z] Cache cleared
```

---

## 전체 옵션 예시

```typescript
const result = await execute({
  code: `
    // 우수 사례 기반 코드 생성
    if (context.hasBestPractices) {
      const examples = context.bestPracticeExamples;
      console.log('Found', examples.length, 'best practices');
      examples.forEach(ex => {
        console.log('File:', ex.filePath);
        console.log('Selection reasons:', ex.selectionReasons);
      });
    }
  `,
  autoRecommend: {
    currentFile: fileContent,
    filePath: 'pages/products/index.vue',
    description: '제품 목록 페이지 구현 with Swagger API',

    // 가이드 옵션
    maxGuides: 5,
    maxGuideLength: 50000,
    mandatoryGuideIds: ['00-bestcase-priority'],
    skipGuideLoading: false,

    // 프로젝트 컨텍스트
    skipProjectContext: false,

    // 다차원 검색 옵션
    maxBestPractices: 5,
    skipBestPracticeSearch: false,
    forceBestPracticeSearch: false,

    // 임계값 설정
    minScoreThreshold: {
      apiConnection: 85,
      errorHandling: 80,
      structure: 90
    },
    minScoreThresholdFloor: 50,
    enableDynamicThreshold: true,

    // 사용자 정의 키워드
    customKeywords: {
      apiConnection: ['swagger', 'openapi'],
      performance: ['redis', 'caching']
    },

    // 결과 설명
    includeSelectionReasons: true
  }
});
```

---

## 환경 변수 요약

| 환경 변수 | 기본값 | 설명 |
|----------|-------|------|
| CACHE_TTL_MS | 300000 | 캐시 TTL (밀리초) |
| CACHE_MAX_ENTRIES | 100 | 최대 캐시 엔트리 수 |
| BESTCASE_STORAGE_PATH | /projects/.bestcases | BestCase 저장 경로 |
| AUTO_MIGRATE_ON_STARTUP | true | 도커 시작 시 자동 스캔 실행 |
| SCAN_COOLDOWN_HOURS | 24 | 스캔 쿨다운 시간 (시간) |
| OLLAMA_URL | http://ollama:11434 | Ollama 서버 URL |
| EMBEDDING_MODEL | nomic-embed-text | 임베딩 모델 |
| PROJECTS_PATH | /projects | 프로젝트 경로 |
| MASK_SENSITIVE_LOGS | false | 민감 데이터 마스킹 활성화 |
| MAX_LOG_PREVIEW_LENGTH | 200 | 로그 미리보기 최대 길이 |
| NODE_ENV | development | 환경 (production이면 자동 마스킹) |

---

## 보안 기능

### 민감 데이터 마스킹

운영 환경에서 로그에 민감한 정보가 노출되지 않도록 합니다.

```bash
# 민감 데이터 마스킹 활성화
export MASK_SENSITIVE_LOGS=true

# 또는 production 환경에서 자동 활성화
export NODE_ENV=production
```

**마스킹되는 패턴:**
- 이메일 주소 → `[EMAIL_MASKED]`
- API 키/토큰/비밀번호 → `[MASKED]`
- Bearer 토큰 → `Bearer [TOKEN_MASKED]`
- JWT 토큰 → `[JWT_MASKED]`
- 신용카드 번호 → `[CARD_MASKED]`
- 주민등록번호 → `[SSN_MASKED]`

### 파일 시스템 감시자

BestCase 저장소 변경을 자동으로 감지하여 캐시를 무효화합니다.

**기능:**
- **자동 디렉토리 생성**: 저장 경로가 없으면 자동 생성
- **지수 백오프 재시도**: 오류 발생 시 최대 5회 재시도 (1s, 2s, 4s, 8s, 16s)
- **디바운싱**: 연속적인 파일 변경을 3초 단위로 통합 처리 (도커 재시작 시 다중 이벤트 방지)

### 자동 스캔 제어

도커 재시작 시 불필요한 스캔을 방지하기 위한 쿨다운 기능이 추가되었습니다.

```bash
# 자동 스캔 활성화/비활성화
export AUTO_MIGRATE_ON_STARTUP=true  # 기본값: true

# 스캔 쿨다운 시간 (시간 단위)
export SCAN_COOLDOWN_HOURS=24  # 기본값: 24시간
```

**동작 방식:**
1. 도커 시작 시 체크포인트 파일(`.scan-checkpoint.json`) 확인
2. 마지막 스캔이 `SCAN_COOLDOWN_HOURS` 이내면 **파일 변경 여부 확인**
   - `.vue`, `.ts`, `.tsx`, `.js` 파일의 최신 수정 시간 체크
   - Git 커밋 이력 확인 (있는 경우)
   - **변경이 있으면 쿨다운 무시하고 스캔 실행**
   - 변경이 없으면 스캔 스킵
3. 쿨다운 기간이 지났거나 최초 스캔이면 무조건 실행

**강제 스캔:**
```bash
# 쿨다운 무시하고 즉시 스캔
export SCAN_COOLDOWN_HOURS=0

# 또는 체크포인트 파일 삭제
rm /projects/.bestcases/.scan-checkpoint.json
```

```typescript
// 감시자가 자동으로 시작됩니다
// 로그에서 상태 확인 가능:
// [timestamp] BestCase watcher started: {"path":"/projects/.bestcases"}

// 오류 발생 시 자동 재시도:
// [timestamp] Attempting to restart BestCase watcher: {"attempt":1,"maxAttempts":5,"delayMs":1000}
```

---

## 마이그레이션 가이드

### v1 → v2 (현재 버전)

**이전 코드:**
```typescript
autoRecommend: {
  minScoreThreshold: 75,  // 단일 값만 지원
}
```

**새 코드:**
```typescript
autoRecommend: {
  // 단일 값 (하위 호환)
  minScoreThreshold: 75,

  // 또는 차원별 값 (새 기능)
  minScoreThreshold: {
    apiConnection: 85,
    structure: 90
  },

  // 새 옵션들
  minScoreThresholdFloor: 50,
  customKeywords: { ... },
  forceBestPracticeSearch: true,
  includeSelectionReasons: true
}
```

모든 새 옵션은 선택적이며 기본값이 제공되므로, 기존 코드는 수정 없이 동작합니다.

---

## 고급 설정 옵션 (v3.0+)

### mcp.json 설정 파일

프로젝트 루트에 `mcp.json` 파일을 배치하여 프로젝트별 설정을 관리할 수 있습니다.

**파일 위치:** `/projects/your-project/mcp.json`

#### 설정 파일 예시

```json
{
  "projectMarkers": [
    "modules",
    "features",
    "domains"
  ],

  "dimensionFloors": {
    "performance": 60,
    "errorHandling": 70,
    "typeUsage": 65,
    "apiConnection": 60
  },

  "cacheOptions": {
    "ttlMs": 600000,
    "maxEntries": 200
  },

  "autoRecommendDefaults": {
    "maxBestPractices": 5,
    "maxGuides": 7,
    "enableDynamicThreshold": true,
    "includeMetadata": false,
    "customKeywords": {
      "apiConnection": ["rest-api", "axios-client"],
      "performance": ["cache", "lazy-load"]
    }
  }
}
```

### 프로젝트 마커 커스터마이징

**목적**: Monorepo나 커스텀 프로젝트 구조에서 프로젝트 루트를 정확히 인식

```json
{
  "projectMarkers": ["modules", "features", "domains", "workspaces"]
}
```

**기본 마커** (항상 포함):
- `pages`, `components`, `composables`, `stores`, `src`, `app`, `lib`, `packages`, `apps`

**사용자 정의 마커**는 기본 마커와 병합되어 사용됩니다.

### 차원별 하한선 설정 (dimensionFloors)

**목적**: 특정 차원의 최소 품질 기준을 프로젝트별로 설정

```json
{
  "dimensionFloors": {
    "performance": 65,
    "errorHandling": 70,
    "typeUsage": 60,
    "apiConnection": 60
  }
}
```

**적용 규칙:**
1. `dimensionFloors`에 명시된 값이 최우선 (차원별)
2. 설정되지 않은 차원은 `minScoreFloor` (기본: 50) 사용
3. 동적 임계값 조정 시 해당 하한선 이하로 내려가지 않음

**예시 시나리오:**
```
평균 performance 점수: 55점
기본 minScoreFloor: 50점
dimensionFloors.performance: 65점

→ 동적 임계값: max(55 * 1.1, 55 + 10, 65) = 65점
  (하한선 65점 보장)
```

### 메타데이터 노출 옵션 (includeMetadata)

**목적**: 추천 결과에 상세 정보 포함 여부 제어

**기본값** (`false`): 토큰 절약, 메타데이터 제외
```json
{
  "bestPracticeExamples": [
    {
      "id": "abc123",
      "filePath": "/projects/app/pages/users.vue",
      "fileRole": "page",
      "excellentIn": ["apiConnection", "errorHandling"],
      "scores": { "apiConnection": 85, "errorHandling": 92 },
      "content": "..."
    }
  ]
}
```

**`includeMetadata: true`**: 상세 정보 포함
```json
{
  "bestPracticeExamples": [
    {
      "id": "abc123",
      "filePath": "/projects/app/pages/users.vue",
      "fileRole": "page",
      "excellentIn": ["apiConnection", "errorHandling"],
      "excellentDetails": [
        {
          "dimension": "apiConnection",
          "score": 85,
          "threshold": 75,
          "reason": "apiConnection: 85 (threshold: 75, +10.0)"
        },
        {
          "dimension": "errorHandling",
          "score": 92,
          "threshold": 75,
          "reason": "errorHandling: 92 (threshold: 75, +17.0)"
        }
      ],
      "scores": { "apiConnection": 85, "errorHandling": 92 },
      "content": "..."
    }
  ],
  "searchMetadata": {
    "dimensionsSearched": ["apiConnection", "errorHandling"],
    "thresholdsUsed": { "apiConnection": 75, "errorHandling": 75 },
    "candidateCount": 150,
    "cacheHit": false
  }
}
```

**토큰 비교:**
- `includeMetadata: false` → ~1,500 tokens (예시 코드 1개)
- `includeMetadata: true` → ~1,800 tokens (+300 tokens)

**권장 사용 시나리오:**
- 디버깅 모드
- 추천 이유 확인 필요
- 품질 검증
- 개발 환경

### 우선순위 규칙

설정 값의 적용 우선순위:

```
API 호출 시 직접 전달 > mcp.json > 환경 변수 > 기본값
```

**예시:**
```typescript
// 1. mcp.json
{
  "dimensionFloors": { "performance": 60 },
  "autoRecommendDefaults": { "includeMetadata": false }
}

// 2. API 호출
execute({
  autoRecommend: {
    dimensionFloors: { "errorHandling": 70 },  // 추가됨
    includeMetadata: true  // 덮어씀
  }
})

// 3. 최종 병합 결과
{
  dimensionFloors: {
    performance: 60,      // from mcp.json
    errorHandling: 70     // from API
  },
  includeMetadata: true   // from API (overrides mcp.json)
}
```

### 설정 파일 위치 감지

프로젝트 루트는 다음 순서로 추론됩니다:

1. **filePath에서 projectMarker 탐색**
   ```
   /projects/my-app/pages/users.vue
   → 'pages' 마커 발견 → /projects/my-app
   ```

2. **mcp.json 로드**
   ```
   /projects/my-app/mcp.json
   ```

3. **설정 적용 및 로깅**
   ```
   [timestamp] MCP config loaded: {"path":"/projects/my-app/mcp.json"}
   [timestamp] Merged options with config: {"hasConfig":true}
   ```

### 설정 파일 검증

올바른 JSON 형식과 타입을 사용해야 합니다:

```json
{
  "projectMarkers": ["string", "array"],          // ✅ 문자열 배열
  "dimensionFloors": {
    "performance": 60                              // ✅ 숫자
  },
  "autoRecommendDefaults": {
    "maxBestPractices": 5,                         // ✅ 숫자
    "includeMetadata": true                        // ✅ 불리언
  }
}
```

**오류 시:**
- JSON 파싱 실패 → 설정 파일 무시, 기본값 사용
- 타입 불일치 → 해당 옵션 무시, 나머지 적용
- 로그에 오류 메시지 출력

---

## 설정 파일 템플릿

프로젝트 루트에 복사하여 사용하세요:

**파일:** `mcp.json` (프로젝트 루트)

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "description": "MCP Code Mode configuration",
  
  "projectMarkers": [],
  
  "dimensionFloors": {},
  
  "autoRecommendDefaults": {
    "maxBestPractices": 3,
    "enableDynamicThreshold": true,
    "includeMetadata": false
  }
}
```

상세한 예시는 저장소의 `mcp.json.example` 파일을 참고하세요.


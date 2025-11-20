# RAG vs BestCase 비교 분석

## 개요

execute tool에서 사용하는 두 가지 코드 검색 메커니즘:
- **RAG (5-1)**: analyzeAndRecommend - 유사성 기반 추천
- **BestCase (5-4)**: searchBestPracticeExamples - 품질 기반 추천

## 상세 비교

### RAG (5-1): analyzeAndRecommend

**목적**: 현재 작업과 유사한 코드 찾기

**검색 방법**:
```typescript
// 1. 키워드 추출
extractKeywordsFromRequest({
  description: "상품 목록 페이지 작성",
  currentFile: "...",
  filePath: "/pages/product/list.vue"
})
// → ['product', 'list', 'page', 'table', 'api']

// 2. Ollama 임베딩 생성
const embedding = await ollama.embed({
  model: 'nomic-embed-text',
  prompt: description + keywords.join(' ')
})

// 3. 하이브리드 검색 (벡터 유사도 + 키워드 매칭)
const results = await fileCaseStorage.search({
  embedding: embedding,
  keywords: keywords,
  limit: 10
})

// 4. 유사도 점수로 정렬
results.sort((a, b) => b.similarity - a.similarity)
```

**검색 기준**:
- **벡터 유사도** (코사인 유사도): 0.0 ~ 1.0
- **키워드 매칭**: 일치하는 키워드 개수
- **하이브리드 점수**: `similarity * 0.7 + keywordMatch * 0.3`

**반환 데이터**:
```typescript
[
  {
    filePath: "/projects/app/pages/order/list.vue",
    similarity: 0.87,  // ← 유사도 점수
    keywords: ["order", "list", "page", "table"],
    content: "<template>...</template>"
  },
  // ... 9개 더 (총 10개)
]
```

**용도**: "이 작업과 비슷한 코드를 참고하세요"

---

### BestCase (5-4): searchBestPracticeExamples

**목적**: 특정 차원에서 우수한 코드 찾기

**검색 방법**:
```typescript
// 1. 중요 차원 추론
inferImportantDimensions(
  "상품 목록 페이지 작성, API 연결 및 에러 처리",
  ["api", "grpc", "error", "list"]
)
// → ['apiConnection', 'errorHandling', 'structure']

// 2. 파일 역할 추론
inferFileRole("/pages/product/list.vue")
// → 'page'

// 3. 다차원 점수 검색
for (const fileCase of allCases) {
  if (fileCase.fileRole !== 'page') continue;

  for (const dimension of ['apiConnection', 'errorHandling', 'structure']) {
    if (fileCase.scores[dimension] >= 75) {
      excellentFiles.add(fileCase);
    }
  }
}

// 4. 최고 점수로 정렬
excellentFiles.sort((a, b) => b.topScore - a.topScore)
```

**검색 기준**:
- **8개 차원 점수**: 0 ~ 100점
  - apiConnection: API 연결 품질
  - errorHandling: 에러 처리 품질
  - typeUsage: 타입 사용 품질
  - stateManagement: 상태 관리 품질
  - designSystem: 디자인 시스템 활용
  - structure: 구조 및 패턴
  - performance: 성능 최적화
  - utilityUsage: 유틸리티 활용
- **임계값**: 기본 75점 (동적 조정 가능)
- **파일 역할**: page, component, composable 등

**반환 데이터**:
```typescript
[
  {
    filePath: "/projects/admin/pages/product/edit.vue",
    excellentIn: ["apiConnection", "errorHandling"],  // ← 우수한 차원
    topScore: 92,  // ← 최고 점수
    scores: {
      apiConnection: 92,
      errorHandling: 88
    },
    keywords: ["api", "grpc", "error", "form"],
    content: "<template>...</template>"
  },
  // ... 2개 더 (총 3개)
]
```

**용도**: "이 코드는 API 연결과 에러 처리가 우수합니다. 참고하세요"

---

## 겹치는 부분

### 1. 데이터 소스
- **공통**: 둘 다 `FileCaseStorage`에서 검색
- **공통**: 둘 다 스캔된 모든 파일 대상

### 2. 반환 필드
- **공통**: filePath, keywords, content, analysis 포함
- **차이**: similarity(RAG) vs excellentIn/topScore(BestCase)

### 3. 키워드 사용
- **RAG**: 키워드로 검색 범위 좁힘
- **BestCase**: 키워드로 중요 차원 추론

---

## 차이점 및 상호 보완

| 항목 | RAG | BestCase |
|------|-----|----------|
| **검색 기준** | 유사성 (similarity) | 품질 (quality) |
| **사용 기술** | 벡터 임베딩 (Ollama) | 다차원 점수 (LLM 분석) |
| **개수** | 10개 | 3개 |
| **선택 이유** | "이것과 비슷해요" | "이것이 우수해요" |
| **활용 방법** | 구조/패턴 복사 | 품질 개선 참고 |

### 예시로 이해하기

**작업**: "상품 목록 페이지 작성, API 연결 필요"

**RAG 결과** (유사성 기반):
```
1. /app/pages/order/list.vue (similarity: 0.87)
   → "주문 목록 페이지랑 구조가 비슷해요"

2. /app/pages/product/search.vue (similarity: 0.82)
   → "상품 검색 페이지랑 목적이 비슷해요"

3. /admin/pages/user/list.vue (similarity: 0.78)
   → "사용자 목록 페이지랑 레이아웃이 비슷해요"
```

**BestCase 결과** (품질 기반):
```
1. /admin/pages/product/edit.vue (apiConnection: 92, errorHandling: 88)
   → "이 파일은 API 연결과 에러 처리가 정말 잘되어 있어요"

2. /app/pages/order/detail.vue (apiConnection: 89, typeUsage: 91)
   → "이 파일은 API 연결과 타입 사용이 우수해요"

3. /admin/components/DataTable.vue (structure: 93, performance: 87)
   → "이 컴포넌트는 구조와 성능이 우수해요"
```

**LLM의 활용**:
1. **RAG 참고** → "order/list.vue의 구조를 기본으로 사용하자"
2. **BestCase 참고** → "product/edit.vue의 에러 처리 패턴을 가져오자"
3. **결합** → "유사한 구조 + 우수한 에러 처리 = 품질 좋은 코드"

---

## 겹치는 것처럼 보이지만 다른 이유

### 같은 파일이 양쪽에 나올 수 있나?

**예**: `/admin/pages/product/list.vue`

**RAG**:
```
similarity: 0.91
이유: "product list" 키워드가 정확히 일치
```

**BestCase**:
```
excellentIn: ["apiConnection", "structure"]
topScore: 88
이유: API 연결과 구조가 우수함
```

**결론**: 같은 파일이지만 **선택 이유가 다름**
- RAG: "이 파일이 지금 하려는 작업과 가장 비슷해요"
- BestCase: "이 파일의 API 연결 방식이 정말 좋아요"

---

## 왜 둘 다 필요한가?

### 시나리오 1: 처음 작성하는 기능

**상황**: "새로운 기능을 처음 만들어요. 비슷한 코드가 없어요"

- **RAG**: 유사한 코드를 찾지 못함 (similarity 낮음)
- **BestCase**: 우수한 패턴은 여전히 제공 가능
- **결과**: BestCase만으로도 품질 좋은 코드 작성 가능

### 시나리오 2: 기존 코드 개선

**상황**: "주문 목록 페이지를 참고해서 상품 목록 만들어요"

- **RAG**: 주문 목록 페이지 제공 (구조 복사)
- **BestCase**: 에러 처리 우수한 다른 페이지 제공
- **결과**: RAG로 구조 가져오고, BestCase로 품질 향상

### 시나리오 3: 특정 패턴 적용

**상황**: "에러 처리를 개선하고 싶어요"

- **RAG**: 현재 파일과 유사한 코드 (에러 처리 미흡할 수도)
- **BestCase**: errorHandling 점수 높은 파일 제공 ✅
- **결과**: BestCase의 에러 처리 패턴 학습

---

## 결론

### 겹치는 부분
- 데이터 소스 (FileCaseStorage)
- 반환 형식 (filePath, content 등)
- 키워드 활용

### 다른 부분 (핵심)
- **RAG**: "지금 작업과 **비슷한** 코드를 찾아줘"
- **BestCase**: "특정 부분이 **우수한** 코드를 찾아줘"

### 상호 보완
- RAG: 빠른 시작 (구조 복사)
- BestCase: 품질 향상 (우수 패턴 학습)
- 함께 사용: **빠르게 시작 + 높은 품질**

### 제거 가능 여부
- **RAG만 사용**: 유사한 코드만 참고 → 기존 품질 답습
- **BestCase만 사용**: 우수 사례만 참고 → 구조 파악 어려움
- **둘 다 사용**: 유사 구조 + 우수 품질 → **최적** ✅

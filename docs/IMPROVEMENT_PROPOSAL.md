# Execute Tool 개선 제안

## 확인 결과

### 1. ❌ BestCase가 LLM에게 전달되지 않음

**현재 상태**:
```typescript
// Sandbox Context (Line 1549-1560)
{
  recommendations: [...],           // ✅
  bestPracticeExamples: [...],      // ✅ Sandbox만
  guides: "...",                     // ✅
}

// LLM Response (Line 1614-1647)
{
  recommendations: [...],           // ✅
  guides: "...",                     // ✅
  // ❌ bestPracticeExamples 없음!
}
```

**문제점**:
- LLM이 우수 사례 코드를 볼 수 없음
- 품질 향상 패턴을 학습할 수 없음
- Sandbox 코드만 bestPracticeExamples 접근 가능

**영향**:
- LLM은 recommendations(유사 코드)만 참고
- BestCase(우수 코드)를 활용할 수 없음
- 코드 품질 개선 효과 감소

---

### 2. 📊 개수 제한 현황

**현재 제한**:
```typescript
// Guide
maxGuides: 5개
maxGuideLength: 50KB

// BestCase
maxBestPractices: 3개

// RAG
limit: 10개
```

**제한 이유** (추정):
- 토큰 비용 절감
- 응답 속도 향상
- Context 크기 제한

**문제점**:
- 충분한 참고 자료가 부족할 수 있음
- 프로젝트별로 필요한 개수가 다름
- 고정된 제한으로 유연성 부족

---

### 3. 🔄 RAG vs BestCase 겹치는 부분

**분석 결과** ([상세 분석 문서](RAG_VS_BESTCASE_ANALYSIS.md)):

**RAG (5-1)**:
- 목적: 유사성 기반 추천
- 기술: 벡터 임베딩 (Ollama)
- 기준: similarity (0.0 ~ 1.0)
- 개수: 10개
- 용도: "이것과 비슷해요"

**BestCase (5-4)**:
- 목적: 품질 기반 추천
- 기술: 다차원 점수 (8개 차원)
- 기준: quality (0 ~ 100점)
- 개수: 3개
- 용도: "이것이 우수해요"

**겹치는 부분**:
- ✅ 데이터 소스: 둘 다 FileCaseStorage
- ✅ 반환 형식: filePath, content, keywords, analysis
- ✅ 키워드 활용

**다른 부분** (핵심):
- ❌ 검색 기준: similarity vs quality
- ❌ 선택 이유: "비슷함" vs "우수함"
- ❌ 활용 방법: 구조 복사 vs 품질 개선

**결론**: **상호 보완 관계** (겹치는 게 아님)
- RAG: 빠른 시작 (유사 구조 복사)
- BestCase: 품질 향상 (우수 패턴 학습)
- 함께 사용: **빠르게 시작 + 높은 품질** ✅

---

## 개선 제안

### 제안 1: BestCase를 LLM 응답에 포함 (필수)

**수정 위치**: mcp-stdio-server.ts Line 1614-1647

**Before**:
```typescript
const responseText = JSON.stringify({
  ok: result.ok,
  output: result.output,
  recommendations: [...],
  guides: "...",
  projectInfo: {...},
  // ❌ bestPracticeExamples 없음
}, null, 2);
```

**After**:
```typescript
const responseText = JSON.stringify({
  ok: result.ok,
  output: result.output,
  recommendations: [...],
  // ✅ BestCase 추가
  bestPracticeExamples: autoContext.bestPracticeExamples.length > 0
    ? autoContext.bestPracticeExamples.map(bp => ({
        filePath: bp.filePath,
        fileRole: bp.fileRole,
        excellentIn: bp.excellentIn,
        topScore: bp.topScore,
        scores: bp.scores,
        keywords: bp.keywords,
        content: bp.content,
        analysis: bp.analysis
      }))
    : undefined,
  guides: "...",
  projectInfo: {...},
}, null, 2);
```

**효과**:
- LLM이 우수 사례 코드를 참고할 수 있음
- 에러 처리, API 연결 등 품질 패턴 학습 가능
- recommendations(유사) + bestPracticeExamples(우수) = 최고 품질

---

### 제안 2: 개수 제한 증가/제거

**옵션 A: 기본값 증가**
```typescript
// Guide
maxGuides: 5 → 10
maxGuideLength: 50KB → 100KB

// BestCase
maxBestPractices: 3 → 5

// RAG (이미 10개)
limit: 10 (유지)
```

**옵션 B: 제한 제거** (무제한)
```typescript
// Guide
maxGuides: Infinity
maxGuideLength: Infinity

// BestCase
maxBestPractices: Infinity

// RAG
limit: Infinity
```

**옵션 C: mcp.json 설정 우선** (추천)
```typescript
// mcp.json
{
  "autoRecommendDefaults": {
    "maxGuides": 20,            // 프로젝트별 설정
    "maxGuideLength": 200000,   // 200KB
    "maxBestPractices": 10,
    "ragLimit": 20
  }
}

// 코드에서는 기본값만 제공
maxGuides: mergedOptions.maxGuides || 10  // 기본 10, mcp.json 우선
```

**추천**: 옵션 C
- 프로젝트별 유연성 확보
- 기본값으로 안전성 보장
- mcp.json으로 커스터마이징 가능

---

### 제안 3: RAG vs BestCase 명확한 구분

**현재 문제**:
- 사용자가 두 개념의 차이를 이해하기 어려움
- 겹치는 것처럼 보임

**개선 방안**:

#### A. 응답에 설명 추가
```typescript
{
  recommendations: [...],
  recommendationsNote: "현재 작업과 유사한 코드 (구조 참고용)",

  bestPracticeExamples: [...],
  bestPracticeNote: "특정 차원에서 우수한 코드 (품질 개선용)",

  guides: "..."
}
```

#### B. Sandbox Context 주석 개선
```typescript
const wrappedCode = `
// 1. context.recommendations - 유사한 코드 (구조 복사)
//    - 현재 작업과 비슷한 파일을 찾았어요
//    - 전체 구조와 패턴을 참고하세요
//
// 2. context.bestPracticeExamples - 우수한 코드 (품질 개선)
//    - API 연결, 에러 처리 등이 우수한 파일이에요
//    - 특정 부분의 패턴을 학습하세요
//
// 3. context.guides - 가이드 문서
${execArgs.code}
`;
```

#### C. 로그 메시지 개선
```typescript
log('Auto-context fetched', {
  recommendations: `${autoContext.recommendations.length} similar files`,
  bestPracticeExamples: `${autoContext.bestPracticeExamples.length} high-quality files`,
  guides: `${autoContext.guides.length} chars of guides`
});
```

---

## 우선순위

### 🔴 Critical (즉시 수정 필요)
1. **BestCase를 LLM 응답에 포함**
   - 현재 LLM이 활용 불가
   - 코드 품질에 직접 영향

### 🟡 High (권장)
2. **개수 제한 증가 (옵션 C)**
   - 프로젝트별 유연성 필요
   - mcp.json 설정 우선 적용

### 🟢 Medium (선택)
3. **RAG vs BestCase 구분 명확화**
   - 사용자 이해도 향상
   - 주석 및 로그 개선

---

## 구현 계획

### Step 1: BestCase를 LLM 응답에 포함
- 파일: mcp-stdio-server.ts
- 위치: Line 1631 이후
- 예상 시간: 5분
- 테스트: 빌드 후 응답 확인

### Step 2: 개수 제한 설정 개선
- 파일: mcp-stdio-server.ts, autoRecommend.ts
- 변경:
  - maxGuides: 5 → 10
  - maxBestPractices: 3 → 5
  - mcp.json 설정 우선 적용
- 예상 시간: 10분
- 테스트: mcp.json으로 설정 변경 확인

### Step 3: 주석 및 로그 개선
- 파일: mcp-stdio-server.ts
- 변경: Sandbox Context 주석, 로그 메시지
- 예상 시간: 5분
- 테스트: 로그 출력 확인

**총 예상 시간**: 20분

---

## 예상 효과

### Before (현재)
```
LLM이 참고하는 정보:
1. Recommendations (10개) - 유사 코드
2. Guides - 가이드 문서
3. ProjectInfo - API Type 등

품질: ⭐⭐⭐ (3/5)
```

### After (개선 후)
```
LLM이 참고하는 정보:
1. Recommendations (10개) - 유사 코드
2. BestPracticeExamples (5개) - 우수 코드 ← 추가!
3. Guides (최대 10개) - 가이드 문서 ← 증가!
4. ProjectInfo - API Type 등

품질: ⭐⭐⭐⭐⭐ (5/5)
```

### 구체적 개선
- **코드 품질**: 우수 사례 참고 → 에러 처리, API 연결 개선
- **유연성**: 프로젝트별 설정 → 대규모 프로젝트도 충분한 참고 자료
- **이해도**: 명확한 구분 → 사용자가 각 데이터의 용도 이해

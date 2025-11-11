# 필수 지침 강제 로드 시스템 (API 연결 보장)

## 🎯 문제점

**기존 시스템**: 키워드 매칭에만 의존 → API 연결 지침이 검색되지 않으면 API 연동을 아예 시도하지 않음

```
사용자: "배너 관리 페이지 작성해 줘"
→ 키워드: ["banner", "management", "page"]
→ API 관련 키워드 없음
→ API 연결 지침 검색 안 됨
→ ❌ API가 있는데 연결 안 함 (더미 데이터만 사용)
```

## ✅ 해결 방안

**필수 지침(Mandatory Guides)** 개념 도입:

- **키워드 매칭 실패해도 무조건 로드**
- **API 연결/검증/에러 처리는 항상 포함**

## 📋 구현 내용

### 1. main-ultra-compact.md 수정

```typescript
// 3. 키워드 추출 → 지침 동적 로드 (⚠️ 필수 지침 강제 포함)
const mandatoryGuides = [
  `${meta.apiTypeHint}.api.connection`,  // gRPC/OpenAPI 연결
  'api.validation',                      // API 시그니처 검증
  'error.handling'                       // 에러 처리 패턴
];

const guides = await guides.searchGuides({ 
  keywords: preflight.keywords, 
  apiType: meta.apiTypeHint,
  mandatoryIds: mandatoryGuides  // 🔑 무조건 포함
});
```

### 2. guides/index.ts 수정

#### SearchGuidesInput 인터페이스 확장

```typescript
export interface SearchGuidesInput {
  keywords: string[];
  mandatoryIds?: string[];  // 🔑 필수 지침 ID
}
```

#### searchGuides() 함수 로직 개선

```typescript
// 1. 필수 지침 먼저 확보 (점수 1000 부여)
const mandatoryGuides: any[] = [];
if (input.mandatoryIds) {
  for (const id of input.mandatoryIds) {
    const guide = allGuides.find(g => g.id === id);
    if (guide) {
      mandatoryGuides.push({
        id: guide.id,
        score: 1000,  // 최고 점수
        ...guide
      });
    }
  }
}

// 2. 키워드 매칭 지침 (기존 로직)
const scoredGuides = allGuides.map(guide => {
  // 이미 필수 지침에 포함된 경우 스킵
  if (mandatoryGuides.some(m => m.id === guide.id)) return null;
  
  // 키워드 기반 점수 계산 (0~100점)
  let score = calculateScore(guide, input.keywords);
  return { ...guide, score };
}).filter(Boolean);

// 3. 병합 (필수 지침 + 키워드 매칭)
const allResults = [...mandatoryGuides, ...scoredGuides];
allResults.sort((a, b) => b.score - a.score);
```

### 3. 필수 지침 파일 생성

#### grpc.api.connection.md

```yaml
---
id: grpc.api.connection
scope: global
apiType: grpc
priority: 95
excludes: [openapi.api.connection]
summary: "gRPC API 연결 필수 체크 및 클라이언트 설정"
---
```

**핵심 내용**:
1. BestCase에서 API 확인 (`patterns.apiInfo.hasGrpc`)
2. 클라이언트 import (`useGrpcClient`)
3. API 호출 패턴 (`useAsyncData`)
4. 에러 처리 (`catchError`)
5. 로딩/에러 상태 (`CommonAsyncBoundary`)

#### openapi.api.connection.md

```yaml
---
id: openapi.api.connection
scope: global
apiType: openapi
priority: 95
excludes: [grpc.api.connection]
summary: "OpenAPI/REST API 연결 필수 체크"
---
```

**핵심 내용**:
1. BestCase에서 API 확인 (`patterns.apiInfo.hasOpenApi`)
2. 클라이언트 import (`useBackendClient`)
3. API 호출 패턴 (`useFetch`)
4. 에러 처리 (onRequestError/onResponseError)

#### api.validation.md

```yaml
---
id: api.validation
scope: global
apiType: any
priority: 90
summary: "API 메서드/시그니처 존재 확인"
---
```

**핵심 내용**:
1. BestCase API 정보 확인
2. 클라이언트 파일 존재 확인
3. 메서드 시그니처 확인
4. 검증 실패 시 리스크 점수 반영

## 🔍 동작 흐름

```
사용자 요청: "배너 관리 페이지 작성"
  ↓
1. 메타데이터 변환
   - apiTypeHint: "grpc"
  ↓
2. BestCase 로드
   - patterns.apiInfo.hasGrpc: true
   - endpoints: [{ method: "getBannerList", ... }]
  ↓
3. 프리플라이트
   - keywords: ["banner", "management", "page"]
   - ⚠️ "api" 키워드 없음
  ↓
4. 지침 검색 (🔑 필수 지침 강제 포함)
   mandatoryGuides: [
     "grpc.api.connection" (점수: 1000) ← 무조건 포함!
     "api.validation" (점수: 1000)
   ]
   keywordMatched: [
     "page.scaffold" (점수: 65)
     "table.pattern" (점수: 50)
   ]
  ↓
5. 지침 병합
   최종 순서:
   1) grpc.api.connection (필수, 점수 1000)
   2) api.validation (필수, 점수 1000)
   3) page.scaffold (키워드, 점수 65)
   4) table.pattern (키워드, 점수 50)
  ↓
6. 코드 생성
   ✅ useGrpcClient() import
   ✅ client.getBannerList() 호출
   ✅ useAsyncData 패턴
   ✅ catchError 에러 핸들링
   ✅ CommonAsyncBoundary 로딩/에러 처리
```

## 📊 로그 예시

```
[searchGuides] Input: {
  "keywords": ["banner", "management", "page"],
  "apiType": "grpc",
  "mandatoryIds": ["grpc.api.connection", "api.validation"]
}

[searchGuides] Mandatory guide loaded: {
  "id": "grpc.api.connection",
  "summary": "gRPC API 연결 필수 체크",
  "priority": 95
}

[searchGuides] Mandatory guide loaded: {
  "id": "api.validation",
  "summary": "API 메서드 검증",
  "priority": 90
}

[searchGuides] Results: [
  { id: "grpc.api.connection", score: 1000, mandatory: true },
  { id: "api.validation", score: 1000, mandatory: true },
  { id: "page.scaffold", score: 65, mandatory: false },
  { id: "table.pattern", score: 50, mandatory: false }
]
```

## ✅ 효과

### Before (문제 상황)

```
키워드: ["banner", "management"]
→ API 관련 키워드 없음
→ API 연결 지침 검색 안 됨
→ ❌ 더미 데이터로만 작업
```

### After (해결)

```
키워드: ["banner", "management"]
→ API 관련 키워드 없어도
→ ✅ grpc.api.connection 필수 로드
→ ✅ API 연결 자동 시도
→ ✅ client.getBannerList() 호출
```

## 🚨 주의사항

1. **필수 지침 ID 오타 주의**
   - `grpc.api.connection` (정확한 ID)
   - 오타 시 로드 실패 → 로그로 확인

2. **excludes 규칙 적용**
   - `grpc.api.connection`과 `openapi.api.connection`은 상호 배타
   - API 타입에 따라 하나만 로드됨

3. **점수 체계**
   - 필수 지침: 1000점 (최우선)
   - 키워드 매칭: 0~100점
   - 병합 시 필수 지침이 항상 상위

## 🔄 확장 가능성

추가 필수 지침 예시:

```typescript
const mandatoryGuides = [
  `${meta.apiTypeHint}.api.connection`,
  'api.validation',
  'error.handling',
  'ssr.safety',          // SSR 안전성 체크
  'type.safety',         // TypeScript 타입 안전성
  'security.xss',        // XSS 방어 패턴
];
```

## 📝 체크리스트

- [x] main-ultra-compact.md 수정 (필수 지침 명시)
- [x] guides/index.ts 수정 (mandatoryIds 지원)
- [x] grpc.api.connection.md 생성
- [x] openapi.api.connection.md 생성
- [x] api.validation.md 생성
- [x] Docker 재빌드
- [ ] 외부 프로젝트 테스트
- [ ] 로그 확인 (필수 지침 로드 여부)
- [ ] API 연결 동작 확인

## 🎯 결론

**이제 키워드에 "api"가 없어도 API 연결 지침이 무조건 로드되어, BestCase에 API가 있으면 자동으로 연결을 시도합니다!** 🚀

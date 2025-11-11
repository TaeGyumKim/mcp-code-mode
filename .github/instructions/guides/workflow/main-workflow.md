---
id: workflow.main
scope: global
apiType: any
tags: [workflow, external-project, ultra-compact, bestcase, dynamic-loading]
priority: 200
version: 2025.11.11
requires: []
excludes: []
summary: "외부 프로젝트용 메인 워크플로우 - BestCase 우선 + 동적 지침 로딩 (5단계)"
---

# AI 코딩 에이전트 메인 워크플로우 (외부 프로젝트용)

## 🎯 5단계 워크플로우

### 1. BestCase 로드 + 메타데이터

```typescript
const meta = await buildMetadata(userRequest);
const bestCase = await bestcase.loadBestCase({ projectName: meta.projectName });
```

**목적**: 프로젝트의 실제 패턴과 API 타입 확인

### 2. TODO + 프리플라이트 (risk ≥40 → high-risk만)

```typescript
const todos = await synthesizeTodo(meta, bestCase);
const { ok, risk, keywords } = await preflight(meta, todos, bestCase);
if (!ok) return await guides.loadGuide({ id: 'high-risk' });
```

**리스크 체크**: 40점 이상이면 스캐폴딩만 제공

### 3. 필수 지침 + 동적 검색 (⚠️ API 검증 필수)

```typescript
const mandatory = [
  `${meta.apiType}.api.connection`,  // grpc.api.connection or openapi.api.connection
  'api.validation',                  // API 시그니처 검증
  'error.handling'                   // 에러 처리 패턴
];

const searched = await guides.searchGuides({ 
  keywords, 
  apiType: meta.apiType 
});

const combined = await guides.combineGuides({
  ids: [...mandatory, ...searched.slice(0, 3).map(g => g.id)]
});
```

**키워드 매칭 실패해도 필수 지침은 강제 포함**

### 4. 우수 사례 (≥85점) + 환경 폴백

```typescript
const pattern = bestCase.excellentSnippets.find(s => s.score >= 85);
const envAware = applyFallback(pattern, meta.uiDeps);  // openerd/tailwind 체크
```

**폴백 규칙**:
- openerd-nuxt3 없음 → 로컬 유틸
- Tailwind 없음 → 최소 CSS

### 5. 적용 + 근거 로그

```typescript
await apply({ combined, pattern: envAware });
console.log({ 
  usedGuides: combined.usedGuides, 
  pattern: pattern.file, 
  risk 
});
```

**근거 추적**: 지침 id/버전 + 우수 사례 파일(점수, 이유)

## 📋 핵심 규칙

### 1. BestCase 우선 원칙

- **항상 먼저 확인**: API 타입, 컴포넌트 사용 패턴, 우수 사례
- **없으면 경고**: 수동 확인 요청

### 2. 필수 지침 강제 로드

다음 3개는 키워드 매칭 무관하게 **무조건 포함**:

1. `{apiType}.api.connection` - API 연결 체크/연동
2. `api.validation` - API 시그니처 검증
3. `error.handling` - 에러 처리 패턴

### 3. 리스크 ≥40 처리

- `guides/high-risk` **1개만** 로드
- 자동 적용 금지
- 스캐폴딩 + TODO 체크리스트만 제공

### 4. 환경 폴백

**의존성 체크**:
- `meta.uiDeps.openerdComponents.length > 0` → openerd-nuxt3 사용
- `meta.uiDeps.tailwind === true` → Tailwind 사용

**없으면**:
- 로컬 유틸 함수 사용
- 최소한의 CSS 스타일링

### 5. 근거 로그 필수

**항상 기록**:
```typescript
{
  usedGuides: [
    { id: "grpc.api.connection", version: "2025.11.10", scope: "global" },
    { id: "api.validation", version: "2025.11.10", scope: "global" },
    { id: "error.handling", version: "2025.11.10", scope: "global" }
  ],
  pattern: {
    file: "composables/grpc.ts",
    score: 88,
    reason: "에러 핸들링 우수"
  },
  risk: 25
}
```

## 📂 지침 구조 (참고)

```text
guides/
  api/
    grpc-connection.md       # gRPC API 연동
    openapi-connection.md    # OpenAPI 연동
    validation.md            # API 검증
  error/
    handling.md              # 에러 처리
  ui/
    openerd-components.md    # openerd-nuxt3 컴포넌트
    pagination.md            # 페이지네이션 패턴
  workflow/
    core.md                  # 상세 워크플로우
    main-workflow.md         # 본 파일
  high-risk.md               # 리스크 ≥40 전용
```

## 🎯 토큰 절감 효과

| 단계 | 토큰 사용 |
|------|----------|
| 메타 지침 (main-ultra-compact.md) | ~15 토큰 |
| 본 워크플로우 동적 로드 | ~350 토큰 |
| 필수 지침 3개 | ~200 토큰 |
| 검색된 지침 3개 | ~150 토큰 |
| **총합** | **~715 토큰** |

**vs 기존 방식 (모든 지침 포함)**: ~1500 토큰
**절감률**: **52%** (715/1500)

---

**사용법**: 외부 프로젝트에서 `guides.loadGuide({ id: "workflow.main" })` 호출

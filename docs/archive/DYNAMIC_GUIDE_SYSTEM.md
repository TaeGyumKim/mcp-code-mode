# MCP 동적 지침 로드 시스템 (Claude Skills 유사)

## 🎯 핵심 개념

**"5줄 메인 지침 + 동적 지침 로드"** 방식으로 Claude Skills와 유사한 유연성 확보

### 비교표

| 항목 | Claude Skills | MCP 동적 지침 |
|------|--------------|--------------|
| **오케스트레이터** | 플랫폼 (벤더) | 직접 제어 (코드) |
| **지침 저장소** | 벤더 관리 | Git/FS (단일 진실원) |
| **버전 관리** | 플랫폼 의존 | Git tags/branches |
| **권한 제어** | 플랫폼 설정 | allowWrite, LOC 상한, dry-run |
| **투명성** | 제한적 | 근거 로그(id/버전) 필수 |
| **비용/지연** | 플랫폼 비용 | 토큰 98% 절감 가능 |
| **오프라인** | 불가 | 가능 (사내망) |
| **맞춤화** | 제한적 | 랭킹/프리플라이트/폴백 자유 |

## 📋 실행 흐름 (8단계)

### 1. 메타데이터 변환

```typescript
const metadata = await buildRequestMetadata(userRequest, workspacePath);
// → projectName, intent, targets, apiTypeHint, entities, uiDeps, allowWrite
```

### 2. BestCase 로드

```typescript
const bestCase = await bestcase.loadBestCase({
  projectName: metadata.projectName,
  category: "auto-scan-ai"
});
// → API 타입 확정, excellentSnippets (≥85점)
```

### 3. TODO 합성

```typescript
const todos = await synthesizeTodoList(metadata, bestCase);
// → 필요 작업: API 호출, 에러 처리, 포맷터, ...
```

### 4. 프리플라이트 검수

```typescript
const preflight = await preflightCheck(metadata, todos, bestCase);
// → 파일/시그니처/의존성/범위/충돌 검사
// → 리스크 산출: 10*apiMismatch + 8*missingDeps + 6*writeRangeOver + ...
// → threshold: 40 (이상 시 스캐폴딩만)
```

### 5. 키워드 추출

```typescript
if (!preflight.ok) return { mode: 'scaffold-only' };

const keywords = preflight.keywords;
// → ["grpc", "inquiry", "asyncData", "errorHandling", ...]
```

### 6. 지침 동적 로드 (🔑 핵심)

```typescript
// 검색 (BM25-like)
const guides = await guides.searchGuides({
  keywords,
  apiType: metadata.apiTypeHint,
  scope: 'project'
});
// → 태그(+15), 요약(+10), 본문(+5), API 타입(+30), Scope(+20)

// 병합 (우선순위)
const combined = await guides.combineGuides({
  ids: guides.map(g => g.id).slice(0, 5),
  context: { project: metadata.projectName, apiType: metadata.apiTypeHint }
});
// → scope (project>repo>org>global) → priority → version(최신)
// → requires/excludes 강제 적용
```

### 7. 우수 사례 패턴 적용 (🔑 핵심)

```typescript
// 우수 사례 선정
const excellentSnippet = selectExcellentSnippet(
  bestCase.patterns.aiAnalysis.excellentSnippets,
  metadata.apiTypeHint,
  keywords
);
// → 가중치: 점수(0.6) + 경로유사도(0.3) + 이유적합도(0.1)

// 패턴 추출 (증류)
const patterns = extractPatterns(excellentSnippet);
// → 클라이언트 생성, 호출 시그니처, 에러 핸들링, ...

// 환경 폴백
const envAware = applyEnvFallback(patterns, metadata.uiDeps);
// → openerd-nuxt3 없음 → 로컬 유틸
// → Tailwind 없음 → 최소 CSS
```

### 8. 코드 적용 + 검증

```typescript
// 적용 전 검증
await runChecks(); // typecheck/lint/build --dry-run

// 코드 생성/수정
await applyChanges(combined.combined, patterns, envAware);

// 로그 (근거)
console.log({
  usedGuides: combined.usedGuides, // [{ id, version, scope, priority }]
  excellentSnippet: { file, score, reason },
  risk: preflight.risk,
  changes: { files, loc }
});
```

## 🗂️ 지침 파일 스키마

```yaml
---
id: grpc.page.scaffold
scope: project|repo|org|global
apiType: grpc|openapi|any
tags: [nuxt3, pages, asyncData, errorHandling]
priority: 90            # 0~100
version: 2025.11.10     # YYYY.MM.DD
requires: [grpc.client.base]
excludes: [openapi.only]
summary: "Nuxt3 페이지에서 gRPC 패턴 적용"
---
### 체크리스트
1) useGrpcClient → useAsyncData
2) pending/error/empty 분기
3) formatDate 폴백
```

## 🔍 핵심 알고리즘

### 지침 랭킹 (BM25-like)

```typescript
function scoreGuide(guide, keywords, apiType, scope) {
  let score = 0;
  
  // API 타입 매칭 (+30)
  if (guide.apiType === apiType || guide.apiType === 'any') score += 30;
  else return 0; // 불일치 시 제외
  
  // Scope 매칭 (+20)
  if (guide.scope === scope) score += 20;
  
  // 키워드 매칭
  keywords.forEach(kw => {
    if (guide.tags.includes(kw)) score += 15;       // 태그
    if (guide.summary.includes(kw)) score += 10;    // 요약
    if (guide.content.includes(kw)) score += 5;     // 본문
  });
  
  // Priority 반영 (+priority/10)
  score += guide.priority / 10;
  
  return score;
}
```

### 지침 병합 (충돌 해결)

```typescript
function mergeGuides(guides, context) {
  // 1. 정렬: scope > priority > version
  const sorted = guides.sort((a, b) => {
    const scopeOrder = { project: 4, repo: 3, org: 2, global: 1 };
    const scopeDiff = scopeOrder[b.scope] - scopeOrder[a.scope];
    if (scopeDiff !== 0) return scopeDiff;
    
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    
    return b.version.localeCompare(a.version); // 최신 우선
  });
  
  // 2. requires/excludes 필터
  const filtered = [];
  for (const guide of sorted) {
    // excludes 체크
    if (guide.excludes?.some(id => filtered.some(g => g.id === id))) continue;
    
    // requires 체크
    if (guide.requires?.some(id => !filtered.some(g => g.id === id))) continue;
    
    filtered.push(guide);
  }
  
  return filtered;
}
```

### 우수 사례 선정

```typescript
function selectExcellentSnippet(snippets, apiType, keywords) {
  // 1. 필터: 점수 ≥85, API 타입 일치
  const candidates = snippets
    .filter(s => s.score >= 85)
    .filter(s => apiType === 'grpc' ? s.file.includes('grpc') : s.file.includes('api'));
  
  // 2. 랭킹
  const ranked = candidates.map(s => {
    const pathSim = keywords.map(k => lcs(s.file, k)).reduce((a,b) => Math.max(a,b), 0);
    const reasonScore = keywords.filter(k => s.reason.includes(k)).length * 5;
    
    const weight = 0.6 * s.score + 0.3 * pathSim + 0.1 * reasonScore;
    
    return { ...s, weight };
  });
  
  ranked.sort((a, b) => b.weight - a.weight);
  
  return ranked[0] || null;
}
```

## 🚨 리스크 게이트

```typescript
const risk =
  10 * apiMismatch +        // API 타입 불일치
  8 * missingDeps +         // 의존성 부재
  6 * writeRangeOver +      // 쓰기 범위 초과
  4 * guideConflict +       // 지침 충돌
  2 * typeWarn;             // 타입 경고

if (risk >= 40) {
  // 스캐폴딩만 생성
  return {
    mode: 'scaffold-only',
    reason: `Risk ${risk} >= 40`,
    reasons: preflight.reasons
  };
}

// 자동 적용 허용
```

## 📝 메인 지침 (5줄, 실제 프로젝트에 상주)

```markdown
1. 요청을 메타데이터(프로젝트·의도·대상·apiType·의존성·범위)로 변환하라.
2. BestCase 로드 → TODO 합성 → 프리플라이트 검수 (risk ≥ 40 시 스캐폴딩만).
3. 검증 통과 항목에서만 키워드 추출 → MCP guides.search로 지침 검색.
4. scope>priority>version 순 병합 + requires/excludes 강제 + excellentSnippets 패턴 적용.
5. typecheck/lint/build --dry-run → 적용 → 근거 로그(id·버전·우수사례·리스크).
```

## ✅ 장점

1. **유연성**: 지침을 동적으로 검색·병합하여 상황별 최적 조합
2. **투명성**: 사용 지침·우수 사례·리스크를 모두 로그로 남김
3. **안전성**: 프리플라이트 게이트로 잘못된 자동 적용 차단
4. **확장성**: 새 지침 추가 시 메타데이터만 작성하면 자동 통합
5. **오프라인**: Git/FS 기반으로 사내망에서도 작동
6. **비용 절감**: 필요한 지침만 로드하여 토큰 최소화

## 🔄 Claude Skills와의 차이

- **Claude**: 플랫폼이 지침 선정·주입 (투명성↓, 맞춤화↓)
- **MCP 동적 로드**: 직접 제어 (투명성↑, 맞춤화↑, 오프라인 가능)

## 🚀 다음 단계

1. **지침 라이브러리 구축**: `.github/instructions/guidelines/` 채우기
2. **우수 사례 큐레이션**: BestCase 스캔 결과에서 85점+ 파일 정리
3. **프리플라이트 강화**: tsc/lint/e2e 자동 훅
4. **로그 대시보드**: 사용 지침·우수 사례 통계 시각화

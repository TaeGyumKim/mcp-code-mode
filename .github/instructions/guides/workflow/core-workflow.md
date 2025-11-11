---
id: core.workflow
scope: global
apiType: any
tags: [workflow, pipeline, metadata, preflight, guides]
priority: 100
version: 2025.11.10
requires: []
excludes: []
summary: "AI 코딩 에이전트 핵심 워크플로우 - 5단계 파이프라인 (메타데이터 → TODO → 키워드 → 지침 → 적용)"
---

# AI 코딩 에이전트 핵심 워크플로우

## 5단계 파이프라인

### 1. 요청 → 메타데이터 변환

```typescript
const meta = await guides.buildRequestMetadata(userRequest, workspacePath);
// → { projectName, intent, targets, apiTypeHint, entities, uiDeps, allowWrite, constraints, riskThreshold }
```

### 2. TODO 합성 + 프리플라이트 검수

```typescript
const todos = await guides.synthesizeTodoList(meta, bestCase);
const preflight = await guides.preflightCheck(meta, todos, bestCase);

// risk >= 40 → 스캐폴딩만
if (!preflight.ok) {
  return { mode: 'scaffold-only', risk: preflight.risk };
}

// ✨ 우수 사례 선정 (BestCase excellentSnippets ≥85점)
const excellentSnippet = selectExcellentSnippet(
  bestCase.patterns.aiAnalysis.excellentSnippets,
  meta.apiTypeHint,
  preflight.keywords
);
// → 점수(0.6) + 경로유사도(0.3) + 이유적합도(0.1)로 랭킹
// → 근거 로그: "composables/grpc.ts (점수: 88, 이유: '에러 핸들링 우수')"
```

### 3. 검증된 키워드 추출

```typescript
const keywords = preflight.keywords;
// 예: ["grpc", "goods", "detail", "nuxt3", "asyncData"]
```

### 4. 지침 검색/병합

```typescript
const searchResult = await guides.searchGuides({
  keywords,
  apiType: meta.apiTypeHint,
});

const combined = await guides.combineGuides({
  ids: searchResult.guides.slice(0, 5).map(g => g.id),
  context: { project: meta.projectName, apiType: meta.apiTypeHint },
});
```

### 5. 적용 + 로그

```typescript
// ✨ 우수 사례 패턴 추출 (증류)
const patterns = extractPatterns(excellentSnippet);
// → 클라이언트 생성, 호출 시그니처, 에러 핸들링, 비동기 경계, 포맷터

// 환경 폴백 적용
const envAware = applyEnvFallback(patterns, meta.uiDeps);
// → openerd-nuxt3 없음 → 로컬 유틸
// → Tailwind 없음 → 최소 CSS

// 적용 전: typecheck/lint/dry-run
await runPreflightChecks();

// 코드 적용 (병합된 지침 + 우수 사례 패턴)
await applyChanges(combined.combined, patterns, envAware);

// 로그
console.log("사용된 지침:", combined.usedGuides);
console.log("우수 사례:", {
  file: excellentSnippet.file,
  score: excellentSnippet.score,
  reason: excellentSnippet.reason
});
```

## 리스크 스코어링

```typescript
risk = 
  10 * apiMismatch +
  8 * missingDeps +
  6 * writeRangeOver +
  4 * guideConflict +
  2 * typeWarn;

// risk < 40 → 자동 적용
// risk >= 40 → 스캐폴딩만
```

## MCP 도구 실행 순서

```
1. mcp_mcp-code-mode_list_bestcases
2. mcp_mcp-code-mode_load_bestcase
3. guides.searchGuides({ keywords, apiType })
4. guides.combineGuides({ ids, context })
5. 코드 생성/수정
```

## 우선순위

1. **BestCase** - API 타입, 컴포넌트 통계, 우수 사례 (85점+)
2. **Guides** - scope (project>repo>org>global), priority, version
3. **Default** - 경고 + 수동 확인

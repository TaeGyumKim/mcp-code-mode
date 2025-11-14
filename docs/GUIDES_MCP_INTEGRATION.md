# Guides 시스템 - Sandbox API 통합

## 🎯 핵심 개념

**❌ 잘못된 방식**: MCP 도구로 노출
```typescript
tools: ['search_guides', 'load_guide', 'combine_guides']  // ❌ 토큰 낭비
```

**✅ 올바른 방식**: Sandbox API로 제공
```typescript
// Sandbox 내부에서 사용
const guides = await guides.search({ keywords: ['grpc'] });
```

---

## 📋 Sandbox API 목록

### 1. `guides.search(input)`
키워드, API 타입, Scope 기반으로 지침을 검색합니다.

**사용 방법** (Sandbox 내부):
```typescript
const result = await guides.search({
  keywords: ["grpc", "nuxt3", "asyncData", "api"],
  apiType: "grpc",
  scope: "project",
  mandatoryIds: ["grpc.api.connection", "error.handling"]
});
```

**출력:**
- BM25-like 스코어링으로 랭킹된 지침 목록
- 필수 지침(mandatoryIds)은 자동으로 최상위 스코어(1000점)로 포함
- 각 지침의 ID, 스코어, 요약, 태그, 우선순위 정보

**특징:**
- 태그 매칭: +15점
- 요약 매칭: +10점
- 본문 매칭: +5점
- API 타입 매칭: +30점
- Scope 매칭: +20점
- Priority 반영: +priority/10점

### 2. `guides.load(input)`
특정 ID의 지침을 전체 내용과 함께 로드합니다.

**사용 방법** (Sandbox 내부):
```typescript
const result = await guides.load({
  id: "grpc.api.connection"
});
```

**출력:**
- 지침의 전체 메타데이터 (ID, scope, apiType, tags, priority, version, requires, excludes)
- 지침의 전체 내용 (Markdown)
- 파일 경로

### 3. `guides.combine(input)`
여러 지침을 우선순위 규칙에 따라 병합합니다.

**사용 방법** (Sandbox 내부):
```typescript
const result = await guides.combine({
  ids: [
    "grpc.api.connection",
    "api.validation",
    "error.handling"
  ],
  context: {
    project: "test-project",
    apiType: "grpc"
  }
});
```

**출력:**
- 병합된 지침 내용 (Markdown)
- 사용된 지침 목록 (ID, scope, priority, version)

**병합 규칙:**
1. Scope 우선: project > repo > org > global
2. Priority 우선: 높은 값이 우선
3. Version 우선: 최신 버전이 우선
4. Requires/Excludes 자동 처리

### 4. `guides.index()`
모든 가이드 파일을 스캔하여 인덱스를 반환합니다.

**사용 방법** (Sandbox 내부):
```typescript
const allGuides = await guides.index();
// 반환: Guide[] (id, scope, apiType, tags, priority, content 등)
```

---

## 🚀 실제 사용 예시

### execute 도구로 실행

```typescript
// Claude/Copilot가 실행
const result = await mcp.callTool('execute', {
  code: `
    // 1. 가이드 검색
    const searchResult = await guides.search({
      keywords: ['grpc', 'nuxt3', 'crud'],
      apiType: 'grpc',
      mandatoryIds: ['grpc.api.connection', 'api.validation']
    });

    // 2. 상위 5개 가이드 병합
    const combined = await guides.combine({
      ids: searchResult.guides.slice(0, 5).map(g => g.id),
      context: {
        project: 'myapp',
        apiType: 'grpc'
      }
    });

    return {
      guidesFound: searchResult.guides.length,
      guidesUsed: combined.usedGuides,
      combinedContent: combined.combined
    };
  `
});

// 병합된 가이드를 프롬프트에 사용
const guidelines = result.output.combinedContent;
```

## 🔧 수정 사항

### 1. CRLF → LF 정규화
**문제:** Windows 스타일 줄바꿈(`\r\n`)으로 인해 YAML front matter 파싱 실패

**해결:** `mcp-servers/guides/index.ts:64`
```typescript
// 줄바꿈 정규화 (CRLF → LF)
content = content.replace(/\r\n/g, '\n');
```

### 2. MCP 서버 통합
**파일:** `mcp-stdio-server.ts`

**추가 내용:**
- Guides 함수 import
- 4개 도구 정의 (`tools/list`)
- 4개 도구 핸들러 (`tools/call`)
- 에러 핸들링

## 📊 테스트 결과

### 발견된 지침 (11개)
1. `api.validation` - API 메서드/시그니처 존재 확인
2. `grpc.api.connection` - gRPC API 연결 필수 체크
3. `grpc.api.integration` - gRPC Proto 기반 API 통합 패턴
4. `openapi.api.connection` - OpenAPI 연결 체크
5. `openapi.api.integration` - OpenAPI 통합 패턴
6. `error.handling` - 에러 처리 패턴
7. `high-risk` - 고위험 작업 체크리스트
8. `utils.formatting` - 포맷팅 유틸리티
9. `ui.openerd.components` - openerd-nuxt3 컴포넌트 활용
10. `ui.pagination.usePaging` - 페이징 패턴
11. `nuxt.routing.navigation` - Nuxt3 라우팅

### 테스트 케이스

**Test 1: search_guides**
- 입력: `["grpc", "nuxt3", "asyncData", "api"]` + `apiType: grpc`
- 결과: ✅ 10개 지침 발견 (Top: grpc.api.integration - 114pts)

**Test 2: load_guide**
- 입력: `grpc.api.connection`
- 결과: ✅ 8746 chars 로드 성공

**Test 3: combine_guides**
- 입력: 3개 지침 (`grpc.api.connection`, `api.validation`, `error.handling`)
- 결과: ✅ 15557 chars 병합 성공

**Test 4: execute_workflow**
- 입력: "Create an inquiry list page with gRPC API integration"
- 결과: ✅ Risk 8 (통과), 4개 지침 사용, 16861 chars 병합

**Test 5: mandatory guides**
- 입력: 필수 지침 2개 + 키워드
- 결과: ✅ 필수 지침 2개 모두 1000점으로 최상위 포함

## 🔧 구현 방법

### Sandbox에 guides API 추가

`packages/ai-runner/src/sandbox.ts`:
```typescript
import * as guides from '../../../mcp-servers/guides/index.js';

export async function runInSandbox(code: string) {
  const vm = new VM({
    sandbox: {
      filesystem,
      bestcase,
      guides,  // ✅ guides API 추가
      // ... 기타 API
    }
  });

  return await vm.run(code);
}
```

### 로컬 테스트

```bash
# 전체 통합 테스트
npm run test:guides

# YAML 파서 테스트
npm run test:yaml
```

## 📈 토큰 절감 효과

**전통적인 MCP 방식 (MCP 도구로 노출):**
```typescript
tools/list 응답:
  - search_guides 정의: ~200 토큰
  - load_guide 정의: ~150 토큰
  - combine_guides 정의: ~200 토큰
  총: ~550 토큰

모든 지침 로드: ~100,000 토큰
전체: ~100,550 토큰
```

**Code Mode 방식 (Sandbox API):**
```typescript
tools/list 응답:
  - execute 정의: ~200 토큰

필요한 지침만 로드: ~6,000 토큰
전체: ~6,200 토큰

절감률: 94% 🎉
```

## 📚 참고

- [WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md) - 올바른 워크플로우 전체
- [METADATA_SYSTEM.md](./METADATA_SYSTEM.md) - 메타데이터 시스템
- [테스트 스크립트](../scripts/test/test-guides-integration.ts)
- Anthropic MCP Code Mode: https://aisparkup.com/posts/6318

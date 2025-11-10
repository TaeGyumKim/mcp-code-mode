# 🚨 BestCase 우선 참조 규칙 - 빠른 참조

> **AI 에이전트가 gRPC/OpenAPI 코드 작성 시 반드시 따라야 할 규칙**

## ⚠️ 문제 상황

**AI가 다음과 같이 작동하면 안됩니다:**

```
❌ "gRPC 연결은 하는데 MCP를 참고하지 않음"
❌ "Default 지침만 보고 실제 프로젝트 정보는 무시"
❌ "BestCase 확인 없이 추측으로 gRPC/OpenAPI 선택"
```

## ✅ 해결 방법

### 필수 실행 순서 (3단계)

```
┌──────────────────────────────────────────────┐
│  1️⃣ BestCase 목록 조회                       │
│     도구: mcp_mcp-code-mode_list_bestcases   │
│     파라미터: (없음)                          │
├──────────────────────────────────────────────┤
│  2️⃣ BestCase 로드                            │
│     도구: mcp_mcp-code-mode_load_bestcase    │
│     파라미터:                                 │
│       - projectName: "49.airian/frontend-admin" │
│       - category: "auto-scan-ai"             │
├──────────────────────────────────────────────┤
│  3️⃣ API 타입 확인 (필수!)                    │
│     bestCase.patterns.apiInfo.apiType        │
│     → "gRPC" or "OpenAPI"                    │
│                                              │
│     🚫 추측 금지! 반드시 BestCase에서 확인!   │
└──────────────────────────────────────────────┘
```

### 잘못된 예시 vs 올바른 예시

**❌ 잘못된 코드 (BestCase 미확인)**

```typescript
// ❌ 추측으로 작성 (gRPC인지 OpenAPI인지 모름!)
const client = useGrpcClient();
const data = await client.getProductList();
```

**✅ 올바른 코드 (BestCase 확인)**

```typescript
// 1. BestCase 로드 (MCP 도구 실행)
// mcp_mcp-code-mode_list_bestcases
// mcp_mcp-code-mode_load_bestcase

// 2. API 타입 확인
// bestCase.patterns.apiInfo.apiType === "gRPC"

// 3. 확인된 타입으로 코드 생성
const client = useGrpcClient(); // ✅ BestCase에서 gRPC 확인됨
const data = await client.getProductList();
```

## 📋 실전 체크리스트

**코드 생성 전 반드시 확인:**

### ✅ BestCase 확인 (필수)

- [ ] `mcp_mcp-code-mode_list_bestcases` 실행?
- [ ] `mcp_mcp-code-mode_load_bestcase` 실행?
- [ ] `patterns.apiInfo.apiType` 확인? (gRPC/OpenAPI)

**🚨 위 3단계 미완료 시 코드 생성 금지!**

### ✅ 패턴 적용 (필수)

- [ ] BestCase의 `apiType`에 맞는 클라이언트 사용?
  - `apiType === "gRPC"` → `useGrpcClient()`
  - `apiType === "OpenAPI"` → `useAsyncData(...)` or OpenAPI client
- [ ] `componentUsage` 통계에서 가장 많이 쓰는 컴포넌트 사용?
- [ ] `excellentSnippets` (85점+) 코드를 템플릿으로 사용?

### ✅ openerd-nuxt3 확인 (선택)

- [ ] 컴포넌트 사용 시: `mcp_openerd-nuxt3-search_search` 실행?
- [ ] 컴포넌트 소스 확인: `mcp_openerd-nuxt3-lib_read_file` 실행?
- [ ] Props/Slots/Events 확인?

## 🎯 실전 예시

### 사용자 요청

> "상품 목록 페이지 만들어줘"

### AI 에이전트 실행 순서

```
1️⃣ BestCase 로드
   mcp_mcp-code-mode_list_bestcases
   → 매칭: "49.airian/frontend-admin"
   
   mcp_mcp-code-mode_load_bestcase
   → apiType: "gRPC" ✅
   → componentUsage: { CommonTable: 15, CommonButton: 12 }
   → excellentSnippets: [{ file: "composables/grpc.ts", score: 88 }]

2️⃣ openerd-nuxt3 컴포넌트 확인 (선택)
   mcp_openerd-nuxt3-search_search
   pattern: "CommonTable"
   → 찾음: components/CommonTable.vue
   
   mcp_openerd-nuxt3-lib_read_file
   → Props: { list, headers, onRowClick }

3️⃣ 코드 생성
   - API 타입: gRPC (BestCase 확인)
   - 컴포넌트: CommonTable (통계 1위)
   - 패턴: composables/grpc.ts (우수 사례 88점)
```

### 생성된 코드

```vue
<template>
  <CommonLayout title="상품 목록">
    <!-- BestCase: CommonTable이 가장 많이 사용됨 (15회) -->
    <CommonTable
      :list="productList"
      :headers="headers"
      @row-click="handleRowClick"
    />
  </CommonLayout>
</template>

<script setup lang="ts">
// BestCase: apiType === "gRPC" 확인됨
// composables/grpc.ts (88점) 패턴 참고
const client = useGrpcClient();

// gRPC 호출
const { data: productList } = await client.getProductList({
  page: 1,
  limit: 10
});

const headers = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '상품명' },
  { key: 'price', label: '가격' }
];

const handleRowClick = (item: any) => {
  navigateTo(`/products/${item.id}`);
};
</script>
```

## 🔗 상세 가이드

- **전체 규칙**: [00-bestcase-priority.md](./.github/instructions/00-bestcase-priority.md)
- **활용 가이드**: [bestcase-usage.md](./.github/instructions/bestcase-usage.md)
- **실전 가이드**: [BESTCASE_PRIORITY_GUIDE.md](./BESTCASE_PRIORITY_GUIDE.md)

## 📌 핵심 요약

1. **BestCase 먼저 로드** (list → load)
2. **API 타입 확인** (gRPC/OpenAPI 추측 금지)
3. **패턴 적용** (통계 + 우수 사례)
4. **openerd-nuxt3 확인** (컴포넌트/유틸리티)
5. **검증** (BestCase vs Default 충돌 시 BestCase 우선)

**이 순서를 따르지 않으면 코드 생성이 실패하거나 잘못된 코드가 생성됩니다!**

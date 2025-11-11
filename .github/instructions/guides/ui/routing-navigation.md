---
id: nuxt.routing.navigation
scope: project
apiType: any
tags: [nuxt3, routing, navigation, ssr, useRoute, navigateTo]
priority: 80
version: 2025.11.10
requires: []
excludes: []
summary: "Nuxt3 라우팅 및 네비게이션 - SSR 안전한 패턴, route query 동기화"
---

# Nuxt3 라우팅 및 네비게이션 가이드

## SSR 환경 필수 규칙

### navigateTo() 사용 (router.push 금지)

```typescript
// ✅ SSR 안전
import { useRoute } from "vue-router";

return navigateTo({ 
  path: "/path", 
  query: { page: 1, limit: 10 } 
});

// ❌ SSR에서 오류
import { useRouter } from "vue-router";
const router = useRouter();
router.push({ path: "/path" });
```

**이유:** SSR에서 `router.push`는 동작하지 않음

### Import 규칙

```typescript
// ✅ 기본적으로 useRoute만 import
import { useRoute } from "vue-router";

// useRouter는 필요시에만
import { useRouter } from "vue-router";
```

## Route Query 동기화 패턴

### 1. Request State 정의

```typescript
const request = ref({
  page: 1,
  limit: 10,
  searchType: "title" as string,
  keyword: "" as string,
});
```

### 2. Route Query Watch

```typescript
watch(
  () => route.query,
  () => {
    request.value = {
      page: Number(route.query.page ?? 1),
      limit: Number(route.query.limit ?? 10),
      searchType: String(route.query.searchType ?? "title"),
      keyword: String(route.query.keyword ?? ""),
    };
  },
  { immediate: true },  // 초기 로드
);
```

### 3. Search Function - URL 업데이트

```typescript
function search() {
  const query: Record<string, any> = {
    page: 1,
    limit: request.value.limit,
  };

  if (request.value.searchType) {
    query.searchType = request.value.searchType;
  }

  if (request.value.keyword) {
    query.keyword = request.value.keyword;
  }

  return navigateTo({ path: route.path, query });
}
```

## 페이지 네비게이션

```typescript
// 상세 페이지로 이동
function goToDetail(id: number) {
  return navigateTo({ 
    path: `/detail/${id}` 
  });
}

// 수정 페이지로 이동 (query 포함)
function goToEdit(id: number) {
  return navigateTo({ 
    path: `/edit/${id}`,
    query: { returnUrl: route.fullPath }
  });
}
```

## 체크리스트

- [ ] `navigateTo()` 사용 (`router.push` 금지)
- [ ] `useRoute` import (useRouter는 필요시에만)
- [ ] `return navigateTo(...)` - 함수에서 return
- [ ] route.query watch로 상태 동기화
- [ ] search 함수에서 URL 업데이트

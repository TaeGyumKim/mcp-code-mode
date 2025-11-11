---
id: ui.pagination.usePaging
scope: project
apiType: any
tags: [pagination, usePaging, nuxt3, composables, ssr]
priority: 75
version: 2025.11.10
requires: []
excludes: []
summary: "usePaging composable 활용 - 자동 초기 로드, route query 연동"
---

# Pagination 패턴 가이드 (usePaging)

## usePaging Composable

### 기본 사용법

```typescript
const paging = usePaging(
  1,          // 초기 page
  10,         // 초기 limit
  0,          // 초기 total
  loadPage,   // 로드 함수
  false,      // local (false = 자동 초기 로드)
  [...]       // 의존성 배열
);
```

## 중요: local=false 설정

```typescript
// ✅ CORRECT: local=false
const paging = usePaging(1, 10, 0, loadPage, false, [...]);
// → usePaging이 자동으로 초기 loadPage 호출
// → 별도로 loadPage 호출 불필요
```

## watch에서 loadPage 호출 금지

```typescript
// ❌ WRONG: 중복 호출
watch(
  () => route.query,
  () => {
    request.value = { ... };
    loadPage();  // ❌ 금지! usePaging이 이미 호출함
  },
  { immediate: true },
);

// ✅ CORRECT: watch는 상태만 업데이트
watch(
  () => route.query,
  () => {
    request.value = { ... };
    // loadPage 호출 없음 - usePaging이 알아서 함
  },
  { immediate: true },
);
```

## API 클라이언트 설정

### useBackendClient - 빈 문자열 사용

```typescript
// ✅ 전역 로딩 설정
const client = useBackendClient("");

// ❌ 개별 로딩 키 불필요
const client = useBackendClient("featureName");
```

**이유:** 전역 로딩 상태 사용

## 완전한 패턴 예시

```typescript
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const client = useBackendClient("");

// Request 상태
const request = ref({
  page: 1,
  limit: 10,
  keyword: "",
});

// 목록 데이터
const list = ref([]);

// Load 함수
async function loadPage(page: number = 1, limit: number = 10) {
  const req = {
    page,
    limit,
    keyword: request.value.keyword,
  };

  await client
    .getList(req)
    .then((response) => {
      list.value = response.items || [];
      paging.total.value = response.totalCount || 0;
      paging.updatePagination();
    })
    .catch(async (error) => {
      await useModal?.error(error, "getList");
    });
}

// Paging (local=false로 자동 초기 로드)
const paging = usePaging(1, 10, 0, loadPage, false, [
  () => request.value.keyword,
]);

// Route query 동기화 (loadPage 호출 없음)
watch(
  () => route.query,
  () => {
    request.value = {
      page: Number(route.query.page ?? 1),
      limit: Number(route.query.limit ?? 10),
      keyword: String(route.query.keyword ?? ""),
    };
  },
  { immediate: true },
);
</script>
```

## 체크리스트

- [ ] `usePaging(..., false, [...])` - local=false 설정
- [ ] `useBackendClient("")` - 빈 문자열
- [ ] watch에서 loadPage 호출 금지
- [ ] paging.total.value 업데이트
- [ ] paging.updatePagination() 호출

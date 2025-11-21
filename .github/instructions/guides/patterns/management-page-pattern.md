---
id: management-page-pattern
version: 2025.11.21
scope: global
apiType: any
priority: 85
tags: [management, crud, table, search, pagination]
summary: Management 페이지 패턴 - CRUD 목록 관리 페이지 표준 패턴
---

# Management 페이지 패턴

> **실제 30개의 Management 페이지 bestcase에서 추출된 공통 패턴입니다.**

## 📊 패턴 분석

Management 페이지는 다음과 같은 공통 구조를 가집니다:

1. **검색/필터 섹션** - 데이터 필터링
2. **테이블 섹션** - CommonPaginationTable로 목록 표시
3. **페이지네이션** - usePaging으로 페이지 관리
4. **CRUD 버튼** - 등록/수정/삭제 기능
5. **Route Query Sync** - URL 쿼리와 상태 동기화

---

## 🎯 필수 구성 요소

### 1. 검색 필터 (Search/Filter Section)

```typescript
// 검색 요청 상태
const request = ref({
  page: 1,
  limit: 10,
  keyword: "",
  // 추가 필터 필드들...
});

// 검색 함수
function search() {
  const query: Record<string, any> = {
    page: 1,
    limit: request.value.limit
  };
  if (request.value.keyword) {
    query.keyword = request.value.keyword;
  }
  return navigateTo({ path: route.path, query });
}
```

### 2. 테이블 설정 (Table Configuration)

```typescript
// 테이블 헤더
const headers: CommonTableHeader[] = [
  { title: "순번", value: "index" },
  { title: "제목", value: "title" },
  { title: "작성일", value: "createdAt" },
  { title: "관리", value: "actions" }
];

// 데이터 리스트
const list = ref<ItemType[]>([]);
const selectedItems = ref<ItemType[]>([]);
```

### 3. 페이지네이션 (Pagination)

```typescript
const paging = usePaging(1, 10, 0, loadPage, false, [
  { title: "10개", value: "10", isDefault: true },
  { title: "50개", value: "50" }
]);

async function loadPage() {
  // API 호출하여 데이터 로드
  const response = await client.getList(request.value);
  list.value = response.items;
  paging.total.value = response.totalCount;
}
```

### 4. Route Query 동기화

```typescript
watch(
  () => route.query,
  () => {
    request.value = {
      page: Number(route.query.page ?? 1),
      limit: Number(route.query.limit ?? 10),
      keyword: String(route.query.keyword ?? "")
    };
  },
  { immediate: true }
);
```

### 5. CRUD 버튼

```typescript
// 등록
function goToRegister() {
  navigateTo("/path/to/register");
}

// 수정
function goToEdit(id: string) {
  navigateTo(`/path/to/edit/${id}`);
}

// 삭제
async function deleteItems() {
  const confirmed = await useModal?.confirm("삭제하시겠습니까?");
  if (!confirmed) return;

  await client.deleteItems({ ids: selectedItems.value.map(i => i.id) })
    .then(() => {
      loadPage(); // 목록 새로고침
    })
    .catch(async (error) => {
      await useModal?.error(error, "deleteItems");
    });
}
```

---

## 📋 완전한 예시

```vue
<template>
  <CommonLayout title="관리 페이지">
    <template #btns>
      <button @click="goToRegister">등록</button>
      <button @click="deleteItems" v-if="selectedItems.length > 0">삭제</button>
    </template>

    <!-- 검색 섹션 -->
    <div class="search-section">
      <input v-model="request.keyword" placeholder="검색어" />
      <button @click="search">검색</button>
    </div>

    <!-- 테이블 -->
    <CommonPaginationTable
      v-model:selected="selectedItems"
      :list="list"
      :headers="headers"
      :paging="paging"
      check-type="checkbox"
    >
      <template #index="{ index }">
        <td>{{ (paging.page.value - 1) * paging.limit.value + index + 1 }}</td>
      </template>
      <template #createdAt="{ element }">
        <td>{{ formatDateTime(element.createdAt) }}</td>
      </template>
      <template #actions="{ element }">
        <td>
          <button @click="goToEdit(element.id)">수정</button>
        </td>
      </template>
    </CommonPaginationTable>
  </CommonLayout>
</template>

<script lang="ts" setup>
const route = useRoute();
const client = useBackendClient("");

// 검색 요청
const request = ref({
  page: 1,
  limit: 10,
  keyword: ""
});

// 테이블 설정
const headers: CommonTableHeader[] = [
  { title: "순번", value: "index" },
  { title: "제목", value: "title" },
  { title: "작성일", value: "createdAt" },
  { title: "관리", value: "actions" }
];

const list = ref<ItemType[]>([]);
const selectedItems = ref<ItemType[]>([]);

// 페이지네이션
const paging = usePaging(1, 10, 0, loadPage, false, [
  { title: "10개", value: "10", isDefault: true },
  { title: "50개", value: "50" }
]);

// Route Query 동기화
watch(
  () => route.query,
  () => {
    request.value = {
      page: Number(route.query.page ?? 1),
      limit: Number(route.query.limit ?? 10),
      keyword: String(route.query.keyword ?? "")
    };
  },
  { immediate: true }
);

// 데이터 로드
async function loadPage() {
  await client.getList(request.value)
    .then((response) => {
      list.value = response.items;
      paging.total.value = response.totalCount;
    })
    .catch(async (error) => {
      await useModal?.error(error, "getList");
    });
}

// CRUD 함수
function search() {
  const query: Record<string, any> = {
    page: 1,
    limit: request.value.limit
  };
  if (request.value.keyword) {
    query.keyword = request.value.keyword;
  }
  return navigateTo({ path: route.path, query });
}

function goToRegister() {
  navigateTo("/path/to/register");
}

function goToEdit(id: string) {
  navigateTo(`/path/to/edit/${id}`);
}

async function deleteItems() {
  const confirmed = await useModal?.confirm("삭제하시겠습니까?");
  if (!confirmed) return;

  await client.deleteItems({ ids: selectedItems.value.map(i => i.id) })
    .then(() => {
      loadPage();
    })
    .catch(async (error) => {
      await useModal?.error(error, "deleteItems");
    });
}
</script>
```

---

## ✅ 체크리스트

- [ ] 검색 필터 구현
- [ ] CommonPaginationTable 사용
- [ ] usePaging 설정
- [ ] Route Query 동기화
- [ ] CRUD 버튼 추가
- [ ] API 에러 처리
- [ ] 날짜 포맷팅 (formatDateTime)
- [ ] navigateTo() 사용

---

## 🔍 실제 bestcase 참고

Management 페이지 bestcase 검색:

```typescript
const bestcases = await bestcase.search({
  keywords: ["Management", "crud", "table"]
});
```

**발견된 30개 bestcase 예시**:
- `00.luxurypanda-v2-frontend-admin--pages-BrandManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-CategoryImageManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-CategoryManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-CommonImageManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-ConsumerBotManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-ConsumerImageManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-EventManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-GoodsManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-HeyDealManagement-vue`
- `00.luxurypanda-v2-frontend-admin--pages-KeywordManagement-vue`

---

**자동 생성일**: 2025-11-21T04:35:03.113Z
**분석된 파일**: 30개

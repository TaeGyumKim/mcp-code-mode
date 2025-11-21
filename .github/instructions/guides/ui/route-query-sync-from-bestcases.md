---
id: route-query-sync-dynamic
version: 2025.11.21
scope: global
apiType: any
priority: 75
tags: [route.query, watch, navigateTo]
summary: Route Query Synchronization - 실제 bestcase 패턴 기반 가이드
---

# Route Query Synchronization

> **이 가이드는 1979개의 bestcase 파일에서 자동 추출된 실제 코드 패턴을 기반으로 합니다.**

## 📊 패턴 통계

- **분석된 bestcase**: 1979개 파일
- **추출된 예시**: 5개
- **키워드**: route.query, watch, navigateTo
- **평균 품질 점수**: 85점

---

## 🎯 실제 사용 패턴


### 패턴 1: Route Query Sync Pattern

**출처**: `00.luxurypanda-v2-frontend--pages-Category-[id]-vue`
**품질 점수**: 85점

```typescript
watch(
  () => route.query.path,
  async () => {
    await getProductsFilter();
    activeCategory();

    if (previousQuery.value) {
      /// list.800.100 -> list.801.100 과 같이 list 뒤에 첫번째 숫자가 바뀌면 필터 초기화
      if (previousQuery.value.split(".")[1] !== route.query.path?.toString().split(".")[1]) {
        filterLayer?.value?.filterInit();
      }
    }
  },
);

watch(
  () => onlyBrand.value,
  () => {
    filterLayer?.value?.filterInit();
  }
```


### 패턴 2: Route Query Sync Pattern

**출처**: `00.luxurypanda-v2-frontend--pages-My-Wish-vue`
**품질 점수**: 85점

```typescript
watch(
  () => route.query.tab,
  () => {
    currentTab.value = route.query.tab;
  },
);

const wishReq = computed(() => {
  const result = {} as GetWishedProductsRequest;

  result.page = route.query.page ? +route.query.page : 1;
  result.size = route.query.size ? +route.query.size : 10;

  return result;
}
```


### 패턴 3: Route Query Sync Pattern

**출처**: `00.luxurypanda-v2-frontend-admin--pages-GoodsRegistration-vue`
**품질 점수**: 85점

```typescript
watch(
  () => route.query.productId,
  () => {
    if (!route.query.productId) initPage();
  }
);

onBeforeMount(async () => {
  await categoryStore.getCategoryNodes();
  await categoryStore.getCategories();
  noticeMap.value = await initNoticeInfo();
  await brand.getBrands();

  if (route.query.productId) {
    await loadProduct();
  } else {
    initPage();
  }
  sortCurNotice();
  originData.value = copy(product.value);
}
```


### 패턴 4: Route Query Sync Pattern

**출처**: `00.luxurypanda-v2-frontend-admin--pages-LayoutSetting-vue`
**품질 점수**: 85점

```typescript
watch(
  () => route.query,
  () => {
    layoutPageQuery.value = JSON.parse(JSON.stringify(route.query));
    updatePage();
  }
);

onMounted(async () => {
  layoutPageQuery.value = JSON.parse(JSON.stringify(route.query));
  if (!layoutPageQuery.value.pageState) {
    useRouter().replace({
      path: route.path,
      query: {
        pageState: "layoutSetting",
      },
    });
  }

  updatePage();
}
```


### 패턴 5: Route Query Sync Pattern

**출처**: `00.luxurypanda-v2-frontend-admin--pages-OrderManagement-vue`
**품질 점수**: 85점

```typescript
watch(
  () => route.query.mainState,
  () => {
    if (route?.query?.mainState) {
      curStatus.value = String(route.query.mainState);
    }
  }
);

watch(
  () => route.query.states,
  () => {
    if (route?.query?.states) {
      detailStatusRef.value.checkedList = String(route.query.states).split(",");
    }
  }
);

const detailStatusView = computed(() => detailStatus[searchStatusRef?.value?.checkedList[0]]);

// interface OrderStatus extends GetOrderItemStatusResponse_Status {
//   callBack: () => void;
// }
```


---

## ✅ 체크리스트

- [ ] route.query 패턴 확인
- [ ] watch 패턴 확인
- [ ] navigateTo 패턴 확인

---

## 🔍 추가 bestcase 검색

이 패턴과 관련된 추가 bestcase를 검색하려면:

```typescript
const bestcases = await bestcase.search({
  keywords: ["route.query", "watch", "navigateTo"]
});
```

---

**자동 생성일**: 2025-11-21T04:33:05.646Z
**소스**: 5개의 bestcase 파일에서 추출

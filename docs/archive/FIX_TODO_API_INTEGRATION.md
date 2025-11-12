# TODO 자동 생성 시 API 연동 강제 추가 (2차 수정)

## 🚨 문제 상황

사용자: "배너 관리 페이지 완성해 줘"

→ Copilot이 5개 TODO 생성:
```
1. 검색 필터 UI 추가
2. 페이지네이션 적용
3. 삭제 기능 추가
4. 드래그 앤 드롭 순서 저장 기능
5. (완료)
```

→ **❌ API 연동 TODO가 없음!**
→ **❌ BestCase에 `getBannerList`, `deleteBanner` 등 API가 있는데도 연결 안 함**
→ **❌ 코드에 `// TODO: API 호출 로직 추가` 주석만 남김**

## 🎯 핵심 원인

### 1️⃣ `synthesizeTodoList()` 함수 문제

**기존 로직**:
```typescript
if (meta.intent === 'page-create') {
  todos.push({ id: 'createPageFile', ... });
  
  if (meta.apiTypeHint !== 'auto') {  // ⚠️ 조건이 약함!
    todos.push({ id: 'injectApiCall', ... });
  }
}
```

**문제점**:
- `meta.apiTypeHint`는 초기 요청 텍스트 분석으로만 설정 (기본값 `'auto'`)
- **BestCase에 API가 있는지 체크하지 않음**
- 사용자가 "API 연동"이라는 단어를 명시하지 않으면 API TODO가 생성 안 됨

### 2️⃣ 키워드 추출 문제

**기존 로직**:
```typescript
const keywords: string[] = [];
keywords.push(meta.apiTypeHint);  // 'auto' → API 관련 키워드 없음
keywords.push(...meta.entities);
keywords.push(...todos.map(t => t.id));  // API TODO 없으면 키워드도 없음
```

**문제점**:
- API TODO가 없으면 → API 관련 키워드 없음 → 필수 지침만 로드됨
- 필수 지침(`grpc.api.connection`)은 있지만 TODO에 API 작업이 없어서 실제 적용 안 됨

## ✅ 해결 방법

### 1️⃣ `synthesizeTodoList()` 개선

**BestCase API 체크 로직 추가**:

```typescript
export async function synthesizeTodoList(
  meta: RequestMetadata,
  bestCase?: any
): Promise<TodoItem[]> {
  console.error('[synthesizeTodoList] Starting TODO synthesis');
  
  const todos: TodoItem[] = [];
  
  // 🔑 BestCase에 API가 있으면 무조건 API 연동 TODO 추가
  const hasApiInBestCase = bestCase?.patterns?.apiInfo?.endpoints?.length > 0;
  
  if (hasApiInBestCase) {
    const apiType = bestCase.patterns.apiInfo.apiType?.toLowerCase() || 'grpc';
    const endpoints = bestCase.patterns.apiInfo.endpoints;
    
    console.error('[synthesizeTodoList] ⚠️ API detected in BestCase! Adding mandatory API integration TODO');
    console.error('[synthesizeTodoList] API Type:', apiType);
    console.error('[synthesizeTodoList] Endpoints:', endpoints.slice(0, 3).map((e: any) => e.method));
    
    // 🔑 API 타입 메타데이터 업데이트 (중요!)
    meta.apiTypeHint = apiType as any;
    
    // 🔑 API 연동 TODO 강제 추가
    todos.push({
      id: 'connectApi',
      files: meta.targets.length > 0 ? meta.targets : [`pages/${meta.entities[0] || 'index'}.vue`],
      loc: 80,
      description: `🔑 ${apiType.toUpperCase()} API 연결 (${endpoints.length}개 메서드 사용 가능)`,
    });
  }
  
  // Intent 기반 TODO 생성
  if (meta.intent === 'page-create' || meta.intent === 'page-update') {
    if (!hasApiInBestCase) {
      // API 없으면 기본 페이지만
      todos.push({
        id: 'createPageFile',
        files: [...],
        loc: 150,
        description: '새 페이지 파일 생성',
      });
    } else {
      // 🔑 API 있으면 페이지 + API 연동 통합
      todos.push({
        id: 'createPageWithApi',
        files: [...],
        loc: 200,
        description: 'API 연동된 페이지 생성 (데이터 로드, 테이블, CRUD)',
      });
    }
    
    todos.push({
      id: 'addAsyncBoundary',
      files: [...],
      loc: 30,
      description: '로딩/에러 상태 처리 (CommonAsyncBoundary)',
    });
  }
  
  console.error('[synthesizeTodoList] Generated TODOs:', todos.map(t => ({ id: t.id, desc: t.description })));
  
  return todos;
}
```

### 2️⃣ 키워드 추출 개선

**BestCase API 정보 기반 키워드 자동 추가**:

```typescript
const keywords: string[] = [];
if (risk < meta.riskThreshold) {
  // 🔑 API 타입 키워드 (BestCase에서 확정된 값)
  if (meta.apiTypeHint && meta.apiTypeHint !== 'auto') {
    keywords.push(meta.apiTypeHint);
    keywords.push('api', 'connection', 'client');  // API 관련 공통 키워드
    
    if (meta.apiTypeHint === 'grpc') {
      keywords.push('proto', 'useGrpcClient', 'backend');
    } else if (meta.apiTypeHint === 'openapi') {
      keywords.push('rest', 'useFetch', 'openapi');
    }
  }
  
  // 엔티티 키워드
  keywords.push(...meta.entities);
  
  // TODO 키워드
  keywords.push(...todos.map(t => t.id));
  
  // 프레임워크 공통 키워드
  keywords.push('nuxt3', 'asyncData', 'errorHandling', 'useAsyncData');
  
  // 🔑 BestCase에 API가 있으면 CRUD 키워드 추가
  if (bestCase?.patterns?.apiInfo?.endpoints?.length > 0) {
    keywords.push('crud', 'table', 'pagination', 'search', 'delete');
    console.error('[preflightCheck] ⚠️ API found, added CRUD keywords');
  }
}
```

## 🔍 수정 후 동작 흐름

```
사용자: "배너 관리 페이지 완성해 줘"
  ↓
1. buildRequestMetadata()
   - projectName: "49.airian/frontend-admin"
   - intent: "page-create"
   - apiTypeHint: "auto" (초기값)
  ↓
2. loadBestCase()
   - patterns.apiInfo.apiType: "gRPC"
   - patterns.apiInfo.endpoints: [
       { method: "getBannerList", ... },
       { method: "deleteBanner", ... },
       ...
     ]
  ↓
3. synthesizeTodoList() ← 🔑 여기서 BestCase 체크!
   - hasApiInBestCase: true (endpoints.length > 0)
   - meta.apiTypeHint 업데이트: "grpc"
   - 🔑 TODO 추가: "connectApi" (GRPC API 연결)
   - TODO 추가: "createPageWithApi" (API 연동된 페이지 생성)
   - TODO 추가: "addAsyncBoundary" (로딩/에러 처리)
  ↓
4. preflightCheck()
   - keywords: [
       "grpc", "api", "connection", "client",  ← API 관련
       "proto", "useGrpcClient", "backend",    ← gRPC 전용
       "crud", "table", "pagination", "search", "delete",  ← CRUD
       "banner",  ← 엔티티
       "connectApi", "createPageWithApi", "addAsyncBoundary",  ← TODO ID
       "nuxt3", "asyncData", "errorHandling", "useAsyncData"  ← 프레임워크
     ]
  ↓
5. searchGuides()
   - mandatoryIds: ["grpc.api.connection", "api.validation", "error.handling"]
   - keywords: ["grpc", "api", "connection", "crud", "table", ...]
   - 결과:
     1) grpc.api.connection (필수, 점수 1000)
     2) api.validation (필수, 점수 1000)
     3) error.handling (필수, 점수 1000)
     4) crud.pattern (키워드, 점수 85)
     5) table.pagination (키워드, 점수 70)
  ↓
6. combineGuides()
   - grpc.api.connection 내용:
     ```typescript
     // 1. BestCase에서 API 확인
     const bestCase = await bestcase.loadBestCase(...);
     const apiMethods = bestCase.patterns.apiInfo.endpoints.map(e => e.method);
     
     // 2. gRPC 클라이언트 import
     import { useGrpcClient } from '~/composables/grpc/useGrpcClient';
     
     // 3. API 호출
     const { data, error } = await useAsyncData('banner-list', async () => {
       const client = useGrpcClient();
       return await client.getBannerList({ page: 1, size: 10 });
     });
     
     // 4. 에러 처리
     if (error.value) {
       console.error('API Error:', error.value);
     }
     ```
  ↓
7. 코드 생성 (applyPattern)
   ✅ useGrpcClient() import
   ✅ client.getBannerList() 호출
   ✅ useAsyncData 패턴
   ✅ CommonAsyncBoundary 에러 처리
   ✅ OTable + 체크박스 + 페이지네이션
   ✅ deleteBanner() 연동
```

## 📊 로그 예시

```
[synthesizeTodoList] Starting TODO synthesis
[synthesizeTodoList] Meta: { intent: "page-create", apiTypeHint: "auto" }
[synthesizeTodoList] BestCase API info: {
  hasApi: true,
  apiType: "gRPC",
  hasEndpoints: true,
  endpointCount: 8
}
[synthesizeTodoList] ⚠️ API detected in BestCase! Adding mandatory API integration TODO
[synthesizeTodoList] API Type: grpc
[synthesizeTodoList] Endpoints: [ "getBannerList", "createBanner", "updateBanner" ]
[synthesizeTodoList] Generated TODOs: [
  { id: "connectApi", desc: "🔑 GRPC API 연결 (8개 메서드 사용 가능)" },
  { id: "createPageWithApi", desc: "API 연동된 페이지 생성 (데이터 로드, 테이블, CRUD)" },
  { id: "addAsyncBoundary", desc: "로딩/에러 상태 처리 (CommonAsyncBoundary)" }
]

[preflightCheck] ⚠️ API found, added CRUD keywords
[preflightCheck] Keywords: [
  "grpc", "api", "connection", "client", "proto", "useGrpcClient", "backend",
  "crud", "table", "pagination", "search", "delete",
  "banner",
  "connectApi", "createPageWithApi", "addAsyncBoundary",
  "nuxt3", "asyncData", "errorHandling", "useAsyncData"
]

[executeWorkflow] Mandatory guides: [
  "grpc.api.connection",
  "api.validation",
  "error.handling"
]

[searchGuides] Mandatory guide loaded: {
  id: "grpc.api.connection",
  summary: "gRPC API 연결 필수 체크 및 클라이언트 설정",
  priority: 95
}
```

## ✅ 효과

### Before (문제 상황)

```
TODO:
1. createPageFile (새 페이지 생성)
2. addAsyncBoundary (로딩/에러 처리)

코드:
<template>
  <div>
    <!-- TODO: API 호출 로직 추가 -->
    <OTable :data="dummyData" />
  </div>
</template>
```

### After (해결)

```
TODO:
1. 🔑 connectApi (GRPC API 연결 - getBannerList, deleteBanner 사용 가능)
2. createPageWithApi (API 연동된 페이지 생성)
3. addAsyncBoundary (로딩/에러 처리)

코드:
<template>
  <div>
    <CommonAsyncBoundary>
      <OTable
        :data="bannerList"
        :columns="columns"
        check-type="checkbox"
        @row-selected="handleRowSelected"
      />
    </CommonAsyncBoundary>
  </div>
</template>

<script setup lang="ts">
import { useGrpcClient } from '~/composables/grpc/useGrpcClient';

const client = useGrpcClient();

const { data: bannerList, error } = await useAsyncData('banner-list', async () => {
  return await client.getBannerList({ page: 1, size: 10 });
});

const handleDelete = async (ids: string[]) => {
  await client.deleteBanner({ ids });
  await refreshNuxtData('banner-list');
};
</script>
```

## 🎯 결론

**이제 BestCase에 API가 있으면:**
1. ✅ TODO에 "API 연결" 작업이 자동 추가됨
2. ✅ 키워드에 API 관련 용어 자동 포함됨 (grpc, api, crud, table, ...)
3. ✅ 필수 지침(grpc.api.connection) + 키워드 매칭 지침(crud.pattern) 모두 로드
4. ✅ 실제 API 호출 코드가 생성됨 (useGrpcClient, getBannerList, ...)
5. ✅ "// TODO: API 호출 로직 추가" 주석 없이 완성된 코드 제공

**사용자는 "배너 관리 페이지 만들어 줘"라고만 말해도 API 연동까지 완성됩니다!** 🚀

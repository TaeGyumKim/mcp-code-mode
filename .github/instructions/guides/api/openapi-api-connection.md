---
id: openapi.api.connection
scope: global
apiType: openapi
tags: [openapi, rest, api, connection, fetch]
priority: 95
version: 2025.11.10
requires: []
excludes: [grpc.api.connection]
summary: "OpenAPI/REST API 연결 필수 체크 및 클라이언트 설정"
---

# OpenAPI/REST API 연결 필수 지침

## 🎯 목적

**모든 페이지/컴포넌트 작성 시 OpenAPI/REST API가 있으면 반드시 연결하라.**

## ✅ 필수 체크리스트

### 1. BestCase에서 API 확인

```typescript
// BestCase patterns.apiInfo 확인
if (bestCase.patterns?.apiInfo?.hasOpenApi) {
  // OpenAPI가 존재함 → 무조건 연결 시도
}
```

### 2. 사용 가능한 엔드포인트 확인

```typescript
// BestCase patterns.apiInfo.endpoints 확인
const endpoints = bestCase.patterns.apiInfo.endpoints;
// 예: [{ method: "GET", path: "/api/banners", file: "composables/api.ts" }]
```

### 3. 현재 프로젝트의 실제 클라이언트 확인 (🔑 MCP 사용)

**먼저 현재 프로젝트에서 API 클라이언트를 찾아라:**

```typescript
// MCP 도구 사용 (실제 프로젝트 스캔)
#mcp_openerd-nuxt3_search_files
pattern: "api"
path: "composables"

// 또는
#mcp_openerd-nuxt3_search_files
pattern: "useBackendClient|useFetch"
path: "."
```

**클라이언트 파일 읽기:**

```typescript
// 발견된 파일 읽기 (예: composables/api/useApiClient.ts)
#mcp_openerd-nuxt3_read_text_file
path: "composables/api/useApiClient.ts"

// 확인사항:
// 1. export된 함수명 (useBackendClient? useApiClient?)
// 2. baseURL 설정 방법
// 3. 인터셉터/에러 핸들링
```

**올바른 import:**

```vue
<script setup lang="ts">
// ✅ 실제 확인한 경로 사용
import { useBackendClient } from '~/composables/api/useApiClient';

// ❌ BestCase 경로를 그대로 복사하지 말 것
</script>
```

### 4. API 호출 (useFetch 패턴)

```vue
<script setup lang="ts">
const client = useBackendClient('');

// 목록 조회
const { data, error, refresh, pending } = await useFetch('/api/banners', {
  query: { page: 1, limit: 10 }
});

// 상세 조회
const route = useRoute();
const { data: detail } = await useFetch(`/api/banners/${route.params.id}`);
</script>
```

### 5. 로딩/에러 처리 (🔑 MCP로 실제 구현 확인)

**openerd-nuxt3에서 CommonLoading 확인:**

```typescript
// 1. openerd-nuxt3 라이브러리에서 CommonLoading 검색
#mcp_openerd-nuxt3-lib_search_files
pattern: "CommonLoading"
path: "components"

// 2. 컴포넌트 소스 읽기
#mcp_openerd-nuxt3-lib_read_text_file
path: "components/common/CommonLoading.vue"
```

**reference-tailwind-nuxt3에서 실제 사용 예시 확인:**

```typescript
// 참조 프로젝트에서 로딩 패턴 검색
#mcp_reference-tailwind-nuxt3_search
pattern: "useFetch|pending|error"
path: "pages"

// 실제 구현 확인
#mcp_reference-tailwind-nuxt3_read_text_file
path: "pages/someExample.vue"
```

**올바른 패턴 (실제 확인 후 적용):**

```vue
<script setup lang="ts">
const { data, error, pending, refresh } = await useFetch('/api/banners', {
  onRequestError({ error }) {
    console.error('Request failed:', error);
  },
  onResponseError({ response }) {
    console.error('Response error:', response.status);
  }
});
</script>

<template>
  <div>
    <!-- ✅ 실제 확인한 CommonLoading 패턴 사용 -->
    <CommonLoading v-if="pending" />
    
    <!-- ✅ 참조 프로젝트에서 확인한 에러 처리 패턴 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error.message }}</p>
      <button @click="refresh">다시 시도</button>
    </div>
    
    <div v-else>
      <!-- 데이터 렌더링 -->
    </div>
  </div>
</template>
```

## 🚨 절대 하지 말 것

❌ **BestCase 경로를 그대로 복사** → 현재 프로젝트와 다를 수 있음  
❌ **MCP 도구 없이 추측으로 import** → 파일 없으면 에러  
❌ **더미 데이터로만 작업** → API 연결 누락  
❌ **로딩/에러 처리 없이 API 호출** → UX 저하  
❌ **openerd-nuxt3 확인 없이 컴포넌트 사용** → Props/Slots 불일치

## ✅ 올바른 작업 순서

1. **🔍 현재 프로젝트 스캔** (MCP: search_files)
   - API 클라이언트 위치 확인
   - 실제 export 함수명 확인

2. **📖 클라이언트 소스 읽기** (MCP: read_text_file)
   - baseURL 설정 방법
   - 인터셉터/에러 핸들링

3. **🔍 openerd-nuxt3 확인** (MCP: openerd-nuxt3-lib)
   - CommonLoading Props/Slots
   - 사용 방법

4. **📖 참조 프로젝트 확인** (MCP: reference-tailwind-nuxt3)
   - 실제 사용 패턴
   - 로딩/에러 처리 구현

5. **✍️ 코드 작성**
   - 실제 확인한 경로로 import
   - 확인한 패턴으로 구현

## ✅ 올바른 패턴 (예시)

```vue
<script setup lang="ts">
import { useBackendClient } from '~/composables/api';

const client = useBackendClient('');

// 1. 목록 조회
const page = ref(1);
const limit = ref(10);

const { data: bannerList, error, refresh, pending } = await useFetch('/api/banners', {
  query: computed(() => ({ page: page.value, limit: limit.value }))
});

// 2. 생성/수정/삭제
const createBanner = async (formData: any) => {
  try {
    const result = await $fetch('/api/banners', {
      method: 'POST',
      body: formData
    });
    await refresh();
    return result;
  } catch (error) {
    console.error('Create failed:', error);
  }
};

const updateBanner = async (id: number, formData: any) => {
  try {
    const result = await $fetch(`/api/banners/${id}`, {
      method: 'PUT',
      body: formData
    });
    await refresh();
    return result;
  } catch (error) {
    console.error('Update failed:', error);
  }
};

const deleteBanner = async (id: number) => {
  try {
    await $fetch(`/api/banners/${id}`, {
      method: 'DELETE'
    });
    await refresh();
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
</script>

<template>
  <div>
    <div v-if="pending">로딩 중...</div>
    
    <div v-else-if="error">
      <p>에러 발생: {{ error.message }}</p>
      <button @click="refresh">다시 시도</button>
    </div>
    
    <div v-else-if="bannerList && bannerList.length > 0">
      <!-- 실제 데이터 렌더링 -->
    </div>
    
    <div v-else>
      데이터가 없습니다.
    </div>
  </div>
</template>
```

## 📊 우선순위

1. **BestCase API 정보 확인** → 엔드포인트 존재 여부
2. **클라이언트 import** → 경로 확인 (composables/api.ts)
3. **useFetch 패턴** → SSR 안전
4. **에러 처리** → onRequestError/onResponseError
5. **로딩/에러 상태** → v-if 분기 또는 AsyncBoundary

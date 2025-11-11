---
id: grpc.api.connection
scope: global
apiType: grpc
tags: [grpc, api, connection, client, composable, proto, types]
priority: 95
version: 2025.11.11
requires: [api.validation]
excludes: [openapi.api.connection]
summary: "gRPC API 연결 필수 체크 및 클라이언트 설정 (Proto 타입 직접 사용)"
---

# gRPC API 연결 필수 지침

## 🎯 목적

**모든 페이지/컴포넌트 작성 시 gRPC API가 있으면 반드시 연결하라.**

## 🚨 핵심 원칙: Proto 타입 직접 사용

**절대 interface 재정의 금지! Proto Message 클래스를 그대로 사용하라.**

```typescript
// ❌ 잘못된 방법: interface 재정의 (데이터 원본성 훼손)
interface OrderTableData {
  순번: number;
  상태: string;
  주문금액: string;  // Proto Money → string 변환
  _raw?: GetOrderItemProductGroupListResponse_OrderItem;  // 원본 중복 저장
}

const transformData = (raw: OrderItem): OrderTableData => {
  return {
    순번: index + 1,
    상태: raw.state,
    주문금액: raw.price?.units?.toString() || '0',  // 수동 변환
    _raw: raw  // 원본 보관
  };
};

// ✅ 올바른 방법: Proto 타입 직접 사용
type OrderItem = GetOrderItemProductGroupListResponse_OrderItem;

const items = ref<OrderItem[]>([]);

// 테이블에서도 Proto 타입 그대로 사용
const orderColumns = computed(() => [
  { key: 'orderItemId', label: '주문번호' },
  { key: 'state', label: '상태', format: (val: OrderItemState) => formatState(val) },
  { key: 'price', label: '금액', format: (val: Money) => formatMoney(val) },
  { key: 'createdAt', label: '생성일', format: (val: Timestamp) => formatDate(val) }
]);
```

### 왜 interface 재정의를 금지하는가?

1. **데이터 원본성 훼손**: Proto 타입이 정답인데 임의로 변환하면 정보 손실
2. **중복 저장**: `_raw` 필드로 원본 보관 → 메모리 낭비
3. **타입 불일치**: Proto 업데이트 시 수동 변환 로직도 함께 수정 필요
4. **유지보수 어려움**: 데이터 흐름 추적 복잡

### Proto 타입 활용 패턴

```typescript
// 1. Proto Message를 type alias로 사용
import type { 
  GetUserListResponse_User,
  GetOrderItemProductGroupListResponse_OrderItem,
  Money,
  Timestamp
} from '@airian/proto/types/proto_pb';

type User = GetUserListResponse_User;
type OrderItem = GetOrderItemProductGroupListResponse_OrderItem;

// 2. ref/reactive에 Proto 타입 직접 사용
const users = ref<User[]>([]);
const selectedOrder = ref<OrderItem | null>(null);

// 3. 테이블 컬럼에서 format 함수 활용
const columns = [
  { 
    key: 'createdAt', 
    label: '생성일',
    format: (val: Timestamp) => {
      if (!val) return '-';
      return new Date(Number(val.seconds) * 1000).toLocaleDateString('ko-KR');
    }
  },
  {
    key: 'price',
    label: '금액',
    format: (val: Money) => {
      if (!val?.units) return '0원';
      return `${val.units.toLocaleString()}원`;
    }
  }
];

// 4. 옵셔널 필드는 ?. 체이닝
const orderInfo = computed(() => ({
  courier: selectedOrder.value?.courier || '-',
  trackingNumber: selectedOrder.value?.trackingNumber || '-',
  productName: selectedOrder.value?.product?.productName || '알 수 없음'
}));
```

## 📋 작업 컨텍스트 로깅 (필수)

**모든 gRPC 작업 시작 시 컨텍스트를 명시적으로 로그하라:**

```typescript
console.log('[gRPC 작업 시작]', {
  file: 'pages/memberManagement.vue',
  task: '회원관리 페이지 - 회원 목록/주문 내역 조회',
  protoTypes: [
    'GetUserListRequest',
    'GetUserListResponse_User',
    'GetOrderItemProductGroupListRequest',
    'GetOrderItemProductGroupListResponse_OrderItem'
  ],
  methods: [
    'client.getUserList({ page, limit })',
    'client.getOrderItemProductGroupList({ userId })'
  ],
  usedGuides: [
    { id: 'grpc.api.connection', version: '2025.11.11' },
    { id: 'api.validation', version: '2025.11.11' }
  ],
  protoFile: 'node_modules/@airian/proto/dist/types/proto_pb.d.ts'
});

// API 호출 직전
console.log('[gRPC 호출]', {
  method: 'getUserList',
  request: { page: 1, limit: 10 },
  expectedType: 'GetUserListResponse'
});

// API 응답 직후
console.log('[gRPC 응답]', {
  method: 'getUserList',
  userCount: response.users.length,
  totalCount: response.totalCount,
  protoType: response.constructor.name  // 'GetUserListResponse'
});
```

**로그 목적:**
1. **투명성**: 어떤 파일을 읽고 무슨 작업을 하는지 명확히
2. **디버깅**: 타입 불일치/에러 발생 시 추적 용이
3. **검증**: main.instructions.md 워크플로우 준수 여부 확인
4. **근거**: 사용한 지침 ID/버전 기록

## ✅ 필수 체크리스트

### 1. BestCase에서 API 확인

```typescript
// BestCase patterns.apiInfo 확인
if (bestCase.patterns?.apiInfo?.hasGrpc) {
  // gRPC API가 존재함 → 무조건 연결 시도
}
```

### 2. 사용 가능한 메서드 확인

```typescript
// BestCase patterns.apiInfo.endpoints 확인
const endpoints = bestCase.patterns.apiInfo.endpoints;
// 예: [{ method: "getBannerList", file: "composables/grpc.ts" }]
```

### 3. 현재 프로젝트의 실제 클라이언트 확인 (🔑 MCP 사용)

**먼저 현재 프로젝트에서 gRPC 클라이언트를 찾아라:**

```typescript
// MCP 도구 사용 (실제 프로젝트 스캔)
#mcp_openerd-nuxt3_search_files
pattern: "grpc"
path: "composables"

// 또는
#mcp_openerd-nuxt3_search_files
pattern: "useGrpcClient"
path: "."
```

**클라이언트 파일 읽기:**

```typescript
// 발견된 파일 읽기 (예: composables/grpc/useGrpcClient.ts)
#mcp_openerd-nuxt3_read_text_file
path: "composables/grpc/useGrpcClient.ts"

// 확인사항:
// 1. export된 함수명 (useGrpcClient? createGrpcClient?)
// 2. 사용 가능한 메서드 목록
// 3. 파라미터 타입 정의
```

**올바른 import:**

```vue
<script setup lang="ts">
// ✅ 실제 확인한 경로 사용
import { useGrpcClient } from '~/composables/grpc/useGrpcClient';

// ❌ BestCase 경로를 그대로 복사하지 말 것
</script>
```

### 4. API 호출 (useAsyncData 패턴)

```vue
<script setup lang="ts">
const client = useGrpcClient();

// 목록 조회
const { data, error, refresh, pending } = await useAsyncData(
  'bannerList',
  () => client.getBannerList({ page: 1, limit: 10 })
);

// 상세 조회 (ID 파라미터)
const route = useRoute();
const { data: detail } = await useAsyncData(
  'bannerDetail',
  () => client.getBanner({ id: Number(route.params.id) })
);
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

// 확인사항: Props, Slots, 사용 방법
```

**reference-tailwind-nuxt3에서 실제 사용 예시 확인:**

```typescript
// 참조 프로젝트에서 로딩 패턴 검색
#mcp_reference-tailwind-nuxt3_search
pattern: "CommonLoading|pending|error"
path: "pages"

// 실제 구현 확인
#mcp_reference-tailwind-nuxt3_read_text_file
path: "pages/someExample.vue"

// 확인사항:
// 1. CommonLoading 사용 패턴
// 2. pending 상태 처리
// 3. error 상태 처리
// 4. retry 로직
```

**올바른 패턴 (실제 확인 후 적용):**

```vue
<script setup lang="ts">
const { data, error, pending, refresh } = await useAsyncData(
  'bannerList',
  () => client.getBannerList({})
);
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
   - gRPC 클라이언트 위치 확인
   - 실제 export 함수명 확인

2. **📖 클라이언트 소스 읽기** (MCP: read_text_file)
   - 사용 가능한 메서드 목록
   - 파라미터 타입 정의

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
import { useGrpcClient } from '~/composables/grpc';
import { catchError } from '~/composables/utils';

const client = useGrpcClient();

// 1. 목록 조회 + 페이징
const page = ref(1);
const limit = ref(10);

const { data: bannerList, error, refresh, pending } = await useAsyncData(
  'bannerList',
  () => client.getBannerList({ page: page.value, limit: limit.value }).catch(catchError)
);

// 2. 생성/수정/삭제
const createBanner = async (formData: any) => {
  try {
    const result = await client.createBanner(formData);
    await refresh(); // 목록 새로고침
    return result;
  } catch (error) {
    catchError(error);
  }
};

const updateBanner = async (id: number, formData: any) => {
  try {
    const result = await client.updateBanner({ id, ...formData });
    await refresh();
    return result;
  } catch (error) {
    catchError(error);
  }
};

const deleteBanner = async (id: number) => {
  try {
    await client.deleteBanner({ id });
    await refresh();
  } catch (error) {
    catchError(error);
  }
};
</script>

<template>
  <div>
    <CommonAsyncBoundary :pending="pending" :error="error">
      <template #loading>
        <div>로딩 중...</div>
      </template>
      
      <template #error="{ retry }">
        <div>
          <p>에러 발생</p>
          <button @click="retry">다시 시도</button>
        </div>
      </template>
      
      <div v-if="bannerList && bannerList.length > 0">
        <!-- 실제 데이터 렌더링 -->
      </div>
      
      <div v-else>
        데이터가 없습니다.
      </div>
    </CommonAsyncBoundary>
  </div>
</template>
```

## 📊 우선순위

1. **BestCase API 정보 확인** → 메서드 존재 여부
2. **클라이언트 import** → 경로 확인 (composables/grpc.ts)
3. **useAsyncData 패턴** → SSR 안전
4. **에러 처리** → catchError 또는 try/catch
5. **로딩/에러 상태** → CommonAsyncBoundary 사용

# MCP 도구 활용 필수화 (4차 수정)

## 🎯 사용자 요구사항

1. **openerd-nuxt3 관련은 openerd-nuxt3-* MCP에서 실제 코드 확인 후 작업 진행**
2. **로딩/에러처리도 openerd-nuxt3-* CommonLoading 참고 + reference-tailwind-nuxt3-* 참고**

## ❌ 이전 문제 (3차까지)

```markdown
### 3. 클라이언트 import

```vue
<script setup lang="ts">
import { useGrpcClient } from '~/composables/grpc';
// 또는 BestCase에서 확인한 경로
</script>
```
```

**문제점:**
- BestCase 경로를 **추측**으로 import
- 현재 프로젝트에 실제로 `composables/grpc.ts`가 있는지 모름
- openerd-nuxt3 컴포넌트 Props/Slots를 **추측**으로 사용
- 에러 발생 후에야 문제 발견

## ✅ 해결 방법 (4차 수정)

### 1️⃣ gRPC API 연결 지침 개선

**Before:**
```markdown
### 3. 클라이언트 import

```vue
import { useGrpcClient } from '~/composables/grpc';
```
```

**After:**
```markdown
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
```

### 2️⃣ 로딩/에러 처리 개선

**Before:**
```markdown
### 5. 에러 처리 (catchError 유틸)

```vue
import { catchError } from '~/composables/utils';
```
```

**After:**
```markdown
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
```

### 3️⃣ API 검증 지침 개선

**Before:**
```markdown
### 2. 클라이언트 파일 존재 확인

```typescript
const grpcClientPath = 'composables/grpc.ts';
// → filesystem API로 파일 존재 확인
```
```

**After:**
```markdown
### 2. 클라이언트 파일 존재 확인 (🔑 MCP 사용)

**현재 프로젝트에서 실제 파일 검색:**

```typescript
// gRPC 클라이언트 검색
#mcp_openerd-nuxt3_search_files
pattern: "grpc"
path: "composables"

// 결과: composables/grpc/useGrpcClient.ts 발견
```

**파일 읽어서 메서드 확인:**

```typescript
#mcp_openerd-nuxt3_read_text_file
path: "composables/grpc/useGrpcClient.ts"

// 확인사항:
// 1. export된 함수 (useGrpcClient, createGrpcClient 등)
// 2. client 객체의 메서드 목록
// 3. 각 메서드의 파라미터 타입
```
```

### 4️⃣ 작업 순서 명확화

**올바른 작업 순서:**

```
1. 🔍 현재 프로젝트 스캔 (MCP: search_files)
   - gRPC 클라이언트 위치 확인
   - 실제 export 함수명 확인

2. 📖 클라이언트 소스 읽기 (MCP: read_text_file)
   - 사용 가능한 메서드 목록
   - 파라미터 타입 정의

3. 🔍 openerd-nuxt3 확인 (MCP: openerd-nuxt3-lib)
   - CommonLoading Props/Slots
   - 사용 방법

4. 📖 참조 프로젝트 확인 (MCP: reference-tailwind-nuxt3)
   - 실제 사용 패턴
   - 로딩/에러 처리 구현

5. ✍️ 코드 작성
   - 실제 확인한 경로로 import
   - 확인한 패턴으로 구현
```

## 📊 MCP 도구 사용 예시

### 시나리오: "배너 관리 페이지 작성"

#### Step 1: gRPC 클라이언트 찾기

```typescript
#mcp_openerd-nuxt3_search_files
pattern: "grpc"
path: "composables"

// 결과:
// - composables/grpc/useGrpcClient.ts
// - composables/grpc/proto/banner.proto
```

#### Step 2: 클라이언트 파일 읽기

```typescript
#mcp_openerd-nuxt3_read_text_file
path: "composables/grpc/useGrpcClient.ts"

// 확인:
// export const useGrpcClient = () => {
//   return {
//     getBannerList: (params: GetBannerListRequest) => {...},
//     createBanner: (params: CreateBannerRequest) => {...},
//     ...
//   }
// }
```

#### Step 3: CommonLoading 확인

```typescript
#mcp_openerd-nuxt3-lib_search_files
pattern: "CommonLoading"
path: "components"

// 결과:
// - components/common/CommonLoading.vue
```

```typescript
#mcp_openerd-nuxt3-lib_read_text_file
path: "components/common/CommonLoading.vue"

// 확인:
// <template>
//   <div class="loading-spinner">
//     <slot />
//   </div>
// </template>
// Props: size?, color?
```

#### Step 4: 참조 프로젝트 확인

```typescript
#mcp_reference-tailwind-nuxt3_search
pattern: "CommonLoading"
path: "pages"

// 결과:
// - pages/notices.vue (사용 예시 발견)
```

```typescript
#mcp_reference-tailwind-nuxt3_read_text_file
path: "pages/notices.vue"

// 확인:
// <CommonLoading v-if="pending" />
// <div v-else-if="error">...</div>
// <div v-else>{{ data }}</div>
```

#### Step 5: 코드 작성

```vue
<script setup lang="ts">
// ✅ Step 2에서 확인한 경로
import { useGrpcClient } from '~/composables/grpc/useGrpcClient';

const client = useGrpcClient();

// ✅ Step 2에서 확인한 메서드와 파라미터
const { data, error, pending } = await useAsyncData(
  'bannerList',
  () => client.getBannerList({ page: 1, limit: 10 })
);
</script>

<template>
  <div>
    <!-- ✅ Step 3,4에서 확인한 패턴 -->
    <CommonLoading v-if="pending" />
    
    <div v-else-if="error" class="error-state">
      <p>{{ error.message }}</p>
    </div>
    
    <div v-else>
      <!-- 데이터 렌더링 -->
    </div>
  </div>
</template>
```

## 🚨 금지 사항

❌ **BestCase 경로 그대로 복사**
```vue
<!-- ❌ 틀림 -->
import { useGrpcClient } from '~/composables/grpc';
```

❌ **추측으로 Props 사용**
```vue
<!-- ❌ 틀림 -->
<CommonLoading :show="true" :text="'로딩 중...'" />
```

❌ **MCP 도구 없이 코드 작성**
```vue
<!-- ❌ 틀림 -->
// 파일이 있는지도 모르는 상태에서
import { useGrpcClient } from '~/utils/grpc';
```

## ✅ 올바른 패턴

✅ **MCP로 실제 확인**
```typescript
#mcp_openerd-nuxt3_search_files → 파일 위치 확인
#mcp_openerd-nuxt3_read_text_file → export 함수 확인
```

✅ **실제 확인한 경로 사용**
```vue
<!-- ✅ 맞음 -->
import { useGrpcClient } from '~/composables/grpc/useGrpcClient';
```

✅ **참조 프로젝트에서 패턴 확인**
```typescript
#mcp_reference-tailwind-nuxt3_search → 사용 예시 검색
#mcp_reference-tailwind-nuxt3_read_text_file → 실제 코드 확인
```

## 🎯 수정된 파일

1. `.github/instructions/guidelines/grpc-api-connection.md`
   - MCP 도구 사용 패턴 추가
   - openerd-nuxt3-lib 참조 추가
   - reference-tailwind-nuxt3 참조 추가

2. `.github/instructions/guidelines/openapi-api-connection.md`
   - MCP 도구 사용 패턴 추가
   - 로딩/에러 처리 MCP 참조 추가

3. `.github/instructions/guidelines/api-validation.md`
   - MCP 도구로 파일 존재 확인
   - MCP 도구로 메서드 시그니처 확인

## 📈 효과

### Before (추측 기반)

```
1. BestCase 경로 복사
2. import { useGrpcClient } from '~/composables/grpc'
3. ❌ 파일 없음 → 에러
4. ❌ Props 불일치 → 에러
5. ❌ 메서드 없음 → 에러
```

### After (MCP 확인 기반)

```
1. MCP로 파일 검색 → composables/grpc/useGrpcClient.ts 발견
2. MCP로 소스 읽기 → export const useGrpcClient 확인
3. MCP로 CommonLoading 확인 → Props/Slots 확인
4. MCP로 참조 프로젝트 확인 → 실제 사용 패턴 확인
5. ✅ 확인한 경로로 import
6. ✅ 확인한 Props 사용
7. ✅ 확인한 메서드 호출
```

## 🎯 결론

**이제 모든 코드 작성 전에 MCP 도구로 실제 프로젝트를 먼저 확인합니다:**
- ✅ 파일 위치 확인 (search_files)
- ✅ 소스 코드 확인 (read_text_file)
- ✅ 라이브러리 확인 (openerd-nuxt3-lib)
- ✅ 참조 예시 확인 (reference-tailwind-nuxt3)

**추측 금지, 확인 필수!** 🚀

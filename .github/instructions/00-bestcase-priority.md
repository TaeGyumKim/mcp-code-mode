---
applyTo: "**/*"
priority: 1
---

# ⚠️ 최우선 규칙: BestCase 기반 코드 생성

## 🚨 절대 금지 사항

**❌ BestCase 확인 없이 코드 생성 금지!**

**다음 작업 전에 반드시 BestCase를 먼저 로드하세요:**

```
┌─────────────────────────────────────────────┐
│  코드 생성 작업 예시                          │
├─────────────────────────────────────────────┤
│  ✅ gRPC 클라이언트 생성                      │
│  ✅ OpenAPI 클라이언트 생성                   │
│  ✅ Composables 작성                        │
│  ✅ 컴포넌트 사용                            │
│  ✅ API 호출 코드                            │
│  ✅ 유틸리티 함수                            │
│  ✅ 페이지 생성                              │
└─────────────────────────────────────────────┘

  🚫 위 작업 전 BestCase 확인 필수!
  
  실행 순서:
  1️⃣ mcp_mcp-code-mode_list_bestcases
  2️⃣ mcp_mcp-code-mode_load_bestcase
  3️⃣ patterns.apiInfo.apiType 확인
  4️⃣ 코드 생성
```

**잘못된 예시:**
```typescript
// ❌ BestCase 확인 없이 추측으로 작성
const client = useGrpcClient(); // gRPC인지 OpenAPI인지 모름!
```

**올바른 예시:**
```typescript
// ✅ BestCase 먼저 로드
// 1. mcp_mcp-code-mode_list_bestcases 실행
// 2. mcp_mcp-code-mode_load_bestcase 실행
// 3. apiInfo.apiType 확인 → "gRPC" or "OpenAPI"
// 4. 확인된 타입에 맞게 코드 생성
if (apiType === "gRPC") {
  const client = useGrpcClient();
} else {
  const { data } = await useAsyncData(...);
}
```

## 🎯 핵심 원칙

**모든 코드 생성 작업은 현재 프로젝트의 BestCase를 우선 참조해야 합니다.**

## 🚀 작업 시작 전 필수 실행 (MCP 도구 사용)

**코드 생성/수정 요청을 받으면 가장 먼저 다음 MCP 도구를 실행하세요:**

### Step 1: BestCase 목록 조회

```
도구: mcp_mcp-code-mode_list_bestcases
파라미터: (없음)
```

**결과 예시:**
```json
[
  {
    "id": "49.airian-frontend-admin-auto-scan-ai-1762527767113",
    "projectName": "49.airian/frontend-admin",
    "category": "auto-scan-ai",
    "score": 68,
    "timestamp": 1762527767113
  },
  {
    "id": "50.dktechin-frontend-auto-scan-ai-1762537863463",
    "projectName": "50.dktechin/frontend",
    "category": "auto-scan-ai",
    "score": 52,
    "timestamp": 1762537863463
  }
]
```

### Step 2: 현재 워크스페이스와 매칭

**현재 워크스페이스 경로에서 프로젝트명 추출:**

- 경로: `D:/01.Work/01.Projects/49.airian/frontend-admin`
- 추출: 마지막 2개 디렉토리 → `49.airian/frontend-admin`

**매칭 로직:**
```typescript
// 워크스페이스: D:/01.Work/01.Projects/49.airian/frontend-admin
// → projectName: "49.airian/frontend-admin"
// → 목록에서 찾기: bc.projectName === "49.airian/frontend-admin"
// → 매칭: id "49.airian-frontend-admin-auto-scan-ai-1762527767113"
```

### Step 3: BestCase 로드

```
도구: mcp_mcp-code-mode_load_bestcase
파라미터:
  projectName: "49.airian/frontend-admin"
  category: "auto-scan-ai"
```

**결과에서 확인할 핵심 정보:**
```json
{
  "patterns": {
    "apiInfo": {
      "hasGrpc": true,          // ← gRPC 사용 여부
      "hasOpenApi": false,       // ← OpenAPI 사용 여부
      "apiType": "gRPC"          // ← API 타입
    },
    "componentUsage": {
      "CommonTable": 15,         // ← 가장 많이 사용
      "CommonButton": 12,
      "CommonPaginationTable": 8
    },
    "aiAnalysis": {
      "excellentSnippets": [
        {
          "file": "composables/grpc.ts",
          "score": 88,
          "reason": "에러 핸들링 우수"
        }
      ]
    }
  }
}
```

## 📋 우선순위 규칙

### 1순위: 현재 프로젝트 BestCase

**BestCase 로드 후 코드 생성 시:**

```typescript
// ✅ BestCase 패턴 적용 예시

// 1. API 타입에 따라 클라이언트 선택
if (bestCase.patterns.apiInfo.apiType === "gRPC") {
  // gRPC 클라이언트 사용
  const client = useGrpcClient();
  
  // BestCase에서 우수 사례 찾기
  const grpcFile = bestCase.patterns.aiAnalysis.excellentSnippets
    .find(s => s.file.includes('grpc.ts'));
  
} else if (bestCase.patterns.apiInfo.apiType === "OpenAPI") {
  // OpenAPI 클라이언트 사용
  const client = useBackendClient("");
  
  const apiFile = bestCase.patterns.aiAnalysis.excellentSnippets
    .find(s => s.file.includes('api.ts'));
}

// 2. 컴포넌트 선택 (사용 빈도 기반)
const topComponents = Object.entries(bestCase.patterns.componentUsage)
  .sort(([, a], [, b]) => b - a);

const mostUsedComponent = topComponents[0][0]; // 예: "CommonTable"
// → 새 페이지 생성 시 CommonTable 우선 사용
```

### 2순위: openerd-nuxt3 라이브러리 확인

**컴포넌트 또는 유틸리티 사용 전 반드시 openerd-nuxt3 확인:**

#### 컴포넌트 사용 시

**Step 1: openerd-nuxt3에서 컴포넌트 검색**

```
도구: mcp_openerd-nuxt3-search_search
파라미터:
  pattern: "CommonTable"  (사용할 컴포넌트명)
```

**Step 2: 컴포넌트 소스 읽기**

```
도구: mcp_openerd-nuxt3-lib_read_file
파라미터:
  path: "components/CommonTable.vue"
```

**확인 사항:**
- Props 타입 및 필수/선택 여부
- v-model 구조
- Slot 정의 (특히 CommonTable: header의 value를 slot name으로 사용)
- Event 정의

**Step 3: 참조 프로젝트에서 사용 예시 찾기**

```
도구: mcp_reference-tailwind-nuxt3-search_search
파라미터:
  pattern: "CommonTable"
  path: "/workspace"
```

#### 유틸리티 함수 사용 시

**Step 1: openerd-nuxt3 유틸리티 확인**

```
도구: mcp_openerd-nuxt3-search_search
파라미터:
  pattern: "format"  (예: formatNumber, formatDate)
```

**Step 2: 유틸리티 소스 읽기**

```
도구: mcp_openerd-nuxt3-lib_read_file
파라미터:
  path: "utils/format.ts"
```

**Step 3: 사용 가능 여부 판단**

- ✅ **있으면**: openerd-nuxt3에서 import
  ```typescript
  import { formatNumber, formatDate } from 'openerd-nuxt3/utils'
  ```

- ❌ **없으면**: 프로젝트에 새로 생성
  ```typescript
  // ~/utils/format.ts 생성
  export const formatNumber = (value: number) => { ... }
  ```

### 3순위: Default 지침 (BestCase 없을 때만)

**BestCase를 찾을 수 없는 경우:**

1. 사용자에게 명시적으로 알림
2. openerd-nuxt3 확인 (2순위 적용)
3. Default 지침 또는 다른 지침 파일 참조
4. 수동으로 API 타입 확인 필요

```typescript
// BestCase 없을 때 대응
console.warn("⚠️ 이 프로젝트의 BestCase를 찾을 수 없습니다.");
console.warn("사용 가능한 프로젝트:", allBestCases.map(c => c.projectName));
console.warn("openerd-nuxt3 컴포넌트를 확인합니다.");
```

### 충돌 시 해결 규칙

**BestCase vs Default 지침 충돌 시 → BestCase 우선**

예시:
```
시나리오: 목록 페이지 생성

Default 지침: "이 프로젝트는 gRPC를 사용합니다"
BestCase:     { apiType: "OpenAPI" }
→ 결정: OpenAPI 사용 (BestCase 우선)

Default 지침: "CommonTable 사용"
BestCase:     { componentUsage: { CommonPaginationTable: 15, CommonTable: 3 } }
→ 결정: CommonPaginationTable 사용 (BestCase 통계 우선)
```

## 🚫 절대 금지 사항

### ❌ 잘못된 접근 (이미지 오류 원인)

**문제 1: MCP 도구를 사용하지 않음**
```typescript
// ❌ 추측으로 코드 작성 (BestCase 확인 안함)
const client = useBackendClient(""); // gRPC? OpenAPI? 모름!
```

**해결:**
```
1. mcp_mcp-code-mode_list_bestcases 실행
2. mcp_mcp-code-mode_load_bestcase 실행
3. patterns.apiInfo.apiType 확인 후 코드 생성
```

**문제 2: Default 지침만 참고**
```typescript
// ❌ Default 지침: "이 프로젝트는 gRPC를 사용합니다"
// (실제로는 OpenAPI일 수 있음)
```

**해결:**
```
BestCase가 있으면 BestCase의 apiType 우선
BestCase가 없으면 Default 지침 + 경고
```

**문제 3: 다른 프로젝트 BestCase 참고**
```
도구: mcp_mcp-code-mode_load_bestcase
파라미터:
  projectName: "다른프로젝트"  // ❌ 틀림!
  category: "auto-scan-ai"
```

**해결:**
```
현재 워크스페이스 경로에서 프로젝트명 추출
예: D:/01.Work/01.Projects/49.airian/frontend-admin
→ projectName: "49.airian/frontend-admin"
```

### ✅ 올바른 접근 (실전 예시)

**시나리오: 사용자가 "상품 목록 페이지 만들어줘" 요청**

**Step 1: BestCase 조회**
```
도구: mcp_mcp-code-mode_list_bestcases
```

**Step 2: 현재 프로젝트 매칭**
```typescript
// 워크스페이스: D:/01.Work/01.Projects/49.airian/frontend-admin
// 추출: "49.airian/frontend-admin"
// 매칭: 목록에서 projectName === "49.airian/frontend-admin" 찾기
```

**Step 3: BestCase 로드**
```
도구: mcp_mcp-code-mode_load_bestcase
파라미터:
  projectName: "49.airian/frontend-admin"
  category: "auto-scan-ai"
```

**Step 4: 패턴 분석**
```json
{
  "patterns": {
    "apiInfo": { "apiType": "gRPC" },
    "componentUsage": { "CommonTable": 15, "CommonButton": 12 },
    "aiAnalysis": {
      "excellentSnippets": [
        { "file": "composables/grpc.ts", "score": 90 }
      ]
    }
  }
}
```

**Step 5: 코드 생성**
```vue
<template>
  <CommonLayout title="상품 목록">
    <!-- BestCase에서 CommonTable이 가장 많이 사용됨 -->
    <CommonTable
      :list="productList"
      :headers="headers"
    />
  </CommonLayout>
</template>

<script setup lang="ts">
// BestCase에서 apiType === "gRPC" 확인됨
// composables/grpc.ts (90점) 패턴 참고
const client = useGrpcClient();

// gRPC 호출
const { data: productList } = await client.getProductList({
  page: 1,
  limit: 10
});
</script>
```

## 📝 실전 체크리스트

**🚨 코드 생성 전 반드시 확인! BestCase 확인 없이 코드 작성 금지!**

### ✅ 1단계: BestCase 로드 (필수)

- [ ] `mcp_mcp-code-mode_list_bestcases` 실행했는가?
- [ ] 현재 워크스페이스에서 프로젝트명 추출했는가?
  - 예: `D:/01.Work/01.Projects/49.airian/frontend-admin` → `"49.airian/frontend-admin"`
- [ ] 목록에서 매칭되는 BestCase 찾았는가?

### ✅ 2단계: BestCase 데이터 확인 (필수)

- [ ] `mcp_mcp-code-mode_load_bestcase` 실행했는가?
- [ ] `projectName` 파라미터가 정확한가?
- [ ] `category`는 `"auto-scan-ai"`인가?

### ✅ 3단계: API 타입 확인 (필수)

**🚨 가장 중요! 이걸 안하면 gRPC/OpenAPI 추측으로 작성하게 됨!**

- [ ] `patterns.apiInfo.apiType` 확인했는가? (gRPC/OpenAPI)
- [ ] `patterns.componentUsage` 통계 확인했는가?
- [ ] `patterns.aiAnalysis.excellentSnippets` (85점+) 참고했는가?

**위 3단계를 완료하지 않았다면 코드 생성 중단!**

### ✅ 4단계: openerd-nuxt3 확인 (선택)

#### 컴포넌트 사용 시

- [ ] `mcp_openerd-nuxt3-search_search`로 컴포넌트 검색했는가?
- [ ] `mcp_openerd-nuxt3-lib_read_file`로 소스 읽었는가?
- [ ] Props, v-model, Slot, Event 확인했는가?
- [ ] `mcp_reference-tailwind-nuxt3-search_search`로 사용 예시 찾았는가?

#### 유틸리티 함수 필요 시

- [ ] `mcp_openerd-nuxt3-search_search`로 유틸리티 검색했는가?
  - 예: "formatNumber", "formatDate", "debounce"
- [ ] openerd-nuxt3에 있으면 해당 것 사용하는가?
- [ ] 없으면 프로젝트에 새로 생성하는가?

### ✅ 5단계: 코드 생성 (필수)

- [ ] BestCase의 API 타입에 맞는 클라이언트 사용했는가?
  - `apiType === "gRPC"` → `useGrpcClient()`
  - `apiType === "OpenAPI"` → `useAsyncData(...)` or OpenAPI client
- [ ] 가장 많이 사용된 컴포넌트 우선 선택했는가?
- [ ] openerd-nuxt3 컴포넌트를 올바르게 사용했는가?
- [ ] openerd-nuxt3 유틸리티를 우선 사용했는가?
- [ ] 우수 사례 코드를 템플릿으로 활용했는가?

### ✅ 6단계: 검증 (필수)

- [ ] Default 지침과 BestCase가 충돌하는가? → **BestCase 우선**
- [ ] BestCase가 없는 경우 사용자에게 알렸는가?
- [ ] openerd-nuxt3 컴포넌트를 제대로 확인했는가?
- [ ] 생성한 코드가 BestCase 패턴을 따르는가?

## 🔍 워크스페이스별 프로젝트명 매핑 예시

| 워크스페이스 경로 | 추출된 projectName |
|------------------|-------------------|
| `D:/01.Work/01.Projects/49.airian/frontend-admin` | `"49.airian/frontend-admin"` |
| `D:/01.Work/01.Projects/50.dktechin/frontend` | `"50.dktechin/frontend"` |
| `D:/01.Work/01.Projects/14.dream2m/frontend-admin` | `"14.dream2m/frontend-admin"` |
| `/Users/dev/projects/mycompany/backend` | `"mycompany/backend"` |

**추출 로직:** 경로를 `/` 또는 `\`로 분할 → 마지막 2개 디렉토리 → `/`로 결합

**추출 로직:** 경로를 `/` 또는 `\`로 분할 → 마지막 2개 디렉토리 → `/`로 결합

## 🎯 실전 대응 시나리오

### 시나리오 A: BestCase가 있는 경우 (정상)

**사용자 요청:** "상품 관리 페이지 만들어줘"

**AI 에이전트 실행 순서:**

1. **BestCase 로드**
   ```
   mcp_mcp-code-mode_list_bestcases
   → 매칭: "49.airian/frontend-admin"
   
   mcp_mcp-code-mode_load_bestcase
   → apiType: "gRPC"
   → componentUsage: { CommonTable: 15, CommonButton: 12 }
   ```

2. **openerd-nuxt3 컴포넌트 확인**
   ```
   mcp_openerd-nuxt3-search_search
   pattern: "CommonTable"
   → 찾음: components/CommonTable.vue
   
   mcp_openerd-nuxt3-lib_read_file
   path: "components/CommonTable.vue"
   → Props 확인: list, headers, v-model:selected
   → Slot 확인: header의 value를 slot name으로 사용
   ```

3. **참조 프로젝트에서 사용 예시 확인**
   ```
   mcp_reference-tailwind-nuxt3-search_search
   pattern: "CommonTable"
   → 사용 예시 10개 찾음
   → 패턴: v-model:selected, :list, :headers
   ```

4. **유틸리티 함수 확인**
   ```
   mcp_openerd-nuxt3-search_search
   pattern: "formatNumber"
   → 찾음: utils/format.ts
   
   mcp_openerd-nuxt3-lib_read_file
   path: "utils/format.ts"
   → formatNumber(value, options) 존재 ✅
   ```

5. **코드 생성** (BestCase + openerd-nuxt3 기반)
   ```vue
   <template>
     <CommonLayout title="상품 관리">
       <!-- ✅ BestCase: CommonTable 15회 사용 -->
       <!-- ✅ openerd-nuxt3 소스 확인: Props, Slots 적용 -->
       <CommonTable
         v-model:selected="selectedProducts"
         :list="productList"
         :headers="headers"
       >
         <!-- ✅ Slot: header의 value를 slot name으로 -->
         <template #price="{ item }">
           <!-- ✅ openerd-nuxt3 유틸리티 사용 -->
           {{ formatNumber(item.price) }}원
         </template>
       </CommonTable>
     </CommonLayout>
   </template>
   
   <script setup lang="ts">
   // ✅ BestCase: apiType === "gRPC"
   const client = useGrpcClient();
   
   // ✅ openerd-nuxt3 유틸리티 import
   import { formatNumber } from 'openerd-nuxt3/utils'
   
   const { data: productList } = await client.getProductList({
     page: 1,
     limit: 10
   });
   </script>
   ```

### 시나리오 B: BestCase가 없는 경우 (경고)

**사용자 요청:** "상품 관리 페이지 만들어줘"

**AI 에이전트 실행 순서:**

1. **MCP 도구 실행**
   ```
   mcp_mcp-code-mode_list_bestcases
   ```

2. **프로젝트 매칭**
   - 워크스페이스: `D:/01.Work/01.Projects/new-project/frontend`
   - 프로젝트명: `"new-project/frontend"`
   - 매칭 결과: ❌ 없음

3. **사용자에게 알림**
   ```
   ⚠️ 이 프로젝트의 BestCase를 찾을 수 없습니다.
   
   사용 가능한 프로젝트:
   - 49.airian/frontend-admin
   - 50.dktechin/frontend
   - 14.dream2m/frontend-admin
   
   Default 지침을 적용하거나, 수동으로 API 타입을 확인해주세요.
   ```

4. **대체 방법**
   - Default 지침 참조
   - 또는 사용자에게 API 타입 질문
   - 또는 package.json 분석

### 시나리오 C: BestCase와 Default 충돌 (BestCase 우선)

**사용자 요청:** "목록 페이지 만들어줘"

**충돌 상황:**
- Default 지침: "이 프로젝트는 gRPC를 사용합니다"
- BestCase: `{ apiType: "OpenAPI" }`

**AI 에이전트 판단:**

```
✅ BestCase 우선 원칙 적용
→ OpenAPI 클라이언트 사용
→ Default 지침 무시

이유: BestCase는 실제 프로젝트 스캔 결과이므로 더 정확함
```

## 📚 상세 가이드

전체 BestCase 활용 방법은 [bestcase-usage.md](./bestcase-usage.md) 참조

**핵심 요약:**

1. **항상 MCP 도구 먼저 실행** (`list_bestcases` → `load_bestcase`)
2. **API 타입은 BestCase에서 확인** (추측 금지)
3. **openerd-nuxt3 컴포넌트/유틸리티 우선 확인**
   - 컴포넌트: `mcp_openerd-nuxt3-search_search` → `read_text_file`
   - 유틸리티: openerd-nuxt3에 있으면 사용, 없으면 생성
4. **참조 프로젝트에서 사용 예시 확인** (`mcp_reference-tailwind-nuxt3-search_search`)
5. **컴포넌트는 사용 통계 우선** (가장 많이 쓰는 것)
6. **우수 사례 (85점+) 코드를 템플릿으로**
7. **Default 지침과 충돌 시 BestCase 우선**

---

**이 규칙을 준수하면 첨부 이미지와 같은 오류(API를 못 찾는 문제)가 발생하지 않습니다.**

## 🔧 MCP 도구 참조표

### BestCase 관련

| 도구명 | 파라미터 | 용도 |
|--------|----------|------|
| `mcp_mcp-code-mode_list_bestcases` | (없음) | 전체 BestCase 목록 조회 |
| `mcp_mcp-code-mode_load_bestcase` | projectName, category | 특정 BestCase 로드 |

### openerd-nuxt3 관련

| 도구명 | 파라미터 | 용도 |
|--------|----------|------|
| `mcp_openerd-nuxt3-search_search` | pattern, path | 컴포넌트/유틸리티 검색 |
| `mcp_openerd-nuxt3-lib_read_file` | path | 소스 파일 읽기 |

**경로 예시:**
- 컴포넌트: `D:/01.Work/01.Projects/00.common/openerd-nuxt3/components/CommonTable.vue`
- 유틸리티: `D:/01.Work/01.Projects/00.common/openerd-nuxt3/utils/format.ts`

### 참조 프로젝트 관련

| 도구명 | 파라미터 | 용도 |
|--------|----------|------|
| `mcp_reference-tailwind-nuxt3-search_search` | pattern, path | 특정 프로젝트 검색 |
| `mcp_reference-nuxt-projects-all_search` | pattern, path | 전체 프로젝트 검색 |
| `mcp_workspace-fs-all_read_file` | path | 참조 파일 읽기 |

**검색 범위:**
- `reference-tailwind-nuxt3`: 50.dktechin/frontend (참조 프로젝트)
- `reference-nuxt-projects-all`: D:/01.Work/01.Projects (전체 프로젝트)

**사용 순서:**

1. BestCase 로드 (API 타입, 컴포넌트 통계 확인)
2. openerd-nuxt3 확인 (컴포넌트/유틸리티 존재 여부)
3. 참조 프로젝트 검색 (실제 사용 예시)
4. 코드 생성 (BestCase + openerd-nuxt3 패턴 적용)

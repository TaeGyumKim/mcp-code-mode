# BestCase 우선 참조 규칙 - 실전 가이드

## 🎯 문제 해결

**이전 문제 (첨부 이미지):**
- AI가 default 지침만 참고
- 실제 프로젝트의 API 정보를 찾지 못함
- 코드가 완성되지 않음

**해결 방법:**
- MCP 도구를 **직접 실행**하도록 지침 수정
- TypeScript 예시 코드 → **실행 가능한 MCP 도구 호출**로 변경
- BestCase 우선 참조 강제

---

## 📝 새로운 지침 파일

### `.github/instructions/00-bestcase-priority.md`

**priority: 1** (최우선 적용)

**핵심 변경사항:**

#### Before (문제)

```typescript
// ❌ AI가 실행할 수 없는 예시 코드
const allBestCases = await mcp.list_bestcases();
const matchingCase = allBestCases.find(bc => ...);
```

#### After (해결)

```
✅ 실제 MCP 도구 호출 (v3.0 Code Mode)

도구: execute (단일 도구)
코드:
  const cases = await bestcase.search({ keyword: 'product list' });
  const fileCase = await bestcase.load(cases[0].id);
```

---

## 🚀 AI 에이전트 실행 흐름

### Step 1: 사용자 요청

```
User: "상품 목록 페이지 만들어줘"
```

### Step 2: AI가 자동 실행 (v3.0 RAG 자동 추천 포함)

```
1. execute 도구 호출 (autoRecommend 파라미터 사용)
   → RAG 기반 유사 코드 자동 검색
   → context.recommendations에 참조 코드 주입

2. Sandbox API 활용
   bestcase.search({ keyword: 'product' })
   → 결과: FileCase 목록 (유사도 점수 포함)

3. 선택된 FileCase 로드
   bestcase.load('project::path/to/file.vue')

   → 결과:
   {
     "patterns": {
       "apiInfo": { "apiType": "gRPC" },
       "componentUsage": { "CommonTable": 15 },
       "aiAnalysis": { "excellentSnippets": [...] }
     }
   }

3. openerd-nuxt3 컴포넌트 확인
   mcp_openerd-nuxt3-search_search
   pattern: "CommonTable"
   → 찾음: components/CommonTable.vue
   
   mcp_openerd-nuxt3-lib_read_file
   path: "components/CommonTable.vue"
   → Props: list, headers, v-model:selected
   → Slots: header의 value를 slot name으로

4. 참조 프로젝트 사용 예시 확인
   mcp_reference-tailwind-nuxt3-search_search
   pattern: "CommonTable"
   → 사용 예시 10개 찾음

5. 유틸리티 함수 확인
   mcp_openerd-nuxt3-search_search
   pattern: "formatNumber"
   → 찾음: utils/format.ts ✅

6. 코드 생성 (BestCase + openerd-nuxt3 기반)
   - gRPC 클라이언트 사용 (apiType 확인)
   - CommonTable 우선 사용 (통계 확인)
   - openerd-nuxt3 Props/Slots 패턴 적용
   - openerd-nuxt3 유틸리티 사용 (formatNumber)
   - composables/grpc.ts 패턴 참고 (우수 사례)
```

### Step 3: 생성된 코드

```vue
<template>
  <CommonLayout title="상품 목록">
    <!-- ✅ BestCase: CommonTable 15회 사용 → 우선 선택 -->
    <!-- ✅ openerd-nuxt3: Props/Slots 패턴 확인 후 적용 -->
    <CommonTable
      v-model:selected="selectedProducts"
      :list="productList"
      :headers="headers"
    >
      <!-- ✅ openerd-nuxt3: header의 value를 slot name으로 -->
      <template #price="{ item }">
        <!-- ✅ openerd-nuxt3 유틸리티 사용 -->
        {{ formatNumber(item.price) }}원
      </template>
    </CommonTable>
  </CommonLayout>
</template>

<script setup lang="ts">
// ✅ BestCase: apiType === "gRPC" → gRPC 클라이언트
const client = useGrpcClient();

// ✅ openerd-nuxt3: 유틸리티 import
import { formatNumber } from 'openerd-nuxt3/utils'

// ✅ BestCase: composables/grpc.ts (90점) 패턴 참고
const { data: productList } = await client.getProductList({
  page: 1,
  limit: 10
});
</script>
```

---

## 🔍 체크리스트 (AI 에이전트용)

**코드 생성 전 반드시 실행:**

### FileCase 확인 (v3.0 Code Mode)

- [ ] 1. `execute` 도구로 `bestcase.search()` 실행
- [ ] 2. RAG 기반 유사 코드 자동 검색 (autoRecommend 사용)
- [ ] 3. 목록에서 유사도 높은 FileCase 선택
- [ ] 4. `bestcase.load()` 로 상세 정보 로드
- [ ] 5. `analysis.apiMethods` 확인 (gRPC/REST)
- [ ] 6. `analysis.componentsUsed` 통계 확인
- [ ] 7. `content`에서 실제 코드 참고

### 가이드 확인

- [ ] 8. `guides.search()`로 관련 가이드 검색
- [ ] 9. `mcp_openerd-nuxt3-lib_read_file`로 소스 읽기
- [ ] 10. Props, v-model, Slots, Events 확인
- [ ] 11. `mcp_reference-tailwind-nuxt3-search_search`로 사용 예시 찾기
- [ ] 12. 유틸리티 함수 openerd-nuxt3에 있는지 확인
- [ ] 13. 있으면 openerd-nuxt3에서 import, 없으면 생성

### 코드 생성

- [ ] 14. BestCase 기반 코드 생성
- [ ] 15. openerd-nuxt3 패턴 적용

**BestCase 없을 경우:**

- [ ] 사용자에게 명시적으로 알림
- [ ] 사용 가능한 프로젝트 목록 표시
- [ ] openerd-nuxt3 확인 (2순위 적용)
- [ ] Default 지침 적용 (차선책)

---

## 📊 프로젝트명 매핑 예시

| 워크스페이스 | 추출된 projectName |
|-------------|-------------------|
| `D:/01.Work/01.Projects/49.airian/frontend-admin` | `"49.airian/frontend-admin"` |
| `D:/01.Work/01.Projects/50.dktechin/frontend` | `"50.dktechin/frontend"` |

**추출 로직:**
```
경로: D:/01.Work/01.Projects/49.airian/frontend-admin
분할: ['D:', '01.Work', '01.Projects', '49.airian', 'frontend-admin']
마지막 2개: ['49.airian', 'frontend-admin']
결합: "49.airian/frontend-admin"
```

---

## 🎯 시나리오별 대응

### A. BestCase 있음 (정상)

```
✅ MCP 도구 실행 → BestCase 로드 → 패턴 적용 → 코드 생성
```

### B. BestCase 없음 (경고)

```
⚠️ BestCase 없음 → 사용자 알림 → Default 지침 또는 수동 확인
```

### C. BestCase vs Default 충돌

```
BestCase 우선 → Default 지침 무시 → BestCase 패턴 적용
```

---

## 📚 관련 문서

| 문서 | 설명 |
|------|------|
| [00-bestcase-priority.md](./.github/instructions/00-bestcase-priority.md) | 최우선 규칙 (AI 에이전트용) |
| [bestcase-usage.md](./.github/instructions/bestcase-usage.md) | BestCase 활용 상세 가이드 |
| [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) | 전체 변경 이력 |

---

## ✅ 적용 효과

**Before:**
- ❌ Default 지침만 참고 → API 타입 추측 → 오류

**After:**
- ✅ MCP 도구 실행 → BestCase 로드 → 정확한 API 타입 → 성공

**결과:**
- 첨부 이미지와 같은 "API를 못 찾는 오류" 해결
- 프로젝트별 최적화된 코드 자동 생성
- 일관성 있는 코딩 스타일 유지

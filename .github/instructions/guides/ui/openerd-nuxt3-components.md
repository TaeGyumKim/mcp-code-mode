---
id: ui.openerd.components
scope: project
apiType: any
tags: [openerd-nuxt3, ui, components, commonTable, tailwind, nuxt3]
priority: 85
version: 2025.11.10
requires: []
excludes: []
summary: "openerd-nuxt3 컴포넌트 라이브러리 활용 - 검색, 소스 확인, Props/Slots 패턴"
---

# openerd-nuxt3 컴포넌트 활용 가이드

## 적용 시점

CommonTable, CommonButton, CommonLayout 등 openerd-nuxt3 컴포넌트 사용 시

## 필수 워크플로우

### Step 1: 컴포넌트 라이브러리 확인

**MCP 도구:**
```
mcp_openerd-nuxt3-lib_search_files
pattern: "CommonTable" (사용할 컴포넌트명)
```

### Step 2: 소스 파일 읽기

**MCP 도구:**
```
mcp_openerd-nuxt3-lib_read_text_file
path: "components/common/CommonTable.vue"
```

**확인 사항:**
- Component props와 타입
- v-model 구조 (예: `v-model:selected`)
- Slot 정의 (CommonTable: header의 value를 slot name으로)
- Event 정의

### Step 3: 참조 프로젝트에서 사용 예시 찾기

**MCP 도구:**
```
mcp_reference-tailwind-nuxt3_search
pattern: "CommonTable"
path: "."
```

**확인:**
- 실제 사용 패턴
- Data binding 방법
- Event handling 접근
- 일반적인 설정

### Step 4: 패턴에 따라 구현

```vue
<template>
  <CommonTable
    v-model:selected="selectedItems"
    :list="items"
    :headers="headers"
  >
    <!-- Slot: header의 value를 slot name으로 -->
    <template #price="{ element }">
      {{ formatNumber(element.price) }}
    </template>
  </CommonTable>
</template>
```

## CommonTable 특별 규칙

- **Header value**: 실제 객체 필드명과 정확히 일치해야 함
- **Template slot names**: header의 value를 slot name으로 사용
- **Custom fields**: "순번", "관리" 같은 커스텀 필드는 별도 slot 필요
- **Selection**: `v-model:selected` 사용
- **Button disabled**: `:disabled` 사용, `v-if` 사용 금지

## 체크리스트

- [ ] openerd-nuxt3에서 컴포넌트 검색
- [ ] 소스 파일 읽고 Props/Slots 확인
- [ ] 참조 프로젝트에서 사용 예시 확인
- [ ] Header value = 실제 필드명 (CommonTable)
- [ ] Slot names = header value (CommonTable)
- [ ] v-model 올바르게 사용

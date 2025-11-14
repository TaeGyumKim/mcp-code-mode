# 디자인 시스템 활용 가이드

## 🎯 목적

MCP 작업 시 프로젝트의 디자인 시스템을 **자동 감지**하여, 해당 디자인 시스템이 제공하는 **컴포넌트, 패턴, API를 참고**하여 일관된 코드를 생성합니다.

## 🎨 지원 디자인 시스템 (7개)

| 디자인 시스템 | 패키지 | 컴포넌트 네이밍 | 문서 |
|--------------|--------|----------------|------|
| **openerd-nuxt3** | `@openerd/nuxt3` | Common* (CommonTable, CommonButton) | [Docs](https://openerd.com/docs) |
| **element-plus** | `element-plus` | El* (ElTable, ElButton, ElInput) | [Docs](https://element-plus.org) |
| **vuetify** | `vuetify` | V* (VDataTable, VBtn, VTextField) | [Docs](https://vuetifyjs.com) |
| **quasar** | `quasar` | Q* (QTable, QBtn, QInput) | [Docs](https://quasar.dev) |
| **primevue** | `primevue` | DataTable, Button, InputText | [Docs](https://primevue.org) |
| **ant-design-vue** | `ant-design-vue` | A* (ATable, AButton, AInput) | [Docs](https://antdv.com) |
| **naive-ui** | `naive-ui` | N* (NDataTable, NButton, NInput) | [Docs](https://naiveui.com) |

## 📋 전체 워크플로우

```
1. 프로젝트 스캔
   ↓
2. 디자인 시스템 자동 감지 (컴포넌트 네이밍 패턴 기반)
   ↓
3. 디자인 시스템 컴포넌트 매핑 조회
   ↓
4. guides 검색 시 designSystem 우선순위 부스트
   ↓
5. 해당 디자인 시스템의 컴포넌트를 사용하여 코드 생성
```

## 🚀 사용 방법

### 1. Sandbox에서 직접 사용 (권장)

```typescript
// MCP execute 도구로 실행
await mcp.callTool('execute', {
  code: `
    // 1. 프로젝트 메타데이터 추출
    const files = await filesystem.scanProject('/projects/myapp');

    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://ollama:11434',
      model: 'qwen2.5-coder:7b'
    });

    const projectMeta = await analyzer.analyzeProject('/projects/myapp', files, 3);

    console.log('Detected Design System:', projectMeta.designSystem);
    // → "openerd-nuxt3"

    // 2. 디자인 시스템 정보 조회
    const dsInfo = metadata.getDesignSystemInfo(projectMeta.designSystem);
    console.log('Available Components:', Object.keys(dsInfo.components));
    // → ["table", "button", "input", "modal", "layout", "select", "paging"]

    // 3. 특정 컴포넌트 정보 조회
    const tableComponent = metadata.getComponentForDesignSystem(
      projectMeta.designSystem,
      'table'
    );
    console.log('Table Component:', tableComponent.name);        // "CommonTable"
    console.log('Usage:', tableComponent.usage);                 // "<CommonTable :data="items" ... />"
    console.log('Props:', tableComponent.props);                 // ["data", "columns", "loading", ...]

    // 4. 컴포넌트 매핑 일괄 조회
    const components = metadata.getComponentMap(projectMeta.designSystem);
    // → { table: 'CommonTable', button: 'CommonButton', input: 'CommonInput', ... }

    // 5. guides 검색 (designSystem 우선순위 부스트)
    const guidesResult = await guides.search({
      keywords: ['table', 'crud', 'pagination'],
      apiType: projectMeta.apiType,
      designSystem: projectMeta.designSystem  // 🎨 +25~40점 부스트
    });

    // 6. 코드 생성
    const generatedCode = \`
<template>
  <div class="container">
    <\${components.table}
      :data="users"
      :columns="columns"
      :loading="loading"
      @row-click="handleRowClick"
    />
    <\${components.paging}
      v-model:page="page"
      :total="total"
    />
  </div>
</template>

<script setup lang="ts">
const users = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
</script>
    \`;

    return {
      designSystem: projectMeta.designSystem,
      components,
      guidesResult,
      generatedCode
    };
  `
});
```

### 2. 디자인 시스템별 컴포넌트 비교

```typescript
// 동일한 컴포넌트 타입의 디자인 시스템별 구현 비교
const designSystems = ['openerd-nuxt3', 'element-plus', 'vuetify'];
const componentTypes = ['table', 'button', 'input', 'modal'];

for (const dsId of designSystems) {
  console.log(`\n${dsId}:`);
  for (const type of componentTypes) {
    const comp = metadata.getComponentForDesignSystem(dsId, type);
    if (comp) {
      console.log(`  ${type}: ${comp.name}`);
    }
  }
}

// 출력:
// openerd-nuxt3:
//   table: CommonTable
//   button: CommonButton
//   input: CommonInput
//   modal: CommonModal
//
// element-plus:
//   table: ElTable
//   button: ElButton
//   input: ElInput
//   modal: ElDialog
//
// vuetify:
//   table: VDataTable
//   button: VBtn
//   input: VTextField
//   modal: VDialog
```

### 3. 실제 코드 생성 시나리오

```typescript
// 사용자 요청: "상품 목록 페이지를 만들어줘"

// Step 1: 프로젝트 메타데이터 추출
const projectMeta = await metadata.analyzeProject(path, files, 3);
// → designSystem: "openerd-nuxt3"

// Step 2: 컴포넌트 매핑 가져오기
const components = metadata.getComponentMap(projectMeta.designSystem);
// → { table: 'CommonTable', button: 'CommonButton', ... }

// Step 3: 가이드 검색 (디자인 시스템 우선순위)
const guides = await guides.search({
  keywords: ['table', 'crud', 'product'],
  designSystem: projectMeta.designSystem
});

// Step 4: 코드 생성
const code = `
<template>
  <div class="products-page">
    <div class="actions">
      <${components.button} type="primary" @click="handleAdd">
        Add Product
      </${components.button}>
    </div>

    <${components.table}
      :data="products"
      :columns="columns"
      :loading="loading"
      @row-click="handleRowClick"
    />

    <${components.paging}
      v-model:page="page"
      :total="total"
      :page-size="pageSize"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const products = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = ref(10);

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Product Name' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' }
];

const handleAdd = () => {
  console.log('Add product');
};

const handleRowClick = (row: any) => {
  console.log('Product selected:', row);
};
</script>
`;
```

## 💡 핵심 장점

### 1. ✅ 일관성 유지

프로젝트의 기존 디자인 시스템과 일관된 컴포넌트를 자동으로 사용합니다.

```typescript
// ❌ 잘못된 예 (프로젝트는 openerd-nuxt3인데 element-plus 컴포넌트 사용)
<ElTable :data="items" />

// ✅ 올바른 예 (자동으로 감지된 디자인 시스템 사용)
<CommonTable :data="items" />
```

### 2. ✅ 올바른 컴포넌트 사용법

각 디자인 시스템의 올바른 props, events, 사용 패턴을 참고합니다.

```typescript
const tableComponent = metadata.getComponentForDesignSystem('vuetify', 'table');

console.log(tableComponent.name);  // "VDataTable"
console.log(tableComponent.props); // ["items", "headers", "loading", "search", "sort-by"]
console.log(tableComponent.usage); // "<VDataTable :items="items" :headers="headers" />"
```

### 3. ✅ 가이드 우선순위 자동 부스트

디자인 시스템 관련 가이드가 자동으로 우선 검색됩니다.

```typescript
// designSystem 없이 검색
await guides.search({ keywords: ['table'] });
// → 일반 점수: 15~30점

// designSystem과 함께 검색
await guides.search({
  keywords: ['table'],
  designSystem: 'openerd-nuxt3'  // 🎨 +25~40점 부스트
});
// → 관련 가이드 점수: 55~70점 (상위 노출)
```

## 🧪 테스트

```bash
# 디자인 시스템 통합 테스트 실행
npx tsx scripts/test/test-design-system-integration.ts
```

**테스트 내용:**
1. 디자인 시스템 컴포넌트 매핑 조회
2. guides 검색 시 designSystem 우선순위 확인
3. 실제 코드 생성 시나리오

## 📊 가이드 검색 점수 시스템

| 조건 | 점수 |
|------|------|
| **필수 지침 (mandatory)** | 1000점 (최상위) |
| **API Type 매칭** | +30점 |
| **Scope 매칭** | +20점 |
| **✨ Design System ID 완전 매칭** | +40점 |
| **✨ Design System 태그 매칭** | +35점 |
| **✨ Design System 내용 매칭** | +25점 |
| **키워드 태그 매칭** | +15점 |
| **키워드 요약 매칭** | +10점 |
| **키워드 내용 매칭** | +5점 |
| **Priority 반영** | +priority/10점 |

## 🔄 기존 코드와의 호환성

기존 시스템은 그대로 유지되며, `designSystem` 필드는 **선택적(optional)**입니다:

```typescript
// ✅ 기존 방식 (여전히 작동)
const guides = await guides.search({
  keywords: ['table', 'crud']
});

// ✅ 새로운 방식 (디자인 시스템 우선순위)
const guides = await guides.search({
  keywords: ['table', 'crud'],
  designSystem: 'openerd-nuxt3'  // 선택적
});
```

## 📖 관련 문서

- [METADATA_SYSTEM.md](./METADATA_SYSTEM.md) - 메타데이터 시스템 전체 설명
- [WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md) - 올바른 워크플로우
- [CLIENT_WORKFLOW_DIAGRAM.md](./CLIENT_WORKFLOW_DIAGRAM.md) - 클라이언트 작업 흐름도

## 🎓 API 레퍼런스

### metadata.getDesignSystemInfo(designSystemId)

디자인 시스템 전체 정보 조회

```typescript
const info = metadata.getDesignSystemInfo('openerd-nuxt3');
// → { id, name, description, packageName, docsUrl, components }
```

### metadata.getComponentForDesignSystem(designSystemId, componentType)

특정 컴포넌트 타입 정보 조회

```typescript
const component = metadata.getComponentForDesignSystem('openerd-nuxt3', 'table');
// → { name: 'CommonTable', description, props, usage }
```

### metadata.getComponentMap(designSystemId)

컴포넌트 매핑 일괄 조회

```typescript
const map = metadata.getComponentMap('openerd-nuxt3');
// → { table: 'CommonTable', button: 'CommonButton', ... }
```

### metadata.getSupportedDesignSystems()

지원 디자인 시스템 목록

```typescript
const systems = metadata.getSupportedDesignSystems();
// → ['openerd-nuxt3', 'element-plus', 'vuetify', ...]
```

### guides.search({ ..., designSystem })

가이드 검색 (디자인 시스템 우선순위 부스트)

```typescript
const result = await guides.search({
  keywords: ['table'],
  designSystem: 'openerd-nuxt3'  // +25~40점 부스트
});
```

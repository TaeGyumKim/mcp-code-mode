# 유틸리티 라이브러리 활용 가이드

## 🎯 목적

MCP 작업 시 프로젝트의 유틸리티 라이브러리를 **자동 감지**하여, 해당 라이브러리가 제공하는 **함수, 컴포저블, API를 참고**하여 일관된 코드를 생성합니다.

## 🔧 지원 유틸리티 라이브러리 (9개)

### 순수 유틸리티 라이브러리 (5개)

| 유틸리티 라이브러리 | 패키지 | 주요 기능 | 문서 |
|--------------|--------|----------|------|
| **vueuse** | `@vueuse/core` | Vue composition utilities (useLocalStorage, useMouse, useFetch) | [Docs](https://vueuse.org) |
| **lodash** | `lodash` | Utility functions (debounce, get, chunk, uniq) | [Docs](https://lodash.com) |
| **date-fns** | `date-fns` | Date manipulation (format, parseISO, addDays) | [Docs](https://date-fns.org) |
| **axios** | `axios` | HTTP client (get, post, put, delete) | [Docs](https://axios-http.com) |
| **dayjs** | `dayjs` | Date library (format, add, subtract) | [Docs](https://day.js.org) |

### 🎨 하이브리드 패키지 (4개) - 디자인 시스템 + 유틸리티

**하나의 패키지가 컴포넌트(디자인 시스템)와 composables/utils(유틸리티)를 모두 제공하는 경우**

| 패키지 | 컴포넌트 | Composables/Utils | 문서 |
|--------|---------|-------------------|------|
| **openerd-nuxt3** | CommonTable, CommonButton, CommonInput | useTable, useForm, useModal, usePagination, useAlert | [Docs](https://openerd.com/docs) |
| **element-plus** | ElTable, ElButton, ElInput | useFormItem, useLocale, useSize, useZIndex | [Docs](https://element-plus.org) |
| **vuetify** | VDataTable, VBtn, VTextField | useDisplay, useTheme, useLayout, useLocale | [Docs](https://vuetifyjs.com) |
| **quasar** | QTable, QBtn, QInput | useQuasar, useDialogPluginComponent, useMeta | [Docs](https://quasar.dev) |

**중요**: 하이브리드 패키지는 `designSystem`과 `utilityLibrary` 필드에 **동시에 감지**됩니다.

```typescript
// 예시: openerd-nuxt3 사용 프로젝트
{
  designSystem: "openerd-nuxt3",      // CommonTable, CommonButton 사용으로 감지
  utilityLibrary: "openerd-nuxt3"     // useTable, useForm 사용으로 감지
}
```

## 📋 전체 워크플로우

```
1. 프로젝트 스캔
   ↓
2. 유틸리티 라이브러리 자동 감지 (사용 패턴 기반)
   ↓
3. 유틸리티 라이브러리 함수 매핑 조회
   ↓
4. guides 검색 시 utilityLibrary 우선순위 부스트
   ↓
5. 해당 라이브러리의 함수를 사용하여 코드 생성
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

    console.log('Detected Utility Library:', projectMeta.utilityLibrary);
    // → "vueuse"

    // 2. 유틸리티 라이브러리 정보 조회
    const libInfo = metadata.getUtilityLibraryInfo(projectMeta.utilityLibrary);
    console.log('Available Functions:', Object.keys(libInfo.functions));
    // → ["useLocalStorage", "useMouse", "useFetch", "useElementSize", ...]

    // 3. 특정 함수 정보 조회
    const localStorageFunc = metadata.getFunctionForUtilityLibrary(
      projectMeta.utilityLibrary,
      'useLocalStorage'
    );
    console.log('Function Name:', localStorageFunc.name);        // "useLocalStorage"
    console.log('Usage:', localStorageFunc.usage);               // "const state = useLocalStorage('key', defaultValue)"
    console.log('Category:', localStorageFunc.category);         // "state"
    console.log('Params:', localStorageFunc.params);             // ["key", "defaultValue", "options"]

    // 4. 함수 매핑 일괄 조회
    const functions = metadata.getFunctionMap(projectMeta.utilityLibrary);
    // → { useLocalStorage: 'useLocalStorage', useMouse: 'useMouse', ... }

    // 5. 카테고리별 함수 조회
    const stateFunctions = metadata.getFunctionsByCategory(
      projectMeta.utilityLibrary,
      'state'
    );
    // → ['useLocalStorage', 'useSessionStorage', 'useStorage']

    // 6. guides 검색 (utilityLibrary 우선순위 부스트)
    const guidesResult = await guides.search({
      keywords: ['localStorage', 'state', 'composable'],
      apiType: projectMeta.apiType,
      utilityLibrary: projectMeta.utilityLibrary  // 🔧 +25~40점 부스트
    });

    // 7. 코드 생성
    const generatedCode = \`
<script setup lang="ts">
import { ${localStorageFunc.name} } from '@vueuse/core';

const userPreferences = ${localStorageFunc.name}('user-preferences', {
  theme: 'light',
  language: 'ko'
});

const handleThemeChange = (newTheme: string) => {
  userPreferences.value.theme = newTheme;
};
</script>
    \`;

    return {
      utilityLibrary: projectMeta.utilityLibrary,
      functions,
      guidesResult,
      generatedCode
    };
  `
});
```

### 2. 유틸리티 라이브러리별 함수 비교

```typescript
// 동일한 기능의 라이브러리별 구현 비교
const libraries = ['vueuse', 'lodash', 'date-fns'];

for (const libId of libraries) {
  console.log(`\n${libId}:`);
  const lib = metadata.getUtilityLibraryInfo(libId);

  // 카테고리별 함수 목록
  const categories = ['state', 'function', 'date'];
  for (const category of categories) {
    const funcs = metadata.getFunctionsByCategory(libId, category);
    if (funcs.length > 0) {
      console.log(`  ${category}: ${funcs.join(', ')}`);
    }
  }
}

// 출력:
// vueuse:
//   state: useLocalStorage, useSessionStorage, useStorage
//
// lodash:
//   function: debounce, throttle, memoize
//
// date-fns:
//   date: format, parseISO, addDays, subDays
```

### 3. 실제 코드 생성 시나리오

```typescript
// 사용자 요청: "로컬 스토리지를 사용한 상태 관리 코드를 만들어줘"

// Step 1: 프로젝트 메타데이터 추출
const projectMeta = await metadata.analyzeProject(path, files, 3);
// → utilityLibrary: "vueuse"

// Step 2: 함수 매핑 가져오기
const functions = metadata.getFunctionMap(projectMeta.utilityLibrary);
// → { useLocalStorage: 'useLocalStorage', useMouse: 'useMouse', ... }

// Step 3: 가이드 검색 (유틸리티 라이브러리 우선순위)
const guides = await guides.search({
  keywords: ['localStorage', 'state', 'persistence'],
  utilityLibrary: projectMeta.utilityLibrary
});

// Step 4: 코드 생성
const code = `
<script setup lang="ts">
import { ${functions.useLocalStorage}, watch } from '@vueuse/core';

// 사용자 설정 저장
const userSettings = ${functions.useLocalStorage}('user-settings', {
  theme: 'light',
  fontSize: 14,
  notifications: true
});

// 자동 저장 (watch로 변경 감지)
watch(userSettings, (newValue) => {
  console.log('Settings saved:', newValue);
}, { deep: true });

// 설정 초기화
const resetSettings = () => {
  userSettings.value = {
    theme: 'light',
    fontSize: 14,
    notifications: true
  };
};
</script>
`;
```

## 💡 핵심 장점

### 1. ✅ 일관성 유지

프로젝트의 기존 유틸리티 라이브러리와 일관된 함수를 자동으로 사용합니다.

```typescript
// ❌ 잘못된 예 (프로젝트는 vueuse인데 lodash 사용)
import { debounce } from 'lodash';

// ✅ 올바른 예 (자동으로 감지된 유틸리티 라이브러리 사용)
import { useDebounceFn } from '@vueuse/core';
```

### 2. ✅ 올바른 함수 사용법

각 유틸리티 라이브러리의 올바른 함수 시그니처, 사용 패턴을 참고합니다.

```typescript
const func = metadata.getFunctionForUtilityLibrary('vueuse', 'useLocalStorage');

console.log(func.name);      // "useLocalStorage"
console.log(func.category);  // "state"
console.log(func.params);    // ["key", "defaultValue", "options"]
console.log(func.usage);     // "const state = useLocalStorage('key', defaultValue)"
```

### 3. ✅ 가이드 우선순위 자동 부스트

유틸리티 라이브러리 관련 가이드가 자동으로 우선 검색됩니다.

```typescript
// utilityLibrary 없이 검색
await guides.search({ keywords: ['localStorage'] });
// → 일반 점수: 15~30점

// utilityLibrary와 함께 검색
await guides.search({
  keywords: ['localStorage'],
  utilityLibrary: 'vueuse'  // 🔧 +25~40점 부스트
});
// → 관련 가이드 점수: 55~70점 (상위 노출)
```

## 📊 카테고리별 함수 분류

### VueUse

| 카테고리 | 함수 |
|---------|------|
| **state** | useLocalStorage, useSessionStorage, useStorage |
| **event** | useMouse, useKeyboard, useScroll |
| **network** | useFetch, useWebSocket |
| **component** | useElementSize, useElementVisibility |
| **animation** | useTransition, useInterval |

### Lodash

| 카테고리 | 함수 |
|---------|------|
| **array** | chunk, uniq, flatten |
| **object** | get, set, merge |
| **function** | debounce, throttle, memoize |
| **collection** | map, filter, reduce |

### Date-fns

| 카테고리 | 함수 |
|---------|------|
| **format** | format, formatDistance, formatRelative |
| **parse** | parseISO, parse |
| **manipulate** | addDays, subDays, addMonths |
| **compare** | differenceInDays, isBefore, isAfter |

### Axios

| 카테고리 | 함수 |
|---------|------|
| **request** | get, post, put, delete |
| **config** | create (instance) |
| **interceptor** | interceptors.request, interceptors.response |

### Dayjs

| 카테고리 | 함수 |
|---------|------|
| **format** | format |
| **manipulate** | add, subtract |
| **query** | isBefore, isAfter, diff |
| **parse** | dayjs() (constructor) |

## 🧪 테스트

```bash
# 유틸리티 라이브러리 통합 테스트 실행
npx tsx scripts/test/test-utility-library-integration.ts
```

**테스트 내용:**
1. 유틸리티 라이브러리 함수 매핑 조회
2. guides 검색 시 utilityLibrary 우선순위 확인
3. 실제 코드 생성 시나리오

## 📊 가이드 검색 점수 시스템

| 조건 | 점수 |
|------|------|
| **필수 지침 (mandatory)** | 1000점 (최상위) |
| **API Type 매칭** | +30점 |
| **Scope 매칭** | +20점 |
| **Design System ID 완전 매칭** | +40점 |
| **Design System 태그 매칭** | +35점 |
| **Design System 내용 매칭** | +25점 |
| **✨ Utility Library ID 완전 매칭** | +40점 |
| **✨ Utility Library 태그 매칭** | +35점 |
| **✨ Utility Library 내용 매칭** | +25점 |
| **키워드 태그 매칭** | +15점 |
| **키워드 요약 매칭** | +10점 |
| **키워드 내용 매칭** | +5점 |
| **Priority 반영** | +priority/10점 |

## 🔄 기존 코드와의 호환성

기존 시스템은 그대로 유지되며, `utilityLibrary` 필드는 **선택적(optional)**입니다:

```typescript
// ✅ 기존 방식 (여전히 작동)
const guides = await guides.search({
  keywords: ['localStorage', 'state']
});

// ✅ 새로운 방식 (유틸리티 라이브러리 우선순위)
const guides = await guides.search({
  keywords: ['localStorage', 'state'],
  utilityLibrary: 'vueuse'  // 선택적
});
```

## 🎯 실전 예시

### 예시 1: VueUse를 사용한 마우스 위치 추적

```typescript
// Step 1: 프로젝트 메타데이터에서 utilityLibrary 감지
// projectMeta.utilityLibrary = "vueuse"

// Step 2: useMouse 함수 정보 조회
const mouseFunc = metadata.getFunctionForUtilityLibrary('vueuse', 'useMouse');

// Step 3: 코드 생성
const code = `
<script setup lang="ts">
import { ${mouseFunc.name} } from '@vueuse/core';

const { x, y, sourceType } = ${mouseFunc.name}();
</script>

<template>
  <div>
    <p>Mouse position: {{ x }}, {{ y }}</p>
    <p>Source: {{ sourceType }}</p>
  </div>
</template>
`;
```

### 예시 2: Lodash를 사용한 디바운스 검색

```typescript
// projectMeta.utilityLibrary = "lodash"

const debounceFunc = metadata.getFunctionForUtilityLibrary('lodash', 'debounce');

const code = `
<script setup lang="ts">
import { debounce } from 'lodash';
import { ref } from 'vue';

const searchQuery = ref('');
const searchResults = ref([]);

const performSearch = async (query: string) => {
  // API 호출
  const results = await fetch(\`/api/search?q=\${query}\`);
  searchResults.value = await results.json();
};

// 300ms 디바운스
const debouncedSearch = debounce(performSearch, 300);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  debouncedSearch(target.value);
};
</script>
`;
```

### 예시 3: date-fns를 사용한 날짜 포맷팅

```typescript
// projectMeta.utilityLibrary = "date-fns"

const formatFunc = metadata.getFunctionForUtilityLibrary('date-fns', 'format');
const addDaysFunc = metadata.getFunctionForUtilityLibrary('date-fns', 'addDays');

const code = `
<script setup lang="ts">
import { format, addDays, parseISO } from 'date-fns';
import { ref } from 'vue';

const today = ref(new Date());
const nextWeek = ref(addDays(today.value, 7));

const formatDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};
</script>

<template>
  <div>
    <p>Today: {{ formatDate(today) }}</p>
    <p>Next week: {{ formatDate(nextWeek) }}</p>
  </div>
</template>
`;
```

### 예시 4: 🎨 하이브리드 패키지 (openerd-nuxt3) - 컴포넌트 + Composables

```typescript
// 프로젝트가 openerd-nuxt3를 사용하는 경우
// projectMeta.designSystem = "openerd-nuxt3"     ← CommonTable, CommonButton 사용
// projectMeta.utilityLibrary = "openerd-nuxt3"   ← useTable, useForm 사용

// Step 1: 디자인 시스템 컴포넌트 정보 조회
const tableComponent = metadata.getComponentForDesignSystem('openerd-nuxt3', 'table');
// → { name: 'CommonTable', usage: '<CommonTable :data="items" ... />' }

// Step 2: 유틸리티 composable 정보 조회
const useTableFunc = metadata.getFunctionForUtilityLibrary('openerd-nuxt3', 'useTable');
// → { name: 'useTable', usage: 'const { data, loading, refresh } = useTable(fetchFunction)' }

const useAlertFunc = metadata.getFunctionForUtilityLibrary('openerd-nuxt3', 'useAlert');
// → { name: 'useAlert', usage: 'const { success, error, warning, info } = useAlert()' }

// Step 3: 컴포넌트 + Composables를 함께 사용한 코드 생성
const code = `
<script setup lang="ts">
import { ${tableComponent.name} } from '@openerd/nuxt3';
import { ${useTableFunc.name}, ${useAlertFunc.name} } from '@openerd/nuxt3';

// 🔧 유틸리티: 테이블 상태 관리
const { data, loading, refresh } = ${useTableFunc.name}(async () => {
  const response = await fetch('/api/users');
  return response.json();
});

// 🔧 유틸리티: 알림 관리
const { success, error } = ${useAlertFunc.name}();

const handleDelete = async (id: string) => {
  try {
    await fetch(\`/api/users/\${id}\`, { method: 'DELETE' });
    await refresh();
    success('삭제되었습니다');
  } catch (err) {
    error('삭제 실패');
  }
};

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '이름' },
  { key: 'email', label: '이메일' }
];
</script>

<template>
  <!-- 🎨 디자인 시스템: 컴포넌트 -->
  <${tableComponent.name}
    :data="data"
    :columns="columns"
    :loading="loading"
    @row-click="handleRowClick"
  />
</template>
`;

// 결과: 동일한 패키지(openerd-nuxt3)의 컴포넌트와 composables를 일관성 있게 사용
```

**핵심 장점:**
- ✅ **일관성**: 동일 패키지의 컴포넌트와 composables를 함께 사용
- ✅ **자동 감지**: designSystem과 utilityLibrary 모두 자동으로 감지
- ✅ **통합 경험**: UI와 로직을 동일한 디자인 시스템으로 통일

## 📖 관련 문서

- [METADATA_SYSTEM.md](./METADATA_SYSTEM.md) - 메타데이터 시스템 전체 설명
- [DESIGN_SYSTEM_USAGE.md](./DESIGN_SYSTEM_USAGE.md) - 디자인 시스템 활용 가이드
- [WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md) - 올바른 워크플로우
- [CLIENT_WORKFLOW_DIAGRAM.md](./CLIENT_WORKFLOW_DIAGRAM.md) - 클라이언트 작업 흐름도

## 🎓 API 레퍼런스

### metadata.getUtilityLibraryInfo(utilityLibraryId)

유틸리티 라이브러리 전체 정보 조회

```typescript
const info = metadata.getUtilityLibraryInfo('vueuse');
// → { id, name, description, packageName, docsUrl, functions }
```

### metadata.getFunctionForUtilityLibrary(utilityLibraryId, functionName)

특정 함수 정보 조회

```typescript
const func = metadata.getFunctionForUtilityLibrary('vueuse', 'useLocalStorage');
// → { name: 'useLocalStorage', category: 'state', description, usage, params }
```

### metadata.getFunctionMap(utilityLibraryId)

함수 매핑 일괄 조회

```typescript
const map = metadata.getFunctionMap('vueuse');
// → { useLocalStorage: 'useLocalStorage', useMouse: 'useMouse', ... }
```

### metadata.getFunctionsByCategory(utilityLibraryId, category)

카테고리별 함수 목록 조회

```typescript
const stateFunctions = metadata.getFunctionsByCategory('vueuse', 'state');
// → ['useLocalStorage', 'useSessionStorage', 'useStorage']
```

### metadata.getSupportedUtilityLibraries()

지원 유틸리티 라이브러리 목록

```typescript
const libraries = metadata.getSupportedUtilityLibraries();
// → ['vueuse', 'lodash', 'date-fns', 'axios', 'dayjs']
```

### guides.search({ ..., utilityLibrary })

가이드 검색 (유틸리티 라이브러리 우선순위 부스트)

```typescript
const result = await guides.search({
  keywords: ['localStorage'],
  utilityLibrary: 'vueuse'  // +25~40점 부스트
});
```

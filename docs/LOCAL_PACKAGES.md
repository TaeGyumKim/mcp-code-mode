# 로컬 패키지 시스템 가이드

## 🎯 목적

**공개 패키지 vs 로컬 패키지**:
- **공개 패키지**: vueuse, lodash, element-plus 등 → 하드코딩된 매핑 데이터
- **로컬 패키지**: openerd-nuxt3 같은 조직 내부 솔루션 → **AI가 소스 코드 분석**하여 자동 매핑

조직의 **내부 디자인 시스템이나 유틸리티 라이브러리**를 MCP 시스템에 등록하고, AI가 자동으로 분석하여 코드 생성 시 참고할 수 있게 합니다.

## 📦 로컬 패키지 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| **design-system** | 컴포넌트만 제공 | 순수 UI 라이브러리 |
| **utility** | 함수/composables만 제공 | 순수 유틸리티 라이브러리 |
| **hybrid** | 컴포넌트 + 유틸리티 모두 제공 | openerd-nuxt3 |

## 🚀 빠른 시작

### 1. 로컬 패키지 등록

`.mcp/local-packages.json` 파일을 생성합니다:

```json
{
  "version": "1.0.0",
  "localPackages": [
    {
      "id": "openerd-nuxt3",
      "type": "hybrid",
      "name": "OpenERD Nuxt3",
      "packageName": "@openerd/nuxt3",
      "sourcePath": "/projects/openerd-nuxt3/src",
      "analyzed": false,
      "description": "OpenERD internal design system and utility library"
    }
  ]
}
```

### 2. AI로 자동 분석

```typescript
import { LocalPackageAnalyzer } from '@/llm-analyzer';

const analyzer = new LocalPackageAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

// openerd-nuxt3 패키지 분석
await analyzer.analyzePackage('openerd-nuxt3');

// 결과:
// - 컴포넌트 자동 추출 (CommonTable, CommonButton, CommonInput, ...)
// - 함수/composables 자동 추출 (useTable, useForm, useAlert, ...)
// - 사용 패턴 자동 생성 (/Common[A-Z]\w+/g, /use[A-Z]\w+/g)
// - 카테고리 자동 분류 (table, button, state, ui, ...)
```

### 3. 프로젝트 분석 시 자동 감지

이제 프로젝트를 분석하면 로컬 패키지도 자동으로 감지됩니다:

```typescript
const analyzer = new MetadataAnalyzer();
const projectMeta = await analyzer.analyzeProject('/projects/myapp', files, 3);

console.log(projectMeta.designSystem);     // "openerd-nuxt3"  ← 로컬 패키지 감지!
console.log(projectMeta.utilityLibrary);   // "openerd-nuxt3"  ← 로컬 패키지 감지!
```

## 📋 로컬 패키지 설정 구조

```typescript
{
  "id": "openerd-nuxt3",                    // 고유 ID
  "type": "hybrid",                         // design-system | utility | hybrid
  "name": "OpenERD Nuxt3",                  // 표시 이름
  "packageName": "@openerd/nuxt3",          // npm 패키지명
  "sourcePath": "/projects/openerd-nuxt3/src",  // 분석할 소스 코드 경로
  "analyzed": false,                        // AI 분석 완료 여부
  "analyzedAt": "2025-01-13T12:00:00Z",     // 분석 완료 시각

  // AI 분석 후 자동 생성됨
  "designSystem": {
    "componentPatterns": ["/Common[A-Z]\\w+/g"],
    "components": {
      "CommonTable": {
        "name": "CommonTable",
        "category": "table",
        "props": ["data", "columns", "loading"],
        "usage": "<CommonTable :data=\"items\" />",
        "filePath": "/projects/openerd-nuxt3/src/components/CommonTable.vue"
      }
    }
  },

  "utilityLibrary": {
    "functionPatterns": ["/use[A-Z]\\w+/g"],
    "functions": {
      "useTable": {
        "name": "useTable",
        "category": "state",
        "usage": "const { data, loading } = useTable(fetchFn)",
        "params": ["fetchFunction", "options"],
        "filePath": "/projects/openerd-nuxt3/src/composables/useTable.ts"
      }
    }
  }
}
```

## 🤖 AI 자동 분석 동작 방식

### 1. 소스 파일 스캔
- `.vue`, `.ts`, `.tsx` 파일만 스캔
- `node_modules`, `dist`, `.git` 제외
- 재귀적으로 모든 하위 디렉토리 탐색

### 2. 컴포넌트 추출 (디자인 시스템)
- 파일 경로에 `components` 포함 여부 확인
- 파일명에서 컴포넌트 이름 추출 (CommonTable.vue → CommonTable)
- 컴포넌트 카테고리 자동 추론:
  - `table`, `grid`, `list` → table
  - `button`, `btn` → button
  - `input`, `field`, `text` → input
  - `modal`, `dialog` → modal
  - `layout`, `container` → layout
- 컴포넌트 접두사 추출 (CommonTable → Common)
- 감지 패턴 자동 생성 (`/Common[A-Z]\w+/g`)

### 3. 함수/Composables 추출 (유틸리티)
- `composables`, `utils` 디렉토리 탐색
- `use`로 시작하는 함수 추출 (useTable, useForm, ...)
- API 메서드 추출 (메타데이터의 apiMethods 활용)
- 함수 카테고리 자동 추론:
  - `state`, `storage`, `store` → state
  - `mouse`, `keyboard`, `click` → event
  - `fetch`, `api`, `request` → api
  - `validate`, `validation` → validation
  - `format`, `parse` → utility
- 감지 패턴 자동 생성 (`/use[A-Z]\w+/g`)

### 4. 사용 예시 자동 생성
- 컴포넌트: `<ComponentName />`
- Composable: `const result = functionName()`
- Props/Params 자동 추출

## 💻 사용 예시

### 예시 1: 로컬 패키지 등록 및 분석

```typescript
import { LocalPackageManager, LocalPackageAnalyzer } from '@/llm-analyzer';

// 1. 패키지 매니저 초기화
const manager = new LocalPackageManager();

// 2. 로컬 패키지 추가
await manager.addPackage({
  id: 'openerd-nuxt3',
  type: 'hybrid',
  name: 'OpenERD Nuxt3',
  packageName: '@openerd/nuxt3',
  sourcePath: '/projects/openerd-nuxt3/src',
  description: 'Internal design system'
});

// 3. AI 분석 실행
const analyzer = new LocalPackageAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

await analyzer.analyzePackage('openerd-nuxt3');

// 4. 분석 결과 확인
const pkg = await manager.getPackage('openerd-nuxt3');
console.log('Components:', Object.keys(pkg.designSystem.components));
console.log('Functions:', Object.keys(pkg.utilityLibrary.functions));
```

### 예시 2: 모든 미분석 패키지 일괄 분석

```typescript
const analyzer = new LocalPackageAnalyzer();

// 모든 analyzed: false 패키지를 자동으로 분석
await analyzer.analyzeAllUnanalyzed();
```

### 예시 3: 프로젝트 분석 시 로컬 패키지 자동 감지

```typescript
// 프로젝트 분석
const analyzer = new MetadataAnalyzer();
const files = await filesystem.scanProject('/projects/myapp');
const projectMeta = await analyzer.analyzeProject('/projects/myapp', files, 3);

// 로컬 패키지 감지됨!
console.log(projectMeta.designSystem);     // "openerd-nuxt3"
console.log(projectMeta.utilityLibrary);   // "openerd-nuxt3"

// 이제 컴포넌트와 함수 정보 조회 가능
const tableComponent = metadata.getComponentForDesignSystem('openerd-nuxt3', 'table');
// → { name: 'CommonTable', usage: '<CommonTable :data="items" />' }

const useTableFunc = metadata.getFunctionForUtilityLibrary('openerd-nuxt3', 'useTable');
// → { name: 'useTable', usage: 'const { data, loading } = useTable(fetchFn)' }
```

### 예시 4: 코드 생성 시 로컬 패키지 활용

```typescript
// 프로젝트 메타데이터
const projectMeta = {
  designSystem: "openerd-nuxt3",
  utilityLibrary: "openerd-nuxt3"
};

// 컴포넌트 정보 조회
const table = metadata.getComponentForDesignSystem(projectMeta.designSystem, 'table');
const button = metadata.getComponentForDesignSystem(projectMeta.designSystem, 'button');

// 유틸리티 정보 조회
const useTable = metadata.getFunctionForUtilityLibrary(projectMeta.utilityLibrary, 'useTable');
const useAlert = metadata.getFunctionForUtilityLibrary(projectMeta.utilityLibrary, 'useAlert');

// 코드 생성
const code = `
<script setup lang="ts">
import { ${table.name}, ${button.name} } from '@openerd/nuxt3';
import { ${useTable.name}, ${useAlert.name} } from '@openerd/nuxt3';

// 🔧 유틸리티: 테이블 상태 관리
const { data, loading, refresh } = ${useTable.name}(async () => {
  const response = await fetch('/api/users');
  return response.json();
});

// 🔧 유틸리티: 알림 관리
const { success, error } = ${useAlert.name}();

const handleDelete = async (id: string) => {
  try {
    await fetch(\`/api/users/\${id}\`, { method: 'DELETE' });
    await refresh();
    success('삭제되었습니다');
  } catch (err) {
    error('삭제 실패');
  }
};
</script>

<template>
  <!-- 🎨 디자인 시스템: 컴포넌트 -->
  <${table.name} :data="data" :loading="loading" @row-click="handleRowClick" />
  <${button.name} @click="handleDelete">삭제</${button.name}>
</template>
`;
```

## 🔄 공개 패키지 vs 로컬 패키지 비교

| 항목 | 공개 패키지 | 로컬 패키지 |
|------|------------|------------|
| **등록** | 하드코딩 (utilityLibraryMapping.ts) | `.mcp/local-packages.json` |
| **매핑 데이터** | 수동 작성 | AI 자동 분석 |
| **감지 패턴** | 하드코딩 | AI 자동 생성 |
| **업데이트** | 코드 수정 필요 | 재분석만 하면 됨 |
| **적용 범위** | 모든 프로젝트 | 조직 내부 프로젝트 |

**장점**:
- ✅ 내부 솔루션을 쉽게 등록
- ✅ AI가 자동으로 컴포넌트/함수 추출
- ✅ 코드 수정 없이 JSON 설정만으로 관리
- ✅ 소스 코드 변경 시 재분석으로 동기화

## 📊 분석 결과 예시

### AI 분석 전 (analyzed: false)

```json
{
  "id": "openerd-nuxt3",
  "type": "hybrid",
  "name": "OpenERD Nuxt3",
  "sourcePath": "/projects/openerd-nuxt3/src",
  "analyzed": false
}
```

### AI 분석 후 (analyzed: true)

```json
{
  "id": "openerd-nuxt3",
  "analyzed": true,
  "analyzedAt": "2025-01-13T12:00:00Z",

  "designSystem": {
    "componentPatterns": [
      "/Common[A-Z]\\w+/g",
      "/from ['\"]{@openerd\\/nuxt3}['\"]/g"
    ],
    "components": {
      "CommonTable": { "name": "CommonTable", "category": "table", ... },
      "CommonButton": { "name": "CommonButton", "category": "button", ... },
      "CommonInput": { "name": "CommonInput", "category": "input", ... },
      "CommonModal": { "name": "CommonModal", "category": "modal", ... }
    }
  },

  "utilityLibrary": {
    "functionPatterns": [
      "/use[A-Z]\\w+/g",
      "/format[A-Z]\\w+/g"
    ],
    "functions": {
      "useTable": { "name": "useTable", "category": "state", ... },
      "useForm": { "name": "useForm", "category": "state", ... },
      "useAlert": { "name": "useAlert", "category": "ui", ... },
      "formatDate": { "name": "formatDate", "category": "utility", ... }
    }
  }
}
```

## 🔧 고급 사용법

### 1. 패키지 제거

```typescript
await manager.removePackage('openerd-nuxt3');
```

### 2. 타입별 패키지 조회

```typescript
const designSystems = await manager.getDesignSystemPackages();
const utilities = await manager.getUtilityLibraryPackages();
const hybrids = await manager.getPackagesByType('hybrid');
```

### 3. 감지 패턴 조회

```typescript
const dsPatterns = await manager.getDesignSystemPatterns();
// → { 'openerd-nuxt3': [/Common[A-Z]\w+/g, ...] }

const utilPatterns = await manager.getUtilityLibraryPatterns();
// → { 'openerd-nuxt3': [/use[A-Z]\w+/g, ...] }
```

### 4. 재분석 (소스 코드 변경 시)

```typescript
// 소스 코드가 변경되면 재분석
await analyzer.analyzePackage('openerd-nuxt3');

// analyzed: true → 덮어쓰기
// analyzedAt: 새로운 시각으로 업데이트
```

## 📖 관련 문서

- [METADATA_SYSTEM.md](./METADATA_SYSTEM.md) - 메타데이터 시스템 전체 설명
- [DESIGN_SYSTEM_USAGE.md](./DESIGN_SYSTEM_USAGE.md) - 디자인 시스템 활용 가이드
- [UTILITY_LIBRARY_USAGE.md](./UTILITY_LIBRARY_USAGE.md) - 유틸리티 라이브러리 활용 가이드

## ⚠️ 주의사항

1. **소스 경로 접근 권한**: `sourcePath`가 Docker 컨테이너 내부에서 접근 가능해야 함
2. **대용량 패키지**: 파일이 너무 많으면 분석 시간이 오래 걸림 (필터링 권장)
3. **재분석 주기**: 소스 코드가 변경되면 재분석 필요
4. **패턴 충돌**: 다른 패키지와 패턴이 겹치지 않도록 주의

## 🎓 FAQ

**Q: 공개 패키지와 로컬 패키지가 동시에 감지되면?**
A: 점수 기반으로 선택됩니다. 매칭 횟수가 더 많은 쪽이 선택됩니다.

**Q: 로컬 패키지를 환경 변수에 추가해야 하나요?**
A: 아니요. `.mcp/local-packages.json`에만 등록하면 자동으로 감지됩니다.

**Q: AI 분석이 정확하지 않으면?**
A: JSON 파일을 직접 수정하여 수동으로 매핑할 수 있습니다.

**Q: 여러 조직에서 사용하려면?**
A: 각 프로젝트마다 `.mcp/local-packages.json`을 별도로 관리하면 됩니다.

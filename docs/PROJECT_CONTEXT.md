# 프로젝트 컨텍스트 자동 추출

## 개요

모든 `execute` MCP 도구 응답에 프로젝트 컨텍스트가 자동으로 포함됩니다. 이를 통해 LLM이 프로젝트의 특성을 파악하고 적절한 가이드와 BestCase를 선택할 수 있습니다.

## 추출 정보

프로젝트 컨텍스트는 다음 정보를 자동으로 감지합니다:

### 1. API 타입

프로젝트에서 사용하는 API 타입을 자동 감지합니다.

**감지 대상**:
- **gRPC**: `@grpc/grpc-js`, `@grpc/proto-loader` 감지
- **OpenAPI**: `openapi-fetch`, `swagger-client` 감지
- **REST**: `axios`, `fetch` 사용
- **Mixed**: 여러 API 타입이 혼재된 경우

**package.json 분석**:
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.8.0",
    "@grpc/proto-loader": "^0.7.0"
  }
}
```

→ **API Type: `grpc`**

### 2. 디자인 시스템

프로젝트에서 사용하는 UI 프레임워크를 자동 감지합니다.

**지원 디자인 시스템** (7개):
- **element-plus**: Element Plus (Vue 3)
- **vuetify**: Vuetify (Vue 3)
- **quasar**: Quasar Framework
- **primevue**: PrimeVue
- **ant-design-vue**: Ant Design Vue
- **naive-ui**: Naive UI
- **로컬 패키지**: `.mcp/local-packages.json`에 정의된 커스텀 컴포넌트 라이브러리

**감지 방법**:
1. `package.json` 의존성 확인
2. 코드에서 import 패턴 분석 (정규식)
3. 점수 계산 후 가장 많이 사용된 시스템 반환

**예시**:
```typescript
import { ElTable, ElButton } from 'element-plus';
import { CommonTable } from '@/components/Common';
```

→ **Design System: `element-plus` (공개) + `openerd-nuxt3` (로컬)**

### 3. 유틸리티 라이브러리

프로젝트에서 사용하는 유틸리티 함수 라이브러리를 감지합니다.

**지원 라이브러리** (9개):
- **vueuse**: VueUse (Vue 3 Composition Utilities)
- **lodash**: Lodash (유틸리티 함수)
- **date-fns**: date-fns (날짜 처리)
- **axios**: Axios (HTTP 클라이언트)
- **dayjs**: Day.js (날짜 처리)
- **rxjs**: RxJS (Reactive Extensions)
- **ramda**: Ramda (함수형 프로그래밍)
- **validator**: Validator.js (검증)
- **로컬 패키지**: `.mcp/local-packages.json`에 정의된 커스텀 유틸리티

**예시**:
```typescript
import { useLocalStorage, useMouse } from '@vueuse/core';
import { useEmail, useAlert } from '@/composables/utils';
```

→ **Utility Library: `vueuse` (공개) + `openerd-nuxt3` (로컬)**

### 4. 로컬 패키지

`.mcp/local-packages.json`에 정의된 프로젝트 전용 패키지를 감지합니다.

**local-packages.json 예시**:
```json
{
  "openerd-nuxt3": {
    "analyzed": true,
    "displayName": "OpenERD Nuxt3 Library",
    "components": {
      "table": { "name": "CommonTable", "patterns": ["/Common[A-Z]\\w+/g"] },
      "button": { "name": "CommonButton", "patterns": ["/Common[A-Z]\\w+/g"] }
    },
    "utilities": {
      "email": { "name": "useEmail", "patterns": ["/use[A-Z]\\w+/g"] },
      "alert": { "name": "useAlert", "patterns": ["/use[A-Z]\\w+/g"] }
    }
  }
}
```

**분석 결과**:
```typescript
{
  localPackageCount: 2,
  localPackages: [
    {
      id: 'openerd-nuxt3',
      analyzed: true,
      componentCount: 36,
      utilityCount: 10
    }
  ]
}
```

## 응답 형식

`execute` 도구 응답에 프로젝트 컨텍스트가 자동 포함됩니다:

```json
{
  "content": [
    {
      "type": "text",
      "text": "## 📋 Project Context\n\n### 🔧 API Type\n- Detected: **GRPC**\n- Packages: @grpc/grpc-js, @grpc/proto-loader\n- Confidence: high\n\n### 🎨 Design System\n- Detected: element-plus\n- Recommended: element-plus\n\n### 🛠️ Utility Library\n- Detected: vueuse\n- Recommended: vueuse\n\n### 📦 Local Packages\n- 2 packages need analysis\n- openerd-nuxt3: 36 components, 10 utilities\n\n### 📋 Recommended Plan\n- ✅ API Type: GRPC\n- ✅ Design System: element-plus\n- ✅ Utility Library: vueuse\n- 📦 2 local packages detected\n\n## ✅ Execution Result\n..."
    }
  ],
  "projectContext": {
    "apiInfo": {
      "type": "grpc",
      "packages": ["@grpc/grpc-js", "@grpc/proto-loader"],
      "confidence": "high"
    },
    "designSystemInfo": {
      "detected": ["element-plus"],
      "recommended": "element-plus"
    },
    "utilityLibraryInfo": {
      "detected": ["vueuse"],
      "recommended": "vueuse"
    },
    "localPackageInfo": {
      "localPackageCount": 2,
      "needsAnalysis": 0,
      "localPackages": [...]
    },
    "recommendedPlan": [
      "✅ API Type: GRPC (@grpc/grpc-js, @grpc/proto-loader)",
      "✅ Design System: element-plus - Use these components:",
      "   • Table: ElTable",
      "   • Button: ElButton",
      "✅ Utility Library: vueuse - Use these functions:",
      "   • State: useLocalStorage, useSessionStorage",
      "   • Sensors: useMouse, useScroll",
      "📦 2 local packages need analysis",
      "📋 Recommended Next Steps:",
      "   1. Use MetadataAnalyzer to analyze local packages",
      "   2. Search guides with detected design system and utility library",
      "   3. Load BestCase for comparison (optional)"
    ]
  }
}
```

## 활용 방법

### 1. Guides 검색에 활용

프로젝트 컨텍스트는 guides 검색에 자동으로 활용됩니다.

**Sandbox 코드 예시**:
```typescript
// execute 도구로 다음 코드 실행
const searchResult = await guides.search({
  keywords: ['crud', 'pagination', 'table'],
  apiType: 'grpc',           // 프로젝트 컨텍스트에서 감지된 API 타입
  designSystem: 'element-plus',  // 프로젝트 컨텍스트에서 감지된 디자인 시스템
  utilityLibrary: 'vueuse'   // 프로젝트 컨텍스트에서 감지된 유틸리티 라이브러리
});

// Result:
// - API 타입 일치: +30점
// - 디자인 시스템 완전 매칭: +40점
// - 유틸리티 라이브러리 완전 매칭: +40점
// → element-plus + vueuse 가이드가 최우선 선택됨
```

### 2. BestCase 비교에 활용

프로젝트 컨텍스트를 통해 유사한 BestCase를 찾을 수 있습니다.

**예시**:
```typescript
// 1. 프로젝트 메타데이터 추출
const analyzer = metadata.createAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

const files = await filesystem.searchFiles({ pattern: '**/*.{ts,vue}' });
const projectMeta = await analyzer.analyzeProject('/workspace', files, 3);

// 2. 유사한 BestCase 찾기 (API 타입 기준)
const allCases = await bestcase.listBestCases();
const similarCase = allCases.bestcases.find(bc =>
  bc.patterns?.metadata?.apiType === projectMeta.apiType  // 'grpc' 매칭
);

// 3. BestCase 비교
const comparison = metadata.compareBestCase(
  projectMeta,
  similarCase.patterns.metadata
);

console.log('Missing patterns:', comparison.missingPatterns);
console.log('TODOs:', comparison.todos);
```

### 3. 로컬 패키지 분석

로컬 패키지가 감지되면 분석을 권장합니다.

**예시**:
```typescript
// 로컬 패키지 분석 필요 시
if (projectContext.localPackageInfo.needsAnalysis > 0) {
  console.log('⚠️ 로컬 패키지 분석이 필요합니다');
  console.log('npm run scan:auto-ai 실행을 권장합니다');
}

// 이미 분석된 로컬 패키지 활용
const localPackage = projectContext.localPackageInfo.localPackages[0];
console.log(`${localPackage.id}: ${localPackage.componentCount} components`);
```

## 구현 세부사항

### 파일 위치

- **프로젝트 컨텍스트 추출**: `packages/ai-runner/src/projectContext.ts`
- **Sandbox 통합**: `packages/ai-runner/src/sandbox.ts` (라인 195-202)
- **MCP 응답 포맷팅**: `mcp-stdio-server.ts` (라인 163-217)

### 자동 실행 시점

프로젝트 컨텍스트는 **모든 `execute` 도구 호출 시 자동으로 추출**됩니다.

**흐름**:
1. 사용자가 `execute` 도구 호출
2. Sandbox에서 TypeScript 코드 실행
3. 코드 실행 완료 후 `extractProjectContext()` 자동 실행
4. 프로젝트 컨텍스트를 `SandboxResult`에 포함
5. MCP 응답에 프로젝트 컨텍스트 포맷팅하여 반환

### 성능 최적화

- 프로젝트 컨텍스트 추출은 **비동기 실행**
- 추출 실패 시 **무시** (선택적 기능)
- `package.json` 캐싱으로 중복 읽기 방지

## 관련 문서

- [디자인 시스템 사용법](./DESIGN_SYSTEM_USAGE.md) - 디자인 시스템 감지 및 가이드 부스트
- [로컬 패키지 시스템](./LOCAL_PACKAGES.md) - 로컬 패키지 정의 및 분석
- [워크플로우 가이드](./WORKFLOW_CORRECT.md) - 전체 워크플로우 설명
- [BestCase 비교 예시](../scripts/examples/compare-bestcase-example.ts) - BestCase 비교 샘플 코드

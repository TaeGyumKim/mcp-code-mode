**# 메타데이터 추출 시스템

## 🎯 핵심 목적

메타데이터 시스템은 다음과 같은 흐름으로 작동합니다:

```
1. 사용자 요청 + 대상 프로젝트 분석
          ↓
   메타데이터 추출 (patterns, frameworks, designSystem, complexity 등)
          ↓
2. 서버의 BestCase 메타데이터와 비교
          ↓
3. 작업 분류 (누락된 패턴, 개선 필요 영역 파악)
          ↓
4. 필요한 가이드라인 로드 (메타데이터 키워드 기반)
   → designSystem 감지 시 해당 시스템의 기능/컴포넌트 가이드 자동 로드
          ↓
5. 코드 생성 (가이드 + BestCase + 디자인 시스템 컴포넌트 참고)
```

### 🎨 designSystem 필드의 특별한 목적

**핵심**: MCP에서 작업 시 프로젝트가 사용 중인 디자인 시스템을 감지하여, **해당 디자인 시스템이 제공하는 기능을 참고**하기 위한 것입니다.

**예시**:
- `designSystem: "openerd-nuxt3"` 감지 → CommonTable, CommonButton, CommonLayout 등의 컴포넌트 및 사용 패턴 참고
- `designSystem: "element-plus"` 감지 → ElTable, ElButton, ElDialog 등의 컴포넌트 및 API 참고
- `designSystem: "vuetify"` 감지 → VDataTable, VBtn, VCard 등의 Material Design 패턴 참고

이를 통해 AI는 프로젝트의 기존 디자인 시스템과 일관된 코드를 생성할 수 있습니다.

### 왜 메타데이터인가?

- **객관적**: 점수는 주관적이지만, 메타데이터는 코드에서 추출한 사실
- **활용도**: 점수는 순위만 가능하지만, 메타데이터는 검색/필터링/비교 가능
- **자동화**: 패턴 기반으로 작업 분류 및 가이드 로딩 자동화
- **품질 평가**: 메타데이터 → 점수 계산으로 참고 파일 품질 평가

## 📊 개요

기존 점수 기반 코드 분석을 **메타데이터 추출 시스템**으로 전환하여, 동적 지침 로딩 시스템과 통합 가능한 구조화된 정보를 추출합니다.

## 📊 주요 변경 사항

### Before: 점수 기반 분석
```typescript
{
  score: 85,              // 0-100 점수
  strengths: ["..."],
  weaknesses: ["..."],
  recommendations: ["..."]
}
```

### After: 메타데이터 추출
```typescript
{
  patterns: ["interceptor", "error-recovery"],     // 사용 패턴
  frameworks: ["@grpc/grpc-js", "nuxt3"],          // 프레임워크
  apiType: "grpc",                                 // API 타입
  apiMethods: ["getUserList", "createUser"],       // API 메서드
  complexity: "high",                              // 복잡도
  reusability: "high",                             // 재사용성
  errorHandling: "comprehensive",                  // 에러 처리
  typeDefinitions: "excellent",                    // 타입 품질
  entities: ["User"],                              // 도메인 엔티티
  features: ["api-client", "interceptor"],         // 기능
  isExcellent: true,                               // 우수 코드
  excellentReasons: ["..."]                        // 우수 이유
}
```

## 🔑 핵심 메타데이터 타입

### 1. FileMetadata (API/Composable)

```typescript
interface FileMetadata {
  filePath: string;
  category: 'composable' | 'api' | 'utility' | 'page' | 'other';

  // 패턴 및 기술 스택
  patterns: string[];                    // interceptor, queue, state-machine, etc
  frameworks: string[];                  // vue, nuxt3, pinia, @grpc/grpc-js, etc
  designSystem?: string;                 // openerd-nuxt3, element-plus, vuetify, quasar, etc
  apiType?: 'grpc' | 'openapi' | 'rest' | 'none';
  apiMethods: string[];                  // getUserList, createUser, etc

  // 품질 지표
  complexity: ComplexityLevel;           // trivial/low/medium/high/very-high
  reusability: ReusabilityLevel;         // low/medium/high
  errorHandling: ErrorHandlingLevel;     // none/basic/comprehensive
  typeDefinitions: TypeDefinitionQuality; // poor/basic/good/excellent

  // 관계 및 의존성
  dependencies: string[];                // 외부 라이브러리
  composablesUsed: string[];             // useRoute, useRouter, etc
  entities: string[];                    // User, Order, Product, etc
  features: string[];                    // pagination, search, CRUD, etc

  // 문서 및 우수성
  hasDocumentation: boolean;
  isExcellent: boolean;
  excellentReasons?: string[];

  linesOfCode: number;
}
```

### 2. ComponentMetadata (Vue 컴포넌트)

```typescript
interface ComponentMetadata {
  filePath: string;
  category: 'component';

  // FileMetadata 공통 필드 +
  componentsUsed: string[];              // CommonTable, CommonButton, etc
  vModelBindings: Array<{
    name: string;
    component: string;
    hasWatch: boolean;
    hasValidation: boolean;
    hasTypeDefinition: boolean;
  }>;

  hasLoadingStates: boolean;
  hasErrorStates: boolean;
  excellentPatterns?: string[];

  templateLines: number;
  scriptLines: number;
}
```

### 3. ProjectMetadata (프로젝트 전체)

```typescript
interface ProjectMetadata {
  projectName: string;
  totalFiles: number;

  // 집계 정보
  filesByCategory: Record<string, number>;
  apiType: 'grpc' | 'openapi' | 'rest' | 'mixed' | 'none';
  apiMethods: string[];                  // 전체 API 메서드 (중복 제거)

  // 기술 스택 (중복 제거)
  frameworks: string[];
  patterns: string[];
  dependencies: string[];
  designSystem?: string;                 // 주로 사용되는 디자인 시스템 (가장 많이 사용된 시스템)

  // 컴포넌트 및 composable
  componentsUsed: string[];
  composablesUsed: string[];
  entities: string[];

  // 복잡도 분포
  complexityDistribution: Record<ComplexityLevel, number>;

  // 우수 코드
  excellentFiles: Array<{
    path: string;
    reasons: string[];
    patterns: string[];
  }>;
  excellentSnippets: ExcellentCodeMetadata[];

  // 통계
  averageComplexity: ComplexityLevel;
  totalLinesOfCode: number;
  filesWithGoodErrorHandling: number;
  filesWithGoodTypes: number;
}
```

## 💡 활용 사례

### 0. 전체 워크플로우 개요

```typescript
// 1단계: 사용자 요청 → 프로젝트 메타데이터 추출
const projectMeta = await metadata.analyzeProject(targetPath, files);
// → patterns: ["state-management", "api-call"]
// → frameworks: ["nuxt", "vue"]
// → designSystem: "openerd-nuxt3"  // ⭐ 디자인 시스템 자동 감지
// → apiType: "grpc"

// 2단계: BestCase 메타데이터와 비교
const bestCases = await bestcase.list();
const similarCase = bestCases.find(bc =>
  bc.patterns.metadata.apiType === projectMeta.apiType
);
const bestCaseMeta = similarCase.patterns.metadata;

// 3단계: 작업 분류 (누락된 패턴 파악)
const missingPatterns = bestCaseMeta.patterns.filter(p =>
  !projectMeta.patterns.includes(p)
);
// → ["interceptor", "error-recovery"]

// 4단계: 가이드 로드 (메타데이터 키워드 기반)
const keywords = [
  ...projectMeta.patterns,
  ...projectMeta.frameworks,
  ...missingPatterns,  // 배워야 할 패턴
  projectMeta.designSystem  // ⭐ 디자인 시스템 키워드 추가
];
const guides = await guides.search({ keywords });
// → openerd-nuxt3 가이드가 자동으로 포함됨 (CommonTable, CommonButton 등 컴포넌트 사용법)

// 5단계: 고품질 참고 파일 선택 (점수 기반)
const referenceFiles = bestCase.files
  .filter(f => f.metadata.patterns.includes("interceptor"))
  .filter(f => f.score >= 70)  // 고품질 파일만
  .sort((a, b) => b.score - a.score);

// 6단계: 코드 생성 (가이드 + 참고 파일)
// ... 코드 생성 로직
```

### 1. 동적 지침 로딩

메타데이터를 키워드로 활용하여 관련 지침을 검색합니다.

```typescript
// Sandbox 내부에서 실행 (execute 도구 사용)
await mcp.callTool('execute', {
  code: `
    // 1. 프로젝트 메타데이터 추출
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    const files = await filesystem.scanProject('/workspace/myapp');
    const projectMeta = await analyzer.analyzeProject('/workspace/myapp', files, 3);

    // 2. 메타데이터 → 키워드 변환
    const keywords = [
      ...projectMeta.patterns,      // "interceptor", "error-recovery"
      ...projectMeta.frameworks,    // "grpc", "nuxt3"
      ...projectMeta.features,      // "api-client"
      projectMeta.apiType          // "grpc"
    ];

    // 3. 가이드 검색 (Sandbox의 guides API 사용)
    const searchResult = await guides.search({
      keywords,
      apiType: projectMeta.apiType
    });

    return { projectMeta, keywords, guides: searchResult.guides };
  `
});
```

### 2. BestCase 저장 (cron job)

우수 코드만 선별하여 패턴 라이브러리 구축합니다.

```typescript
// cron job에서 실행 (scripts/scan/auto-scan-projects-ai.ts)
const analyzer = new MetadataAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

// 1️⃣ 프로젝트 스캔 및 메타데이터 추출
const files = await scanProjectFiles(projectPath);
const fileResults = await analyzer.analyzeFilesParallel(files, 3);
const metadata = await analyzer.aggregateMetadata(projectPath, fileResults);

// 2️⃣ 메타데이터 기반 점수 계산
const scores = analyzer.calculateProjectScore(metadata, fileResults);
const tier = analyzer.getTierFromScore(scores.overall);
// → overall: 85, tier: "A"

// 3️⃣ 고품질 파일 선별 (점수 70점 이상)
const highQualityFiles = fileResults
  .map(file => ({
    ...file,
    score: analyzer.calculateFileScore(file),
    tier: analyzer.getTierFromScore(analyzer.calculateFileScore(file))
  }))
  .filter(f => f.score >= 70)
  .sort((a, b) => b.score - a.score);

// 4️⃣ BestCase로 저장
if (highQualityFiles.length > 0) {
  await runAgentScript({
    code: `
      await bestcase.save({
        projectName: '${projectName}',
        category: 'auto-scan-metadata',
        description: 'Score: ${scores.overall}/100 (Tier ${tier}) - ${highQualityFiles.length}개 우수 파일',
        files: [
          ${highQualityFiles.map(f => `{
            path: '${f.filePath}',
            content: '...',
            purpose: 'Score: ${f.score}/100 - ${f.patterns.join(", ")}',
            // ✅ 파일별 메타데이터
            metadata: {
              patterns: ${JSON.stringify(f.patterns)},
              frameworks: ${JSON.stringify(f.frameworks)},
              complexity: '${f.complexity}',
              errorHandling: '${f.errorHandling}',
              typeDefinitions: '${f.typeDefinitions}',
              reusability: '${f.reusability}'
            },
            // ✅ 파일별 점수
            score: ${f.score},
            tier: '${f.tier}'
          }`).join(',')}
        ],
        patterns: {
          // ✅ 프로젝트 메타데이터
          metadata: ${JSON.stringify(metadata)},
          // ✅ 프로젝트 점수
          scores: {
            overall: ${scores.overall},
            average: ${scores.average},
            tier: '${tier}',
            distribution: ${JSON.stringify(scores.distribution)}
          },
          excellentReasons: ${JSON.stringify(metadata.excellentFiles.flatMap(f => f.reasons))}
        },
        tags: ['tier-${tier.toLowerCase()}', 'score-${Math.floor(scores.overall / 10) * 10}',
               ...${JSON.stringify([...metadata.frameworks, ...metadata.patterns, metadata.apiType])}]
      });
    `
  });
}
```

**저장되는 정보**:
- 각 파일: metadata (패턴, 복잡도 등) + score (0-100) + tier (S/A/B/C/D)
- 프로젝트: metadata (전체 통계) + scores (overall, distribution)

### 3. 메타데이터 비교 → TODO 생성

현재 프로젝트와 BestCase를 비교하여 개선점 도출합니다.

```typescript
// Sandbox 내부에서 실행
await mcp.callTool('execute', {
  code: `
    // 1. 현재 프로젝트 메타데이터 추출
    const projectMeta = await metadata.analyzeProject('/workspace/myapp', files, 3);

    // 2. 유사한 BestCase 로드
    const allCases = await bestcase.list();
    const similarCase = allCases.bestcases.find(bc =>
      bc.category === 'auto-scan-metadata' &&
      bc.patterns?.metadata?.apiType === projectMeta.apiType
    );

    const bestCase = await bestcase.load({
      projectName: similarCase.projectName,
      category: similarCase.category
    });

    const bestCaseMeta = bestCase.bestCases[0].patterns.metadata;

    // 3. 메타데이터 비교 → TODO 생성
    const todos = [];

    // 누락된 패턴 체크
    const missingPatterns = bestCaseMeta.patterns.filter(p =>
      !projectMeta.patterns.includes(p)
    );

    if (missingPatterns.includes('interceptor')) {
      todos.push({
        id: 'add-interceptor-pattern',
        reason: 'BestCase에 우수 interceptor 패턴 존재',
        files: ['composables/useGrpcClient.ts'],
        loc: 50,
        priority: 'high',
        referenceFile: bestCase.bestCases[0].files.find(f =>
          f.path.includes('Grpc')
        )
      });
    }

    // 복잡도 비교
    if (projectMeta.averageComplexity === 'very-high' &&
        bestCaseMeta.averageComplexity === 'medium') {
      todos.push({
        id: 'refactor-complexity',
        reason: 'BestCase 대비 복잡도 높음',
        files: projectMeta.excellentFiles
          .filter(f => f.complexity === 'very-high')
          .map(f => f.path),
        loc: 150,
        priority: 'medium'
      });
    }

    return { todos, projectMeta, bestCaseMeta };
  `
});
```

### 4. 디자인 시스템 기반 코드 생성 ⭐ NEW

디자인 시스템을 감지하여 해당 시스템의 컴포넌트를 자동으로 활용합니다.

```typescript
// Sandbox 내부에서 실행
await mcp.callTool('execute', {
  code: `
    // 1. 프로젝트 메타데이터 추출
    const projectMeta = await metadata.analyzeProject('/workspace/myapp', files, 3);

    console.log('Detected Design System:', projectMeta.designSystem);
    // → "openerd-nuxt3"

    // 2. 디자인 시스템 키워드로 가이드 검색
    const guides = await guides.search({
      keywords: [
        projectMeta.designSystem,  // "openerd-nuxt3"
        'table',                   // 사용자가 테이블 컴포넌트 요청
        'crud'
      ]
    });

    // 3. 디자인 시스템별 컴포넌트 매핑
    const componentMap = {
      'openerd-nuxt3': {
        table: 'CommonTable',
        button: 'CommonButton',
        input: 'CommonInput',
        modal: 'CommonModal',
        layout: 'CommonLayout'
      },
      'element-plus': {
        table: 'ElTable',
        button: 'ElButton',
        input: 'ElInput',
        modal: 'ElDialog',
        layout: 'ElContainer'
      },
      'vuetify': {
        table: 'VDataTable',
        button: 'VBtn',
        input: 'VTextField',
        modal: 'VDialog',
        layout: 'VContainer'
      }
    };

    // 4. 코드 생성 (프로젝트의 디자인 시스템 사용)
    const designSystem = projectMeta.designSystem || 'openerd-nuxt3';
    const components = componentMap[designSystem];

    const generatedCode = \`
<template>
  <div>
    <\${components.table}
      :data="users"
      :columns="columns"
      @row-click="handleRowClick"
    />
    <\${components.button} @click="handleAdd">
      Add User
    </\${components.button}>
  </div>
</template>

<script setup lang="ts">
// 프로젝트의 디자인 시스템(\${designSystem})에 맞는 컴포넌트 사용
const users = ref([]);
</script>
    \`;

    return { designSystem, components, generatedCode };
  `
});
```

**결과**:
- `designSystem: "openerd-nuxt3"` → `CommonTable`, `CommonButton` 사용
- `designSystem: "element-plus"` → `ElTable`, `ElButton` 사용
- `designSystem: "vuetify"` → `VDataTable`, `VBtn` 사용

**장점**:
- ✅ 프로젝트의 기존 디자인 시스템과 일관성 유지
- ✅ 올바른 컴포넌트 import 및 사용법 적용
- ✅ 디자인 시스템별 특화 기능 활용 (예: Vuetify의 Material Design 패턴)

**상세 예시는 [WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md) 참조**

## 🔧 사용 방법

### Sandbox API로 사용

**권장 방식** (execute 도구 사용):

```typescript
// Claude/Copilot가 실행
await mcp.callTool('execute', {
  code: `
    // Sandbox의 metadata API 사용
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    // 프로젝트 파일 스캔
    const files = await filesystem.scanProject('/workspace/myapp');

    // 메타데이터 추출
    const projectMeta = await analyzer.analyzeProject(
      '/workspace/myapp',
      files,
      3  // concurrency
    );

    return projectMeta;
  `
});
```

### 직접 사용 (cron job 등)

```typescript
import { MetadataAnalyzer } from 'llm-analyzer';

const analyzer = new MetadataAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

// API 파일 분석
const fileMeta = await analyzer.extractFileMetadata(filePath, content);

// Vue 컴포넌트 분석
const compMeta = await analyzer.extractComponentMetadata(
  filePath,
  templateContent,
  scriptContent
);

// 프로젝트 전체 분석
const projectMeta = await analyzer.analyzeProject(
  projectPath,
  fileList,
  3  // concurrency
);
```

### 테스트

```bash
# 메타데이터 분석기 테스트
npm run test:metadata

# 전체 플로우 테스트
npm run test:flow
```

## 📈 점수 vs 메타데이터 비교

| 측면 | 점수 기반 | 메타데이터 기반 |
|------|-----------|----------------|
| **출력** | 0-100 점수 | 구조화된 정보 |
| **활용** | 순위 매기기 | 키워드 검색, 필터링 |
| **통합** | 제한적 | 동적 지침 로딩 연동 |
| **재사용** | 낮음 | 높음 (패턴 추출) |
| **확장성** | 낮음 | 높음 (필드 추가 용이) |
| **가독성** | 추상적 | 명확 (what, not how) |

## 🎨 메타데이터 예시

### API 파일 (gRPC Client)

```json
{
  "filePath": "composables/grpc.ts",
  "category": "api",
  "patterns": ["interceptor", "error-recovery", "singleton"],
  "frameworks": ["@grpc/grpc-js", "nuxt3"],
  "designSystem": "openerd-nuxt3",
  "apiType": "grpc",
  "apiMethods": ["getUserList", "createUser", "updateUser"],
  "complexity": "high",
  "reusability": "high",
  "errorHandling": "comprehensive",
  "typeDefinitions": "excellent",
  "dependencies": ["@grpc/grpc-js", "@grpc/credentials"],
  "composablesUsed": ["useRuntimeConfig"],
  "entities": ["User"],
  "features": ["api-client", "interceptor", "error-handling"],
  "hasDocumentation": true,
  "isExcellent": true,
  "excellentReasons": [
    "Proper interceptor pattern",
    "Comprehensive error handling with ConnectError",
    "Full TypeScript types with generics",
    "Well documented with JSDoc"
  ],
  "linesOfCode": 180
}
```

### Vue 컴포넌트 (CRUD 페이지)

```json
{
  "filePath": "pages/users/index.vue",
  "category": "component",
  "patterns": ["slot-forwarding", "v-model", "composition-api"],
  "frameworks": ["tailwind", "openerd-nuxt3"],
  "designSystem": "openerd-nuxt3",
  "componentsUsed": ["CommonTable", "CommonInput", "CommonPaging"],
  "composablesUsed": ["usePaging", "useAsyncData", "useRoute"],
  "vModelBindings": [
    {
      "name": "searchQuery",
      "component": "CommonInput",
      "hasWatch": true,
      "hasValidation": false,
      "hasTypeDefinition": true
    },
    {
      "name": "page",
      "component": "CommonPaging",
      "hasWatch": true,
      "hasValidation": false,
      "hasTypeDefinition": true
    }
  ],
  "complexity": "high",
  "reusability": "medium",
  "errorHandling": "comprehensive",
  "typeDefinitions": "good",
  "features": ["CRUD", "search", "pagination"],
  "entities": ["User"],
  "hasLoadingStates": true,
  "hasErrorStates": true,
  "isExcellent": true,
  "excellentReasons": [
    "Proper useAsyncData integration",
    "Loading and error states handled",
    "Clean separation of concerns"
  ],
  "excellentPatterns": [
    "CommonAsyncBoundary usage",
    "usePaging pattern",
    "Error toast handling"
  ],
  "linesOfCode": 220,
  "templateLines": 80,
  "scriptLines": 140
}
```

## ✅ 구현 완료

1. ✅ 메타데이터 인터페이스 정의 (packages/llm-analyzer/src/metadata.ts)
2. ✅ MetadataAnalyzer 구현 (packages/llm-analyzer/src/metadataAnalyzer.ts)
3. ✅ MetadataPrompts 작성 (packages/llm-analyzer/src/metadataPrompts.ts)
4. ✅ Sandbox API 통합 (packages/ai-runner/src/sandbox.ts)
5. ✅ BestCase 구조 변경 (packages/bestcase-db/src/storage.ts)
6. ✅ cron job 스크립트 수정 (scripts/scan/auto-scan-projects-ai.ts)

## 📚 참고

- [WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md) - 올바른 워크플로우 전체
- [GUIDES_MCP_INTEGRATION.md](./GUIDES_MCP_INTEGRATION.md) - 가이드 시스템
- [MetadataAnalyzer](../packages/llm-analyzer/src/metadataAnalyzer.ts) - 메타데이터 분석기
- [메타데이터 타입 정의](../packages/llm-analyzer/src/metadata.ts)
- [메타데이터 프롬프트](../packages/llm-analyzer/src/metadataPrompts.ts)
- [테스트 스크립트](../scripts/test/test-metadata-analyzer.ts)
- Anthropic MCP Code Mode: https://aisparkup.com/posts/6318

## 💡 FAQ

**Q: 기존 CodeAnalyzer는 어떻게 되나요?**
A: 호환성 유지를 위해 기존 CodeAnalyzer는 그대로 유지됩니다. MetadataAnalyzer와 병행 사용 가능합니다.

**Q: 메타데이터 추출에 필요한 LLM 모델은?**
A: `qwen2.5-coder:7b` 또는 `qwen2.5-coder:1.5b` 권장. GPU 사용 시 더 빠른 처리 가능합니다.

**Q: 점수를 완전히 제거하는 이유는?**
A: 점수는 주관적이고 활용도가 낮습니다. 메타데이터는 객관적이고 동적 지침 로딩 등 다양한 용도로 활용 가능합니다.

**Q: 메타데이터 필드를 추가할 수 있나요?**
A: 네, `metadata.ts`에 인터페이스를 확장하고 프롬프트를 업데이트하면 됩니다.

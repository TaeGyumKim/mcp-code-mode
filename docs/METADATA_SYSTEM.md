**# 메타데이터 추출 시스템

## 🎯 개요

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

### 1. 동적 지침 로딩

메타데이터를 키워드로 활용하여 관련 지침을 검색합니다.

```typescript
// 파일 메타데이터 추출
const metadata = await analyzer.extractFileMetadata(filePath, content);

// 메타데이터 → 키워드 변환
const keywords = [
  ...metadata.patterns,      // "interceptor", "error-recovery"
  ...metadata.frameworks,    // "grpc", "nuxt3"
  ...metadata.features,      // "api-client"
  metadata.apiType          // "grpc"
];

// 지침 검색
const guides = await searchGuides({
  keywords,
  apiType: metadata.apiType
});
```

### 2. BestCase 저장

우수 코드만 선별하여 패턴 라이브러리 구축합니다.

```typescript
if (metadata.isExcellent && metadata.complexity === 'high') {
  // BestCase 저장
  await saveBestCase({
    projectName: metadata.filePath,
    category: 'auto-scan-metadata',
    patterns: {
      metadata,  // 전체 메타데이터 저장
      excellentReasons: metadata.excellentReasons
    }
  });
}
```

### 3. 프로젝트 분석

전체 기술 스택 및 복잡도 파악합니다.

```typescript
const projectMeta = await analyzer.analyzeProject(projectPath, files);

console.log(`프로젝트: ${projectMeta.projectName}`);
console.log(`파일 수: ${projectMeta.totalFiles}`);
console.log(`프레임워크: ${projectMeta.frameworks.join(', ')}`);
console.log(`API 타입: ${projectMeta.apiType}`);
console.log(`평균 복잡도: ${projectMeta.averageComplexity}`);
console.log(`우수 파일: ${projectMeta.excellentFiles.length}개`);
```

## 🔧 사용 방법

### 설치

```bash
yarn install
yarn build:all
```

### 기본 사용

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

## 🚀 다음 단계

1. ✅ 메타데이터 인터페이스 정의
2. ✅ MetadataAnalyzer 구현
3. ✅ MetadataPrompts 작성
4. ⏳ Ollama 서버 연동 테스트
5. ⏳ BestCase 시스템에 메타데이터 통합
6. ⏳ 동적 지침 로딩과 메타데이터 연동

## 📚 참고

- [MetadataAnalyzer](../packages/llm-analyzer/src/metadataAnalyzer.ts) - 메타데이터 분석기
- [메타데이터 타입 정의](../packages/llm-analyzer/src/metadata.ts)
- [메타데이터 프롬프트](../packages/llm-analyzer/src/metadataPrompts.ts)
- [테스트 스크립트](../scripts/test/test-metadata-analyzer.ts)

## 💡 FAQ

**Q: 기존 CodeAnalyzer는 어떻게 되나요?**
A: 호환성 유지를 위해 기존 CodeAnalyzer는 그대로 유지됩니다. MetadataAnalyzer와 병행 사용 가능합니다.

**Q: 메타데이터 추출에 필요한 LLM 모델은?**
A: `qwen2.5-coder:7b` 또는 `qwen2.5-coder:1.5b` 권장. GPU 사용 시 더 빠른 처리 가능합니다.

**Q: 점수를 완전히 제거하는 이유는?**
A: 점수는 주관적이고 활용도가 낮습니다. 메타데이터는 객관적이고 동적 지침 로딩 등 다양한 용도로 활용 가능합니다.

**Q: 메타데이터 필드를 추가할 수 있나요?**
A: 네, `metadata.ts`에 인터페이스를 확장하고 프롬프트를 업데이트하면 됩니다.

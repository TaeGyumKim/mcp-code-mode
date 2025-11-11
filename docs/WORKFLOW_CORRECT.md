# 올바른 워크플로우 (Anthropic Code Mode 기반)

## 🎯 핵심 개념

### Anthropic MCP Code Mode란?

**전통적인 MCP 방식** (토큰 낭비):
```
Claude/Copilot → MCP 도구 호출 (각 도구마다 JSON-RPC)
                → tools/list에 모든 도구 정의 포함
                → 150,000 토큰 소모
```

**Code Mode 방식** (98% 토큰 절감):
```
Claude/Copilot → execute 도구 하나만 호출
                → TypeScript 코드 전달
                → Sandbox에서 실행 (filesystem, bestcase 등 API 사용)
                → 2,000 토큰으로 동일한 작업 수행
```

---

## 🏗️ 시스템 아키텍처

### 역할 분리

```
┌──────────────────────────────────────────────┐
│  MCP 클라이언트 (Claude / GitHub Copilot)    │
│  ──────────────────────────────────────────  │
│  - TypeScript 코드 작성                      │
│  - execute 도구로 실행                       │
│  - Sandbox API 사용 (guides, metadata 등)   │
│  - 메타데이터 비교 로직                      │
│  - TODO 생성 및 코드 생성                    │
└──────────────────────────────────────────────┘
                    ↕ MCP 프로토콜 (stdio)
┌──────────────────────────────────────────────┐
│  MCP 서버 (Docker 컨테이너)                  │
│  ──────────────────────────────────────────  │
│  [MCP 도구] (최소한)                         │
│    - execute: TypeScript 코드 실행           │
│                                              │
│  [Sandbox API] (execute 내부에서 사용)       │
│    - filesystem: 파일 읽기/쓰기              │
│    - bestcase: BestCase CRUD                 │
│    - guides: 가이드 검색/병합                │
│    - metadata: 메타데이터 추출               │
│                                              │
│  [백그라운드 작업] (cron job)                │
│    - 주기적으로 프로젝트 메타데이터 추출     │
│    - BestCase DB에 저장                      │
└──────────────────────────────────────────────┘
```

---

## 📋 전체 워크플로우 (5단계)

### 0. 지침 파일 로드 (클라이언트)

**목적**: 동적으로 필요한 가이드만 로드

```typescript
// Claude/Copilot가 실행
const result = await mcp.callTool('execute', {
  code: `
    // Sandbox의 guides API 사용
    const searchResult = await guides.search({
      keywords: ['grpc', 'nuxt3', 'crud', 'pagination'],
      apiType: 'grpc',
      mandatoryIds: [
        'grpc.api.connection',
        'api.validation',
        'error.handling'
      ]
    });

    // 상위 5개 가이드 병합
    const combined = await guides.combine({
      ids: searchResult.guides.slice(0, 5).map(g => g.id),
      context: {
        project: 'myapp',
        apiType: 'grpc'
      }
    });

    return { combined, guides: searchResult.guides };
  `
});

// 병합된 가이드를 프롬프트에 포함
const guidelines = result.output.combined.combined;
```

**토큰 절감**:
- 전체 11개 가이드 로드: ~100,000 토큰
- 필요한 5개만 로드: ~6,000 토큰
- **94% 절감** 🎉

---

### 1. 대상 프로젝트 메타데이터 추출 (클라이언트)

**목적**: 현재 프로젝트의 기술 스택, 패턴, 복잡도 파악

```typescript
// Claude/Copilot가 실행
const result = await mcp.callTool('execute', {
  code: `
    // Sandbox의 metadata API 사용
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    // 프로젝트 파일 스캔
    const files = await filesystem.scanProject('/workspace/myapp', {
      include: ['**/*.ts', '**/*.vue', '**/*.js'],
      exclude: ['node_modules', 'dist', '.nuxt']
    });

    // 메타데이터 추출 (Ollama LLM 사용)
    const projectMeta = await analyzer.analyzeProject(
      '/workspace/myapp',
      files,
      3  // concurrency
    );

    return projectMeta;
  `
});

const projectMetadata = result.output;
```

**추출되는 정보** (`ProjectMetadata`):
```typescript
{
  projectName: "myapp",
  totalFiles: 45,

  // 기술 스택
  frameworks: ["@grpc/grpc-js", "nuxt3", "pinia"],
  patterns: ["interceptor", "error-recovery", "composition-api"],
  dependencies: ["tailwindcss", "openerd-nuxt3"],

  // API 정보
  apiType: "grpc",
  apiMethods: ["getUserList", "createUser", "updateUser", "deleteUser"],

  // 컴포넌트/Composable
  componentsUsed: ["CommonTable", "CommonButton", "CommonPaging"],
  composablesUsed: ["useGrpcClient", "usePaging", "useAsyncData"],

  // 도메인
  entities: ["User", "Product", "Order"],
  features: ["CRUD", "pagination", "search", "api-client"],

  // 복잡도 분포
  complexityDistribution: {
    "trivial": 5,
    "low": 15,
    "medium": 20,
    "high": 4,
    "very-high": 1
  },
  averageComplexity: "medium",

  // 우수 파일
  excellentFiles: [
    {
      path: "composables/useGrpcClient.ts",
      reasons: [
        "Proper interceptor pattern",
        "Comprehensive error handling",
        "Full TypeScript generics"
      ],
      patterns: ["interceptor", "error-recovery", "singleton"]
    }
  ],

  // 통계
  totalLinesOfCode: 8450,
  filesWithGoodErrorHandling: 32,
  filesWithGoodTypes: 40
}
```

---

### 2. BestCase 메타데이터 로드 (클라이언트 → 서버)

**목적**: 우수 프로젝트 사례와 비교하기 위한 메타데이터 로드

```typescript
// Claude/Copilot가 실행
const result = await mcp.callTool('execute', {
  code: `
    // BestCase 목록 조회
    const allCases = await bestcase.list();

    // 현재 프로젝트와 유사한 케이스 필터링
    const similarCases = allCases.bestcases.filter(bc => {
      // category가 'auto-scan-metadata'인 것만
      if (bc.category !== 'auto-scan-metadata') return false;

      const bcMeta = bc.patterns?.metadata;
      if (!bcMeta) return false;

      // API 타입 일치
      if (bcMeta.apiType !== '${projectMetadata.apiType}') return false;

      // 프레임워크 겹침
      const commonFrameworks = bcMeta.frameworks.filter(f =>
        ${JSON.stringify(projectMetadata.frameworks)}.includes(f)
      );

      return commonFrameworks.length >= 1;
    });

    // 우수 파일이 가장 많은 케이스 선택
    const bestCase = similarCases.sort((a, b) =>
      (b.patterns?.metadata?.excellentFiles?.length || 0) -
      (a.patterns?.metadata?.excellentFiles?.length || 0)
    )[0];

    if (!bestCase) {
      return { found: false, message: 'No similar BestCase found' };
    }

    // 선택된 BestCase 전체 로드
    const fullBestCase = await bestcase.load({
      projectName: bestCase.projectName,
      category: bestCase.category
    });

    return { found: true, bestCase: fullBestCase.bestCases[0] };
  `
});

const bestCase = result.output.bestCase;
```

**BestCase 구조** (메타데이터 기반):
```typescript
{
  id: "excellent-project-auto-scan-metadata-1234567890",
  projectName: "excellent-project",
  category: "auto-scan-metadata",  // ✅ 메타데이터 카테고리
  description: "자동 스캔: 12개 우수 파일",

  // 우수 파일들
  files: [
    {
      path: "composables/useGrpcClient.ts",
      content: "export const useGrpcClient = () => { ... }",
      purpose: "Proper interceptor pattern, Comprehensive error handling"
    },
    {
      path: "pages/users/index.vue",
      content: "<template>...</template>",
      purpose: "Clean CRUD implementation with pagination"
    }
  ],

  // ✅ 메타데이터 저장
  patterns: {
    metadata: {  // ProjectMetadata
      frameworks: ["@grpc/grpc-js", "nuxt3"],
      patterns: ["interceptor", "error-recovery"],
      apiType: "grpc",
      apiMethods: ["getUserList", "createUser", ...],
      complexity: "medium",
      excellentFiles: [
        {
          path: "composables/useGrpcClient.ts",
          reasons: ["Proper interceptor pattern", ...],
          patterns: ["interceptor"]
        }
      ]
    },
    excellentReasons: [
      "Proper interceptor pattern",
      "Comprehensive error handling",
      "Full TypeScript generics"
    ]
  },

  metadata: {
    createdAt: "2025-11-11T03:00:00.000Z",
    updatedAt: "2025-11-11T03:00:00.000Z",
    tags: ["grpc", "nuxt3", "interceptor", "error-recovery"]
  }
}
```

---

### 3. 메타데이터 비교 → 할일 정리 (클라이언트)

**목적**: 현재 프로젝트와 BestCase를 비교하여 개선점 도출

```typescript
// Claude/Copilot가 실행 (TypeScript 코드)
const todos = [];
const projectMeta = ${JSON.stringify(projectMetadata)};
const bestCaseMeta = ${JSON.stringify(bestCase.patterns.metadata)};

// 1. 누락된 패턴 체크
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
    referenceFile: bestCase.files.find(f => f.path.includes('Grpc'))
  });
}

if (missingPatterns.includes('error-recovery')) {
  todos.push({
    id: 'add-error-recovery',
    reason: 'BestCase에 에러 복구 로직 존재',
    files: ['composables/useGrpcClient.ts'],
    loc: 30,
    priority: 'medium',
    referenceFile: bestCase.files.find(f => f.path.includes('Grpc'))
  });
}

// 2. 복잡도 비교
if (projectMeta.averageComplexity === 'very-high' &&
    bestCaseMeta.averageComplexity === 'medium') {
  todos.push({
    id: 'refactor-complexity',
    reason: 'BestCase 대비 복잡도 높음 (very-high vs medium)',
    files: projectMeta.excellentFiles
      .filter(f => f.complexity === 'very-high')
      .map(f => f.path),
    loc: 150,
    priority: 'medium'
  });
}

// 3. API 메서드 활용도 비교
const unusedMethods = bestCaseMeta.apiMethods.filter(m =>
  !projectMeta.apiMethods.includes(m)
);

if (unusedMethods.length > 0) {
  todos.push({
    id: 'add-missing-api-methods',
    reason: \`BestCase에 \${unusedMethods.length}개 추가 API 메서드 존재\`,
    files: ['composables/useApi.ts'],
    loc: unusedMethods.length * 20,
    priority: 'low',
    details: unusedMethods.slice(0, 5).join(', ')
  });
}

// 4. 에러 처리 품질 비교
const projectErrorHandling = projectMeta.filesWithGoodErrorHandling / projectMeta.totalFiles;
const bestCaseErrorHandling = bestCaseMeta.filesWithGoodErrorHandling / bestCaseMeta.totalFiles;

if (projectErrorHandling < bestCaseErrorHandling * 0.8) {
  todos.push({
    id: 'improve-error-handling',
    reason: \`에러 처리 품질 낮음 (\${(projectErrorHandling * 100).toFixed(0)}% vs \${(bestCaseErrorHandling * 100).toFixed(0)}%)\`,
    files: projectMeta.files
      .filter(f => f.errorHandling === 'none' || f.errorHandling === 'basic')
      .slice(0, 5)
      .map(f => f.path),
    loc: 80,
    priority: 'high'
  });
}

// 5. 우수 컴포넌트 활용도
const bestCaseComponents = bestCaseMeta.componentsUsed;
const unusedComponents = bestCaseComponents.filter(c =>
  !projectMeta.componentsUsed.includes(c)
);

if (unusedComponents.length > 0) {
  todos.push({
    id: 'use-better-components',
    reason: \`BestCase에서 사용하는 컴포넌트 미사용: \${unusedComponents.join(', ')}\`,
    files: ['pages/**/*.vue'],
    loc: 40,
    priority: 'low'
  });
}

return { todos, comparison: {
  missingPatterns,
  complexityGap: projectMeta.averageComplexity + ' vs ' + bestCaseMeta.averageComplexity,
  unusedMethods: unusedMethods.length,
  errorHandlingGap: ((bestCaseErrorHandling - projectErrorHandling) * 100).toFixed(0) + '%'
}};
```

**생성되는 TODO 예시**:
```typescript
[
  {
    id: 'add-interceptor-pattern',
    reason: 'BestCase에 우수 interceptor 패턴 존재',
    files: ['composables/useGrpcClient.ts'],
    loc: 50,
    priority: 'high',
    referenceFile: {
      path: 'composables/useGrpcClient.ts',
      content: '// BestCase 코드...',
      purpose: 'Proper interceptor pattern'
    }
  },
  {
    id: 'improve-error-handling',
    reason: '에러 처리 품질 낮음 (71% vs 90%)',
    files: ['pages/users/index.vue', 'composables/useApi.ts'],
    loc: 80,
    priority: 'high'
  }
]
```

---

### 4. 코드 실행 (클라이언트)

**목적**: TODO를 기반으로 실제 코드 생성 및 적용

```typescript
// Claude/Copilot가 가이드 + TODO + BestCase를 참고하여 코드 생성
const code = `
// 1. BestCase 참고 파일 로드
const interceptorPattern = ${JSON.stringify(todos[0].referenceFile.content)};

// 2. 현재 파일 읽기
const currentFile = await filesystem.readFile('composables/useGrpcClient.ts');

// 3. 패턴 적용
const updatedCode = applyInterceptorPattern(currentFile, interceptorPattern);

// 4. 파일 쓰기
await filesystem.writeFile('composables/useGrpcClient.ts', updatedCode);

return { success: true, filesModified: ['composables/useGrpcClient.ts'] };
`;

await mcp.callTool('execute', { code });
```

---

### 5. [백그라운드] 메타데이터 주기적 추출 (MCP 서버 cron job)

**목적**: 사용자가 지정한 프로젝트들의 메타데이터를 미리 추출하여 BestCase DB에 저장

**실행 주기**: 매일 새벽 3시 (cron: `0 3 * * *`)

**스크립트**: `scripts/scan/auto-scan-projects-ai.ts`

```typescript
// cron job이 실행
import { MetadataAnalyzer } from 'llm-analyzer';

const analyzer = new MetadataAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

// 설정 파일에서 프로젝트 목록 읽기
const projects = findAllNuxtProjects(PROJECTS_BASE_PATH);

for (const project of projects) {
  console.log(`📊 Analyzing ${project.name}...`);

  // 프로젝트 파일 스캔
  const files = await scanProjectFiles(project.path);

  // 메타데이터 추출 (Ollama LLM 사용)
  const metadata = await analyzer.analyzeProject(
    project.path,
    files,
    2  // concurrency
  );

  // 우수 파일이 있으면 BestCase로 저장
  if (metadata.excellentFiles.length > 0) {
    await runAgentScript({
      code: `
        await bestcase.save({
          projectName: '${project.name}',
          category: 'auto-scan-metadata',
          description: '자동 스캔: ${metadata.excellentFiles.length}개 우수 파일',
          files: ${JSON.stringify(metadata.excellentFiles.map(ef => ({
            path: ef.path,
            content: readFileSync(join(project.path, ef.path), 'utf-8'),
            purpose: ef.reasons.join(', ')
          })))},
          patterns: {
            metadata: ${JSON.stringify(metadata)},
            excellentReasons: ${JSON.stringify(metadata.excellentFiles.flatMap(f => f.reasons))}
          },
          tags: ${JSON.stringify([...metadata.frameworks, ...metadata.patterns, metadata.apiType])}
        });
      `
    });

    console.log(`✅ Saved ${metadata.excellentFiles.length} excellent files`);
  }
}
```

---

## 🎯 토큰 절감 효과

### 전통적인 MCP 방식
```
tools/list 응답:
  - execute 도구 정의: 200 토큰
  - list_bestcases 도구 정의: 150 토큰
  - load_bestcase 도구 정의: 150 토큰
  - search_guides 도구 정의: 200 토큰
  - load_guide 도구 정의: 150 토큰
  - combine_guides 도구 정의: 200 토큰
  - execute_workflow 도구 정의: 250 토큰
  - analyze_metadata 도구 정의: 200 토큰
  총: ~1,500 토큰

모든 가이드 로드: ~100,000 토큰

전체: ~101,500 토큰
```

### Code Mode 방식
```
tools/list 응답:
  - execute 도구 정의: 200 토큰

필요한 가이드만 로드 (5개): ~6,000 토큰

전체: ~6,200 토큰

절감률: 94% 🎉
```

---

## 📚 핵심 원칙

### 1. MCP 도구는 최소한으로
- ✅ `execute` 도구 하나 (또는 execute + 간단한 조회 몇 개)
- ❌ 기능마다 도구 추가 금지

### 2. 로직은 TypeScript 코드로
- ✅ 클라이언트가 TypeScript 코드 작성
- ✅ `execute` 도구로 Sandbox에서 실행
- ❌ MCP 서버가 로직 실행 금지

### 3. Sandbox API 제공
- ✅ `filesystem`, `bestcase`, `guides`, `metadata` API
- ✅ Sandbox 내부에서만 접근 가능
- ❌ MCP 도구로 노출 금지

### 4. 메타데이터 기반 비교
- ✅ BestCase는 메타데이터 저장 (`patterns.metadata`)
- ✅ 현재 프로젝트 메타데이터 추출
- ✅ 비교 → 차이점 → TODO 생성
- ❌ 점수 기반 비교 금지

### 5. 백그라운드 메타데이터 추출
- ✅ cron job으로 주기적 실행
- ✅ 우수 파일만 BestCase로 저장
- ✅ 클라이언트는 미리 추출된 데이터 활용

---

## 🔄 다음 단계

1. ✅ **문서 작성** (현재 문서)
2. BestCase 구조 변경 (`patterns.metadata` 추가)
3. Sandbox API에 `guides`, `metadata` 통합
4. Preflight 단순화 (선택적)
5. cron job 스크립트 수정 (MetadataAnalyzer 사용)

---

**참고 문서**:
- [METADATA_SYSTEM.md](./METADATA_SYSTEM.md) - 메타데이터 타입 정의
- [GUIDES_MCP_INTEGRATION.md](./GUIDES_MCP_INTEGRATION.md) - 가이드 시스템
- Anthropic MCP Code Mode: https://aisparkup.com/posts/6318

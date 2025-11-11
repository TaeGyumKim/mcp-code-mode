# 전체 프로세스 요약

## 🎯 시스템 개요

**Anthropic MCP Code Mode** 방식으로 구축된 **메타데이터 기반 코드 분석 및 가이드 시스템**

### 핵심 원칙
1. **MCP 도구 최소화**: execute 하나만 제공 → 87% 토큰 절감
2. **메타데이터 기반 비교**: 점수 대신 구조화된 정보 활용
3. **동적 가이드 로딩**: 필요한 가이드만 선택적 로드 → 94% 토큰 절감
4. **Sandbox API 제공**: filesystem, bestcase, guides, metadata
5. **클라이언트 중심 로직**: TypeScript 코드로 모든 로직 실행

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  MCP 클라이언트 (Claude / GitHub Copilot)               │
│  ─────────────────────────────────────────────────────  │
│  1. TypeScript 코드 작성                                │
│  2. execute 도구로 Sandbox 실행                         │
│  3. Sandbox API 사용:                                   │
│     - metadata: 메타데이터 추출                         │
│     - bestcase: BestCase 조회/비교                      │
│     - guides: 가이드 검색/병합                          │
│     - filesystem: 파일 읽기/쓰기                        │
│  4. 메타데이터 비교 → TODO 생성                         │
│  5. 코드 생성 및 실행                                   │
└─────────────────────────────────────────────────────────┘
                    ↕ MCP 프로토콜 (stdio)
┌─────────────────────────────────────────────────────────┐
│  MCP 서버 (Node.js + Docker)                            │
│  ─────────────────────────────────────────────────────  │
│  [MCP 도구] (최소화)                                    │
│    - execute: TypeScript 코드 실행                      │
│                                                         │
│  [Sandbox APIs] (execute 내부)                          │
│    - filesystem: 파일 시스템 접근                       │
│    - bestcase: BestCase CRUD                            │
│    - guides: 가이드 검색/병합                           │
│    - metadata: MetadataAnalyzer 생성                    │
│                                                         │
│  [백그라운드 서비스]                                    │
│    - cron job: 주기적 메타데이터 추출                   │
│    - Ollama LLM: qwen2.5-coder:7b                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 핵심 프로세스 (5단계)

### 1️⃣ 대상 프로젝트 메타데이터 추출

**목적**: 현재 프로젝트의 기술 스택, 패턴, 복잡도 파악

**실행 주체**: 클라이언트 (Claude/Copilot)

**코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // Sandbox의 metadata API 사용
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    // 프로젝트 파일 스캔
    const files = await filesystem.scanProject('/workspace/myapp', {
      include: ['**/*.ts', '**/*.vue'],
      exclude: ['node_modules', 'dist']
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
```

**출력 (ProjectMetadata)**:
```typescript
{
  frameworks: ["@grpc/grpc-js", "nuxt3", "pinia"],
  patterns: ["interceptor", "error-recovery", "composition-api"],
  apiType: "grpc",
  apiMethods: ["getUserList", "createUser", "updateUser"],
  complexity: "medium",
  excellentFiles: [
    {
      path: "composables/useGrpcClient.ts",
      reasons: ["Proper interceptor pattern", "Comprehensive error handling"],
      patterns: ["interceptor", "error-recovery"]
    }
  ],
  // ... 기타 정보
}
```

---

### 2️⃣ BestCase 메타데이터 로드

**목적**: 유사한 우수 프로젝트 사례 찾기

**실행 주체**: 클라이언트 (Claude/Copilot)

**코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. BestCase 목록 조회
    const allCases = await bestcase.list();

    // 2. 유사한 케이스 필터링
    const similarCases = allCases.bestcases.filter(bc => {
      const bcMeta = bc.patterns?.metadata;
      if (!bcMeta) return false;

      // API 타입 일치
      return bcMeta.apiType === projectMeta.apiType &&
             bcMeta.frameworks.some(f => projectMeta.frameworks.includes(f));
    });

    // 3. 우수 파일이 가장 많은 케이스 선택
    const bestCase = similarCases.sort((a, b) =>
      (b.patterns?.metadata?.excellentFiles?.length || 0) -
      (a.patterns?.metadata?.excellentFiles?.length || 0)
    )[0];

    // 4. 전체 로드
    const fullBestCase = await bestcase.load({
      projectName: bestCase.projectName,
      category: bestCase.category
    });

    return fullBestCase.bestCases[0];
  `
});
```

**BestCase 구조**:
```typescript
{
  projectName: "excellent-project",
  category: "auto-scan-metadata",  // ✅ 메타데이터 카테고리

  files: [
    {
      path: "composables/useGrpcClient.ts",
      content: "export const useGrpcClient = () => { ... }",
      purpose: "Proper interceptor pattern"
    }
  ],

  // ✅ 메타데이터 저장
  patterns: {
    metadata: {  // ProjectMetadata
      frameworks: ["@grpc/grpc-js", "nuxt3"],
      patterns: ["interceptor", "error-recovery"],
      apiType: "grpc",
      excellentFiles: [...]
    },
    excellentReasons: ["Proper interceptor pattern", ...]
  }
}
```

---

### 3️⃣ 메타데이터 비교 → TODO 생성

**목적**: 현재 프로젝트와 BestCase를 비교하여 개선점 도출

**실행 주체**: 클라이언트 (Claude/Copilot)

**비교 로직**:
```typescript
const todos = [];
const projectMeta = /* 1단계에서 추출한 메타데이터 */;
const bestCaseMeta = /* 2단계에서 로드한 BestCase의 metadata */;

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

// 2. 복잡도 비교
if (projectMeta.averageComplexity === 'very-high' &&
    bestCaseMeta.averageComplexity === 'medium') {
  todos.push({
    id: 'refactor-complexity',
    reason: 'BestCase 대비 복잡도 높음 (very-high vs medium)',
    files: projectMeta.files.filter(f => f.complexity === 'very-high').map(f => f.path),
    loc: 150,
    priority: 'medium'
  });
}

// 3. 에러 처리 품질 비교
const projectErrorHandling = projectMeta.filesWithGoodErrorHandling / projectMeta.totalFiles;
const bestCaseErrorHandling = bestCaseMeta.filesWithGoodErrorHandling / bestCaseMeta.totalFiles;

if (projectErrorHandling < bestCaseErrorHandling * 0.8) {
  todos.push({
    id: 'improve-error-handling',
    reason: `에러 처리 품질 낮음 (${(projectErrorHandling*100).toFixed(0)}% vs ${(bestCaseErrorHandling*100).toFixed(0)}%)`,
    files: projectMeta.files.filter(f => f.errorHandling !== 'comprehensive').slice(0, 5).map(f => f.path),
    loc: 80,
    priority: 'high'
  });
}
```

**생성된 TODO 예시**:
```typescript
[
  {
    id: 'add-interceptor-pattern',
    reason: 'BestCase에 우수 interceptor 패턴 존재',
    files: ['composables/useGrpcClient.ts'],
    loc: 50,
    priority: 'high',
    referenceFile: { path: '...', content: '...', purpose: '...' }
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

### 4️⃣ 가이드 검색 및 병합

**목적**: 메타데이터를 키워드로 활용하여 필요한 가이드만 동적 로드

**실행 주체**: 클라이언트 (Claude/Copilot)

**코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. 메타데이터 → 키워드 변환
    const keywords = [
      ...projectMeta.patterns,      // "interceptor", "error-recovery"
      ...projectMeta.frameworks,    // "grpc", "nuxt3"
      ...projectMeta.features,      // "api-client", "crud"
      projectMeta.apiType          // "grpc"
    ];

    // 2. 가이드 검색 (BM25-like 스코어링)
    const searchResult = await guides.search({
      keywords,
      apiType: projectMeta.apiType,
      mandatoryIds: [
        'grpc.api.connection',
        'api.validation',
        'error.handling'
      ]
    });

    // 3. 상위 5개 가이드 병합
    const combined = await guides.combine({
      ids: searchResult.guides.slice(0, 5).map(g => g.id),
      context: {
        project: 'myapp',
        apiType: projectMeta.apiType
      }
    });

    return {
      keywords,
      guidesFound: searchResult.guides.length,
      guidesUsed: combined.usedGuides,
      combinedContent: combined.combined
    };
  `
});
```

**결과**:
- 전체 11개 가이드 중 5개만 로드 → **94% 토큰 절감**
- 병합된 가이드 내용을 프롬프트에 포함하여 코드 생성

---

### 5️⃣ 코드 생성 및 실행

**목적**: TODO + 가이드 + BestCase 참고하여 실제 코드 생성

**실행 주체**: 클라이언트 (Claude/Copilot)

**코드**:
```typescript
// Claude/Copilot가 가이드 + TODO + BestCase를 참고하여 코드 생성
const code = `
// 1. BestCase 참고 파일 로드
const referenceCode = ${JSON.stringify(todos[0].referenceFile.content)};

// 2. 현재 파일 읽기
const currentFile = await filesystem.readFile({
  path: 'composables/useGrpcClient.ts'
});

// 3. 패턴 적용 (가이드 내용 참고)
const updatedCode = \`
export const useGrpcClient = () => {
  // ✅ Interceptor 패턴 추가 (BestCase 참고)
  const client = createGrpcClient({
    interceptors: [errorInterceptor, retryInterceptor]
  });

  // ✅ 에러 처리 개선 (가이드 참고)
  const handleError = (error) => {
    if (error instanceof ConnectError) {
      // Comprehensive error handling
    }
  };

  return { client, handleError };
};
\`;

// 4. 파일 쓰기
await filesystem.writeFile({
  path: 'composables/useGrpcClient.ts',
  content: updatedCode
});

return { success: true, filesModified: ['composables/useGrpcClient.ts'] };
`;

await mcp.callTool('execute', { code });
```

---

## 🔄 백그라운드 프로세스 (cron job)

### 메타데이터 주기적 추출

**목적**: 사용자 프로젝트들의 메타데이터를 미리 추출하여 BestCase DB 구축

**실행 주기**: 매일 새벽 3시 (cron: `0 3 * * *`)

**스크립트**: `scripts/scan/auto-scan-projects-ai.ts`

**프로세스**:
```typescript
import { MetadataAnalyzer } from 'llm-analyzer';

const analyzer = new MetadataAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

// 1. 설정된 프로젝트 목록 스캔
const projects = findAllNuxtProjects(PROJECTS_BASE_PATH);

for (const project of projects) {
  // 2. 프로젝트 파일 스캔
  const files = await scanProjectFiles(project.path);

  // 3. 메타데이터 추출 (Ollama LLM 사용)
  const metadata = await analyzer.analyzeProject(
    project.path,
    files,
    2  // concurrency
  );

  // 4. 우수 파일이 있으면 BestCase로 저장
  if (metadata.excellentFiles.length > 0) {
    await runAgentScript({
      code: `
        await bestcase.save({
          projectName: '${project.name}',
          category: 'auto-scan-metadata',
          description: '자동 스캔: ${metadata.excellentFiles.length}개 우수 파일',
          files: [/* 우수 파일들 */],
          patterns: {
            metadata: ${JSON.stringify(metadata)},  // ✅ ProjectMetadata 저장
            excellentReasons: [/* 우수 이유들 */]
          },
          tags: ${JSON.stringify([...metadata.frameworks, ...metadata.patterns, metadata.apiType])}
        });
      `
    });
  }
}
```

---

## 📁 주요 파일 및 역할

### 1. MCP 서버
| 파일 | 역할 | 변경 사항 |
|------|------|----------|
| `mcp-stdio-server.ts` | MCP 도구 정의 | 7개 → 1개 (execute), 87% 토큰 절감 |
| `packages/ai-runner/src/sandbox.ts` | Sandbox 환경 | guides, metadata API 추가 |

### 2. BestCase 시스템
| 파일 | 역할 | 변경 사항 |
|------|------|----------|
| `packages/bestcase-db/src/storage.ts` | BestCase 데이터 구조 | `patterns.metadata` 필드 추가 |
| `scripts/scan/auto-scan-projects-ai.ts` | cron job 스크립트 | CodeAnalyzer → MetadataAnalyzer |

### 3. Guides 시스템
| 파일 | 역할 | 변경 사항 |
|------|------|----------|
| `mcp-servers/guides/index.ts` | 가이드 검색/병합 | executeWorkflow() deprecated |
| `mcp-servers/guides/preflight.ts` | Preflight 검수 | 826줄 → 240줄 (71% 축소), deprecated |

### 4. 메타데이터 시스템
| 파일 | 역할 | 상태 |
|------|------|------|
| `packages/llm-analyzer/src/metadata.ts` | 메타데이터 타입 정의 | ✅ 완료 |
| `packages/llm-analyzer/src/metadataAnalyzer.ts` | 메타데이터 분석기 | ✅ 완료 |
| `packages/llm-analyzer/src/metadataPrompts.ts` | LLM 프롬프트 | ✅ 완료 |

### 5. 문서
| 파일 | 내용 |
|------|------|
| `docs/WORKFLOW_CORRECT.md` | 전체 워크플로우 상세 설명 |
| `docs/GUIDES_MCP_INTEGRATION.md` | 가이드 시스템 Sandbox API 통합 |
| `docs/METADATA_SYSTEM.md` | 메타데이터 시스템 설명 |
| `docs/PROCESS_SUMMARY.md` | 전체 프로세스 요약 (이 문서) |

---

## 📈 효과 측정

### 토큰 절감

#### 전통적인 MCP 방식
```
tools/list 응답:
  - execute: 200 토큰
  - list_bestcases: 150 토큰
  - load_bestcase: 150 토큰
  - search_guides: 200 토큰
  - load_guide: 150 토큰
  - combine_guides: 200 토큰
  - execute_workflow: 250 토큰
  총: 1,500 토큰

모든 가이드 로드: 100,000 토큰

전체: ~101,500 토큰
```

#### Anthropic Code Mode 방식
```
tools/list 응답:
  - execute: 200 토큰

필요한 가이드만 로드 (5개): 6,000 토큰

전체: ~6,200 토큰

절감률: 94% 🎉
```

### 코드 축소

| 파일 | Before | After | 절감률 |
|------|--------|-------|--------|
| mcp-stdio-server.ts | 7개 도구 | 1개 도구 | 87% |
| preflight.ts | 826줄 | 240줄 | 71% |
| 전체 삭제 줄 수 | - | 1,642줄 | - |

---

## 🎯 핵심 원칙 재확인

1. ✅ **MCP 도구는 최소한으로** - execute 하나만
2. ✅ **로직은 TypeScript 코드로** - 클라이언트가 작성
3. ✅ **Sandbox API 제공** - filesystem, bestcase, guides, metadata
4. ✅ **메타데이터 기반 비교** - 점수 대신 구조화된 정보
5. ✅ **백그라운드 메타데이터 추출** - cron job으로 자동화

---

## 📚 참고 문서

- **[WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md)**: 전체 워크플로우 상세 설명
- **[GUIDES_MCP_INTEGRATION.md](./GUIDES_MCP_INTEGRATION.md)**: 가이드 시스템 Sandbox API 통합
- **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)**: 메타데이터 시스템 설명
- **Anthropic MCP Code Mode**: https://aisparkup.com/posts/6318

---

## 🚀 다음 단계

### 사용 방법

1. **Docker 환경 시작**:
   ```bash
   docker-compose -f docker-compose.ai.yml up -d
   ```

2. **Claude/Copilot에서 사용**:
   ```typescript
   // 1. 메타데이터 추출
   await mcp.callTool('execute', { code: '...' });

   // 2. BestCase 검색
   await mcp.callTool('execute', { code: '...' });

   // 3. 가이드 로드
   await mcp.callTool('execute', { code: '...' });

   // 4. 코드 생성
   await mcp.callTool('execute', { code: '...' });
   ```

3. **cron job 확인**:
   ```bash
   docker logs -f bestcase-cron-scheduler
   ```

### 테스트

```bash
# 메타데이터 분석기 테스트
npm run test:metadata

# 가이드 시스템 테스트
npm run test:guides

# 전체 플로우 테스트
npm run test:flow
```

---

**마지막 업데이트**: 2025-11-11
**버전**: 1.0.0
**상태**: ✅ 모든 작업 완료

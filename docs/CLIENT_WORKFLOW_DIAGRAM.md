# 클라이언트 작업 요청 흐름도

**작성일**: 2025-11-12
**버전**: 1.0.0

---

## 📋 목차

1. [전체 흐름도 개요](#전체-흐름도-개요)
2. [단계별 상세 흐름](#단계별-상세-흐름)
3. [실제 사용 예시](#실제-사용-예시)
4. [데이터 흐름](#데이터-흐름)
5. [에러 처리](#에러-처리)

---

## 전체 흐름도 개요

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 사용자 (User)                                                │
│  "현재 프로젝트를 분석하고 개선점을 알려줘"                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🤖 클라이언트 (VSCode Copilot / Claude)                         │
│  ────────────────────────────────────────────────────────────   │
│  1. 사용자 요청 분석                                              │
│  2. TypeScript 코드 작성 (Sandbox API 사용)                      │
│  3. MCP execute 도구 호출                                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ MCP JSON-RPC (stdio)
                          │ { method: "tools/call",
                          │   params: { name: "execute",
                          │             arguments: { code: "..." } } }
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🔧 MCP 서버 (Docker Container)                                  │
│  mcp-stdio-server.ts (185줄)                                     │
│  ────────────────────────────────────────────────────────────   │
│  1. JSON-RPC 요청 파싱                                            │
│  2. execute 도구 실행 → runAgentScript()                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🏝️ Sandbox (VM2)                                                │
│  packages/ai-runner/src/sandbox.ts (109줄)                       │
│  ────────────────────────────────────────────────────────────   │
│  안전한 격리 환경에서 TypeScript 코드 실행                         │
│                                                                   │
│  사용 가능한 API:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📁 filesystem  : readFile, writeFile, searchFiles      │   │
│  │ 💾 bestcase    : save, load, search, list              │   │
│  │ 📚 guides      : searchGuides, combineGuides           │   │
│  │ 🔍 metadata    : createAnalyzer                        │   │
│  │ 📋 console     : log, error (JSON.stringify 지원)      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
┌──────────────────────┐   ┌─────────────────────────┐
│  📁 Filesystem       │   │  💾 BestCase Storage    │
│  /projects/myapp     │   │  /projects/.bestcases   │
│                      │   │                         │
│  - 파일 읽기/쓰기    │   │  - BestCase 저장/로드    │
│  - 패턴 검색         │   │  - 메타데이터 비교       │
└──────────────────────┘   └─────────────────────────┘
              │                       │
              ▼                       ▼
┌──────────────────────┐   ┌─────────────────────────┐
│  📚 Guides System    │   │  🔍 Metadata Analyzer   │
│  .github/            │   │  llm-analyzer           │
│  instructions/       │   │                         │
│  guides/             │   │  - Ollama LLM 호출      │
│                      │   │  - 메타데이터 추출       │
│  - 14개 가이드       │   │  - 점수 계산             │
│  - 동적 로딩         │   │                         │
└──────────────────────┘   └─────────────────────────┘
              │                       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  🤖 Ollama LLM      │
              │  (Docker Container) │
              │                     │
              │  qwen2.5-coder:7b   │
              │  GPU 가속           │
              └─────────────────────┘
                          │
                          │ 모든 결과 수집
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🏝️ Sandbox (실행 완료)                                          │
│  ────────────────────────────────────────────────────────────   │
│  return {                                                        │
│    ok: true,                                                     │
│    output: { /* 메타데이터, TODO, 분석 결과 */ },                │
│    logs: ["로그1", "로그2"]                                       │
│  }                                                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🔧 MCP 서버                                                      │
│  ────────────────────────────────────────────────────────────   │
│  JSON-RPC 응답 전송:                                             │
│  {                                                               │
│    jsonrpc: "2.0",                                               │
│    id: 1,                                                        │
│    result: { ok: true, output: {...}, logs: [...] }             │
│  }                                                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │ MCP JSON-RPC (stdio)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🤖 클라이언트 (응답 수신)                                         │
│  ────────────────────────────────────────────────────────────   │
│  1. 결과 분석                                                     │
│  2. 사용자에게 친화적인 형식으로 변환                              │
│  3. 필요시 추가 execute 호출 (코드 생성 등)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  👤 사용자 (결과 확인)                                            │
│  ────────────────────────────────────────────────────────────   │
│  📊 분석 결과:                                                    │
│  - 현재 프로젝트: nuxt3 + grpc                                    │
│  - 누락된 패턴: interceptor, error-recovery                      │
│  - 개선 항목 3개 발견                                             │
│                                                                   │
│  📋 TODO:                                                         │
│  1. interceptor 패턴 추가 (참고: useGrpcClient.ts, 92점)        │
│  2. 에러 처리 개선 (현재 71% vs BestCase 90%)                    │
│                                                                   │
│  어떤 항목부터 개선하시겠습니까?                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 단계별 상세 흐름

### Phase 1: 초기화 (MCP 연결)

```
👤 사용자: VSCode 시작 → MCP Extension 활성화

🤖 클라이언트:
  1. mcp_settings.json 읽기
     {
       "mcpServers": {
         "mcp-code-mode": {
           "command": "docker",
           "args": ["exec", "-i", "mcp-code-mode-server",
                    "node", "/app/mcp-stdio-server.js"]
         }
       }
     }

  2. MCP 서버 프로세스 시작 (stdio)
     docker exec -i mcp-code-mode-server node /app/mcp-stdio-server.js

  3. initialize 요청 전송
     → { method: "initialize", params: {...} }
     ← { result: { capabilities: { tools: {} }, ... } }

  4. tools/list 요청 전송
     → { method: "tools/list" }
     ← { result: { tools: [{ name: "execute", ... }] } }

✅ MCP 연결 완료
```

### Phase 2: 사용자 요청 처리

```
👤 사용자: "현재 프로젝트를 분석하고 개선점을 알려줘"

🤖 클라이언트 (내부 사고 과정):
  1. 요청 분석
     - 작업 유형: 프로젝트 분석
     - 필요한 작업:
       ✓ 프로젝트 메타데이터 추출
       ✓ BestCase 로드
       ✓ 메타데이터 비교
       ✓ TODO 생성

  2. TypeScript 코드 작성
     - Sandbox의 metadata API 사용
     - Sandbox의 bestcase API 사용
     - Sandbox의 filesystem API 사용

  3. execute 도구 호출
     → MCP JSON-RPC 전송
```

### Phase 3: Sandbox 실행

```
🔧 MCP 서버:
  1. JSON-RPC 요청 수신
     {
       jsonrpc: "2.0",
       id: 1,
       method: "tools/call",
       params: {
         name: "execute",
         arguments: {
           code: "const analyzer = metadata.createAnalyzer({...}); ...",
           timeoutMs: 30000
         }
       }
     }

  2. runAgentScript() 호출
     → packages/ai-runner/dist/agentRunner.js

🏝️ Sandbox (VM2):
  1. VM2 인스턴스 생성
     - 격리된 환경
     - Sandbox API 주입

  2. TypeScript 코드 실행
     ┌─────────────────────────────────────┐
     │ // 클라이언트가 작성한 코드          │
     │                                     │
     │ // 1. MetadataAnalyzer 생성         │
     │ const analyzer =                    │
     │   metadata.createAnalyzer({         │
     │     ollamaUrl: 'http://ollama:11434'│
     │     model: 'qwen2.5-coder:7b'       │
     │   });                               │
     │                                     │
     │ // 2. 파일 검색                     │
     │ const files =                       │
     │   await filesystem.searchFiles({    │
     │     path: '/projects/myapp',        │
     │     pattern: '**/*.{ts,vue}',       │
     │     recursive: true                 │
     │   });                               │
     │                                     │
     │ // 3. 메타데이터 추출               │
     │ const projectMeta =                 │
     │   await analyzer.analyzeProject(    │
     │     '/projects/myapp',              │
     │     files,                          │
     │     3  // concurrency               │
     │   );                                │
     │                                     │
     │ // 4. BestCase 로드                 │
     │ const allCases =                    │
     │   await bestcase.list();            │
     │                                     │
     │ const similarCase =                 │
     │   allCases.bestcases.find(bc =>     │
     │     bc.patterns?.metadata?.apiType  │
     │       === projectMeta.apiType       │
     │   );                                │
     │                                     │
     │ const bestCase =                    │
     │   await bestcase.load({             │
     │     projectName: similarCase.name,  │
     │     category: 'auto-scan-metadata'  │
     │   });                               │
     │                                     │
     │ // 5. 메타데이터 비교               │
     │ const missingPatterns =             │
     │   bestCase.patterns.metadata        │
     │     .patterns.filter(p =>           │
     │       !projectMeta.patterns         │
     │         .includes(p)                │
     │     );                              │
     │                                     │
     │ // 6. TODO 생성                     │
     │ const todos = [];                   │
     │ if (missingPatterns                 │
     │       .includes('interceptor')) {   │
     │   todos.push({                      │
     │     id: 'add-interceptor',          │
     │     reason: 'BestCase에 우수...',   │
     │     referenceFile: ...              │
     │   });                               │
     │ }                                   │
     │                                     │
     │ // 7. 결과 반환                     │
     │ return {                            │
     │   projectMeta,                      │
     │   bestCaseMeta,                     │
     │   todos,                            │
     │   comparison: {                     │
     │     missingPatterns,                │
     │     complexityGap: ...              │
     │   }                                 │
     │ };                                  │
     └─────────────────────────────────────┘

  3. Sandbox API 호출 처리
     ├─ filesystem.searchFiles()
     │  → mcp-servers/filesystem/index.js
     │  → Node.js fs 모듈
     │  ← { files: [...] }
     │
     ├─ metadata.createAnalyzer()
     │  → MetadataAnalyzer 인스턴스 생성
     │  → analyzeProject()
     │    ├─ analyzeFilesParallel()
     │    │  → Ollama LLM 호출 (병렬)
     │    │    → http://ollama:11434/api/generate
     │    │    ← { metadata: {...} }
     │    │
     │    └─ aggregateMetadata()
     │       ← ProjectMetadata
     │
     ├─ bestcase.list()
     │  → mcp-servers/bestcase/index.js
     │  → BestCaseStorage.list()
     │  → /projects/.bestcases/*.json 읽기
     │  ← { bestcases: [...] }
     │
     ├─ bestcase.load()
     │  → BestCaseStorage.search()
     │  ← { bestCases: [{ patterns: { metadata: {...} } }] }
     │
     └─ console.log()
        → logs 배열에 추가 (JSON.stringify로 포맷팅)

  4. 실행 완료
     {
       ok: true,
       output: {
         projectMeta: {...},
         bestCaseMeta: {...},
         todos: [...],
         comparison: {...}
       },
       logs: [
         "분석 완료: { patterns: [...], frameworks: [...] }",
         "BestCase 발견: excellent-project",
         "누락된 패턴 3개 발견"
       ]
     }
```

### Phase 4: 응답 전송

```
🔧 MCP 서버:
  1. Sandbox 결과 수신
  2. JSON-RPC 응답 생성
     {
       jsonrpc: "2.0",
       id: 1,
       result: {
         content: [
           {
             type: "text",
             text: JSON.stringify({
               ok: true,
               output: {...},
               logs: [...]
             }, null, 2)
           }
         ]
       }
     }
  3. stdio로 전송

🤖 클라이언트:
  1. JSON-RPC 응답 수신
  2. result.content[0].text 파싱
  3. output 데이터 추출
```

### Phase 5: 결과 표시

```
🤖 클라이언트 (결과 포맷팅):
  1. 메타데이터 분석
     projectMeta = {
       patterns: ["state-management", "api-call"],
       frameworks: ["nuxt3", "@grpc/grpc-js"],
       apiType: "grpc",
       complexity: "medium"
     }

  2. TODO 분석
     todos = [
       {
         id: "add-interceptor",
         reason: "BestCase에 우수 interceptor 패턴 존재",
         referenceFile: {
           path: "composables/useGrpcClient.ts",
           score: 92,
           metadata: { patterns: ["interceptor", ...] }
         }
       },
       {
         id: "improve-error-handling",
         reason: "에러 처리 품질 낮음 (71% vs 90%)",
         referenceFiles: [...]
       }
     ]

  3. 사용자 친화적 메시지 생성

👤 사용자에게 표시:
  ─────────────────────────────────────────
  📊 현재 프로젝트를 분석했습니다.

  **프로젝트 정보**:
  - Frameworks: nuxt3, @grpc/grpc-js
  - API Type: grpc
  - Complexity: medium
  - Patterns: state-management, api-call

  **BestCase 비교 결과**:
  - 참고 프로젝트: excellent-project
  - 누락된 패턴: interceptor, error-recovery

  📋 **개선이 필요한 항목 (2개)**:

  1. ⚠️ **interceptor 패턴 추가** (우선순위: 높음)
     - 이유: BestCase에 우수한 interceptor 패턴 존재
     - 참고 파일: composables/useGrpcClient.ts (92점/100점)
     - 예상 작업량: 50줄

  2. ⚠️ **에러 처리 개선** (우선순위: 높음)
     - 이유: 에러 처리 품질 낮음 (71% vs 90%)
     - 참고 파일:
       - composables/useGrpcClient.ts (92점)
       - composables/useApiClient.ts (85점)
     - 예상 작업량: 80줄

  어떤 항목부터 개선하시겠습니까?
  ─────────────────────────────────────────
```

---

## 실제 사용 예시

### 예시 1: 프로젝트 분석

**사용자 요청**:
```
"현재 프로젝트를 분석하고 개선점을 알려줘"
```

**클라이언트가 생성하는 코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. MetadataAnalyzer 생성
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://ollama:11434',
      model: 'qwen2.5-coder:7b'
    });

    // 2. 프로젝트 파일 스캔
    const files = await filesystem.searchFiles({
      path: '/projects/myapp',
      pattern: '**/*.{ts,tsx,vue}',
      recursive: true
    });

    console.log('파일 검색 완료:', files.files.length, '개');

    // 3. 메타데이터 추출 (상위 20개만)
    const filesWithContent = [];
    for (const file of files.files.slice(0, 20)) {
      const content = await filesystem.readFile({
        path: file.path
      });
      filesWithContent.push({
        path: file.path,
        content: content.content
      });
    }

    const projectMeta = await analyzer.analyzeProject(
      '/projects/myapp',
      filesWithContent,
      3  // concurrency
    );

    console.log('메타데이터 추출 완료:', projectMeta);

    // 4. BestCase 로드
    const allCases = await bestcase.list();
    const similarCase = allCases.bestcases.find(bc =>
      bc.category === 'auto-scan-metadata' &&
      bc.patterns?.metadata?.apiType === projectMeta.apiType
    );

    if (!similarCase) {
      return {
        found: false,
        message: '유사한 BestCase가 없습니다.'
      };
    }

    const bestCaseData = await bestcase.load({
      projectName: similarCase.projectName,
      category: similarCase.category
    });

    const bestCaseMeta = bestCaseData.bestCases[0].patterns.metadata;

    // 5. 메타데이터 비교
    const todos = [];
    const missingPatterns = bestCaseMeta.patterns.filter(p =>
      !projectMeta.patterns.includes(p)
    );

    if (missingPatterns.includes('interceptor')) {
      const referenceFiles = bestCaseData.bestCases[0].files
        .filter(f => f.metadata?.patterns?.includes('interceptor'))
        .filter(f => f.score >= 70)
        .sort((a, b) => b.score - a.score);

      if (referenceFiles.length > 0) {
        todos.push({
          id: 'add-interceptor-pattern',
          reason: 'BestCase에 우수 interceptor 패턴 존재',
          referenceFile: {
            path: referenceFiles[0].path,
            score: referenceFiles[0].score,
            metadata: referenceFiles[0].metadata
          },
          priority: 'high'
        });
      }
    }

    // 6. 에러 처리 품질 비교
    const projectErrorHandling =
      projectMeta.filesWithGoodErrorHandling / projectMeta.totalFiles;
    const bestCaseErrorHandling =
      bestCaseMeta.filesWithGoodErrorHandling / bestCaseMeta.totalFiles;

    if (projectErrorHandling < bestCaseErrorHandling * 0.8) {
      const referenceFiles = bestCaseData.bestCases[0].files
        .filter(f => f.metadata?.errorHandling === 'comprehensive')
        .filter(f => f.score >= 70)
        .slice(0, 3);

      todos.push({
        id: 'improve-error-handling',
        reason: \`에러 처리 품질 낮음 (\${(projectErrorHandling * 100).toFixed(0)}% vs \${(bestCaseErrorHandling * 100).toFixed(0)}%)\`,
        referenceFiles: referenceFiles.map(f => ({
          path: f.path,
          score: f.score,
          metadata: f.metadata
        })),
        priority: 'high'
      });
    }

    return {
      found: true,
      projectMeta,
      bestCaseMeta,
      todos,
      comparison: {
        missingPatterns,
        errorHandlingGap: ((bestCaseErrorHandling - projectErrorHandling) * 100).toFixed(0) + '%'
      }
    };
  `
});
```

**MCP 서버 처리 시간**: ~5-10초 (Ollama LLM 호출 포함)

**응답**:
```json
{
  "ok": true,
  "output": {
    "found": true,
    "projectMeta": {
      "patterns": ["state-management", "api-call"],
      "frameworks": ["nuxt3", "@grpc/grpc-js"],
      "apiType": "grpc",
      "complexity": "medium"
    },
    "bestCaseMeta": {
      "patterns": ["state-management", "api-call", "interceptor", "error-recovery"],
      "frameworks": ["nuxt3", "@grpc/grpc-js"],
      "apiType": "grpc"
    },
    "todos": [
      {
        "id": "add-interceptor-pattern",
        "reason": "BestCase에 우수 interceptor 패턴 존재",
        "referenceFile": {
          "path": "composables/useGrpcClient.ts",
          "score": 92
        },
        "priority": "high"
      },
      {
        "id": "improve-error-handling",
        "reason": "에러 처리 품질 낮음 (71% vs 90%)",
        "referenceFiles": [...],
        "priority": "high"
      }
    ],
    "comparison": {
      "missingPatterns": ["interceptor", "error-recovery"],
      "errorHandlingGap": "19%"
    }
  },
  "logs": [
    "파일 검색 완료: 45 개",
    "메타데이터 추출 완료: {\n  \"patterns\": [\"state-management\", \"api-call\"],\n  \"frameworks\": [\"nuxt3\", \"@grpc/grpc-js\"],\n  \"apiType\": \"grpc\"\n}"
  ]
}
```

### 예시 2: 코드 생성

**사용자 요청**:
```
"interceptor 패턴을 추가해줘"
```

**클라이언트 동작**:

1. **Phase 1: 가이드 로드**
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. 가이드 검색
    const searchResult = await guides.searchGuides({
      keywords: ['interceptor', 'grpc', 'error-handling'],
      apiType: 'grpc',
      mandatoryIds: ['grpc.api.connection', 'error.handling']
    });

    console.log('가이드 검색 결과:', searchResult.guides.length, '개');

    // 2. 상위 5개 가이드 병합
    const combined = await guides.combineGuides({
      ids: searchResult.guides.slice(0, 5).map(g => g.id),
      context: {
        project: 'myapp',
        apiType: 'grpc',
        task: 'add-interceptor'
      }
    });

    return {
      guidesCount: searchResult.guides.length,
      usedGuides: combined.usedGuides.map(g => ({
        id: g.id,
        title: g.title,
        priority: g.priority
      })),
      guidelines: combined.combined
    };
  `
});
```

2. **Phase 2: 참고 파일 로드**
```typescript
await mcp.callTool('execute', {
  code: `
    // BestCase에서 interceptor 패턴 파일 로드
    const bestCase = await bestcase.load({
      projectName: 'excellent-project',
      category: 'auto-scan-metadata'
    });

    const referenceFile = bestCase.bestCases[0].files
      .find(f =>
        f.metadata?.patterns?.includes('interceptor') &&
        f.score >= 90
      );

    return {
      referenceFile: {
        path: referenceFile.path,
        content: referenceFile.content,
        score: referenceFile.score,
        metadata: referenceFile.metadata
      }
    };
  `
});
```

3. **Phase 3: 코드 생성 및 적용**

클라이언트가 가이드 + 참고 파일을 바탕으로 코드 생성:
```typescript
// 생성된 코드 (클라이언트의 코드 생성 능력 활용)
export const useGrpcClient = () => {
  const config = useRuntimeConfig();

  // ✅ Interceptor 추가 (BestCase 참고)
  const transport = createConnectTransport({
    baseUrl: config.public.grpcUrl,
    interceptors: [
      // 에러 처리 interceptor
      (next) => async (req) => {
        try {
          const result = await next(req);
          return result;
        } catch (error) {
          if (error.code === 'UNAUTHENTICATED') {
            await navigateTo('/login');
          }
          throw error;
        }
      },
      // 로깅 interceptor
      (next) => async (req) => {
        console.log('gRPC Request:', req.method);
        const result = await next(req);
        console.log('gRPC Response:', result);
        return result;
      }
    ]
  });

  return { transport };
};
```

4. **Phase 4: 파일 쓰기**
```typescript
await mcp.callTool('execute', {
  code: `
    await filesystem.writeFile({
      path: '/projects/myapp/composables/useGrpcClient.ts',
      content: \`${generatedCode}\`
    });

    return {
      success: true,
      filesModified: ['composables/useGrpcClient.ts']
    };
  `
});
```

---

## 데이터 흐름

### 토큰 소비 비교

**전통적인 MCP (150,000 토큰)**:
```
tools/list → 1,500 토큰
  - execute: 200 토큰
  - list_bestcases: 150 토큰
  - load_bestcase: 150 토큰
  - search_guides: 200 토큰
  - load_guide: 150 토큰
  - combine_guides: 200 토큰
  - execute_workflow: 250 토큰
  - analyze_metadata: 200 토큰

각 도구 호출마다 결과 전체를 LLM 컨텍스트로 전송
  - BestCase 전체: 50,000 토큰
  - 가이드 11개 전체: 100,000 토큰

총: ~151,500 토큰
```

**Anthropic Code Mode (3,000 토큰)**:
```
tools/list → 200 토큰
  - execute: 200 토큰

execute 호출 1회
  - TypeScript 코드: 800 토큰
  - 최종 결과만 반환: 2,000 토큰
    (중간 데이터는 Sandbox 내부에서 처리)

총: ~3,000 토큰

절감률: 98%
```

### 데이터 격리

```
┌────────────────────────────────────────────────────┐
│  클라이언트 컨텍스트 (LLM Token 소비)               │
├────────────────────────────────────────────────────┤
│  - 사용자 요청: 100 토큰                            │
│  - TypeScript 코드: 800 토큰                        │
│  - 최종 결과: 2,000 토큰                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  합계: 2,900 토큰 ✅                                │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Sandbox 내부 (LLM Token 미소비)                    │
├────────────────────────────────────────────────────┤
│  - 파일 읽기: 500KB                                 │
│  - BestCase 로드: 1MB                               │
│  - 메타데이터 추출: Ollama 호출 (20회)             │
│  - 가이드 병합: 100KB                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  LLM 컨텍스트 미포함 ✅                             │
│  (Sandbox에서 처리, 최종 결과만 반환)              │
└────────────────────────────────────────────────────┘
```

---

## 에러 처리

### 1. Sandbox 실행 에러

**에러 발생**:
```typescript
// 잘못된 코드
await filesystem.readFile('invalid-path');  // ❌ 객체 필요
```

**응답**:
```json
{
  "ok": false,
  "logs": [],
  "error": "The \"path\" argument must be of type string or an instance of Buffer or URL. Received undefined"
}
```

**클라이언트 처리**:
```
❌ 코드 실행 중 오류가 발생했습니다:
The "path" argument must be of type string...

📖 Tip: filesystem.readFile은 객체 파라미터를 사용합니다.
올바른 사용법:
  await filesystem.readFile({ path: '/projects/...' })
```

### 2. Ollama LLM 에러

**에러 발생**:
```typescript
const analyzer = metadata.createAnalyzer({
  ollamaUrl: 'http://ollama:11434',
  model: 'qwen2.5-coder:7b'
});

await analyzer.analyzeProject(...);
// → Ollama 서버 연결 실패
```

**응답**:
```json
{
  "ok": false,
  "logs": [
    "MetadataAnalyzer 생성 완료",
    "파일 분석 시작..."
  ],
  "error": "Failed to connect to Ollama server at http://ollama:11434"
}
```

**클라이언트 처리**:
```
❌ Ollama LLM 서버에 연결할 수 없습니다.

해결 방법:
1. Docker 컨테이너 확인:
   docker ps | grep ollama

2. Ollama 서버 시작:
   docker-compose up -d ollama

3. 헬스체크:
   curl http://localhost:11434/api/tags
```

### 3. Timeout 에러

**에러 발생**:
```typescript
// 매우 오래 걸리는 작업
await mcp.callTool('execute', {
  code: `
    // 1000개 파일 분석 (30초 초과)
    const files = await filesystem.searchFiles({...});
    const projectMeta = await analyzer.analyzeProject(
      path,
      files.files,  // ❌ 너무 많음
      1
    );
  `,
  timeoutMs: 30000  // 30초 제한
});
```

**응답**:
```json
{
  "ok": false,
  "logs": [
    "파일 검색 완료: 1000 개",
    "메타데이터 추출 시작..."
  ],
  "error": "Script execution timed out after 30000ms"
}
```

**클라이언트 처리**:
```
⏱️ 실행 시간 초과 (30초)

개선 방법:
1. 파일 수 제한:
   files.files.slice(0, 20)  // 상위 20개만

2. Timeout 증가:
   timeoutMs: 60000  // 60초

3. Concurrency 조정:
   await analyzer.analyzeProject(..., 3)  // 병렬 처리
```

---

## 요약

### ✅ 핵심 포인트

1. **단일 execute 도구**: 모든 작업을 TypeScript 코드로 처리
2. **Sandbox 격리**: 중간 데이터는 Sandbox 내부에서 처리, 최종 결과만 반환
3. **98% 토큰 절감**: 3,000 토큰 vs 151,500 토큰
4. **클라이언트 주도**: 로직은 클라이언트가 TypeScript 코드로 작성
5. **MCP 서버는 최소화**: execute 도구 제공 + Sandbox API 노출만 담당

### 🔄 전체 흐름 요약

```
사용자 요청
  → 클라이언트가 TypeScript 코드 작성
  → MCP execute 도구 호출
  → Sandbox에서 코드 실행
    → filesystem API로 파일 읽기
    → metadata API로 메타데이터 추출 (Ollama LLM 호출)
    → bestcase API로 BestCase 로드/비교
    → guides API로 가이드 검색/병합
  → 최종 결과만 클라이언트로 반환
  → 클라이언트가 사용자 친화적 형식으로 변환
  → 사용자에게 표시
```

---

**작성 완료**: 클라이언트 작업 요청 흐름도 상세 문서

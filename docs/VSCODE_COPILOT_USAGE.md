# VSCode Copilot (Claude) 사용 가이드

> 🚨 **필수: mandatory-api-detection 가이드 사용**
>
> **모든 코드 생성 작업 전에** 다음 가이드를 **반드시** 로드하세요:
>
> ```typescript
> const guidelines = await guides.combine({
>   ids: [...],
>   mandatoryIds: ['mandatory-api-detection'],  // ✅ 필수!
>   context: { ... }
> });
> ```
>
> 또는 검색 시:
> ```typescript
> const searchResult = await guides.search({
>   keywords: [...],
>   mandatoryIds: ['mandatory-api-detection'],  // ✅ 필수!
>   apiType: 'grpc'
> });
> ```
>
> **이 가이드가 하는 일**:
> 1. ✅ **API 클라이언트 자동 감지** (gRPC, OpenAPI, REST)
> 2. ✅ **타입 정의 추출** (기존 Request/Response 사용)
> 3. ✅ **하드코딩 방지** (샘플 데이터 대신 실제 API 강제)
> 4. ✅ **자동 검증** (API 미사용 시 에러)
>
> **절대 하지 말 것**:
> - ❌ mandatory-api-detection 가이드 생략
> - ❌ 프로젝트 분석 없이 코드 생성
> - ❌ 타입을 임의로 새로 정의 (`interface Member { ... }`)
> - ❌ API를 추측으로 작성 (`const data = ref([...])`)
>
> 자세한 내용: [🔌 프로젝트 API 및 타입 자동 감지](#-프로젝트-api-및-타입-자동-감지-중요)

---

## 🎯 이 시스템을 사용하는 이유

이 시스템은 **메타데이터 기반 자동 작업 분류 및 코드 생성**을 제공합니다:

```
사용자 요청
  → 대상 프로젝트 메타데이터 추출
  → 서버 BestCase 메타데이터와 비교
  → 작업 분류 (누락된 패턴 파악)
  → 필요한 가이드라인 로드
  → 고품질 참고 파일 선택 (점수 기반)
  → 코드 생성
```

**효과**:
- 🎯 **자동 작업 분류**: 메타데이터 비교로 누락된 패턴 자동 파악
- 📚 **동적 가이드 로딩**: 필요한 가이드만 선택 (94% 토큰 절감)
- 💎 **고품질 참고**: 점수 기반 참고 파일 자동 선택
- ⚡ **토큰 90% 절감**: MCP 도구 최소화 + 선택적 로딩

---

## 🚀 빠른 시작

### 1. MCP 서버 실행

```bash
# Docker로 실행 (권장)
docker-compose up -d

# 또는 로컬 실행
yarn build:all
npx tsx mcp-stdio-server.ts
```

### 2. VSCode Copilot 연결

**VSCode 설정** (`.vscode/settings.json`):

```json
{
  "mcp.servers": {
    "mcp-code-mode": {
      "type": "stdio",
      "command": "docker",
      "args": ["exec", "-i", "mcp-code-mode-server", "node", "/app/mcp-stdio-server.js"]
    }
  }
}
```

**또는 Cline MCP 설정** (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "mcp-code-mode": {
      "type": "stdio",
      "command": "docker",
      "args": ["exec", "-i", "mcp-code-mode-server", "node", "/app/mcp-stdio-server.js"]
    }
  }
}
```

### 3. 연결 확인

VSCode Copilot 채팅에서:

```
MCP 서버 연결 확인해줘
```

응답 예시:
```
✅ mcp-code-mode 서버가 연결되었습니다.
사용 가능한 도구: execute
```

---

## 💡 기본 사용법

### execute 도구 사용

VSCode Copilot은 단 하나의 `execute` 도구만 사용합니다.
TypeScript 코드를 작성하면 Sandbox에서 실행됩니다.

**사용자 요청**:
```
현재 프로젝트의 파일 목록을 보여줘
```

**Copilot 내부 동작**:
```typescript
await mcp.callTool('execute', {
  code: `
    const result = await filesystem.searchFiles({
      path: '/workspace/myapp',
      recursive: true,
      pattern: '*.ts'
    });

    return {
      totalFiles: result.files.length,
      files: result.files.slice(0, 10).map(f => f.path)
    };
  `
});
```

**결과**:
```
📁 총 45개의 TypeScript 파일이 있습니다.
상위 10개:
- src/App.tsx
- src/components/Header.tsx
- ...
```

---

## 📋 Sandbox API Reference

### filesystem API

#### readFile

**파일 내용 읽기**:

```typescript
// ❌ 잘못된 사용법
const content = await filesystem.readFile('path/to/file.ts');  // 에러 발생!

// ✅ 올바른 사용법
const result = await filesystem.readFile({
  path: '/projects/myapp/src/App.tsx'
});

console.log('Content:', result.content);
console.log('Size:', result.size);
```

**Docker 환경에서 경로 주의**:
```typescript
// ❌ Windows 경로 (Docker에서 작동 안 함)
const result = await filesystem.readFile({
  path: 'D:/01.Work/01.Projects/myapp/src/App.tsx'
});

// ✅ Docker 마운트 경로 (docker-compose.yml volumes 참고)
const result = await filesystem.readFile({
  path: '/projects/myapp/src/App.tsx'
});
```

#### searchFiles

**파일 검색**:

```typescript
// ✅ 올바른 사용법
const result = await filesystem.searchFiles({
  path: '/projects/myapp',
  pattern: '**/*.{ts,tsx,vue}',
  recursive: true
});

console.log('Total files:', result.files.length);
result.files.forEach(file => {
  console.log('Path:', file.path);
  console.log('Name:', file.name);
});
```

#### writeFile

**파일 쓰기**:

```typescript
// ✅ 올바른 사용법
await filesystem.writeFile({
  path: '/projects/myapp/src/generated.ts',
  content: 'export const data = [];'
});
```

### bestcase API

**BestCase 검색**:

```typescript
const result = await bestcase.listBestCases({
  category: 'member-management',
  projectName: 'my-project'
});

result.bestcases.forEach(bc => {
  console.log('Category:', bc.category);
  console.log('Score:', bc.patterns.scores.overall);
  console.log('Files:', bc.files.length);
});
```

### guides API

**가이드 검색**:

```typescript
const result = await guides.searchGuides({
  keywords: ['api', 'grpc'],
  scope: 'project',
  apiType: 'grpc'
});

// mandatoryReminders 자동 포함됨
if (result.mandatoryReminders) {
  console.log('⚠️ 필수 가이드:');
  result.mandatoryReminders.forEach(msg => console.log(msg));
}

console.log('Guides:', result.guides.length);
```

**가이드 병합**:

```typescript
const result = await guides.combineGuides({
  ids: ['grpc.api.integration', 'error.handling'],
  context: {
    project: 'myapp',
    apiType: 'grpc'
  }
});

console.log('Combined content:', result.combined);
console.log('Used guides:', result.usedGuides);

// mandatoryReminders 자동 포함됨
if (result.mandatoryReminders) {
  result.mandatoryReminders.forEach(msg => console.log(msg));
}
```

### metadata API

**MetadataAnalyzer 생성**:

```typescript
const analyzer = metadata.createAnalyzer({
  ollamaUrl: 'http://ollama:11434',
  model: 'qwen2.5-coder:7b'
});

// 프로젝트 분석
const projectMeta = await analyzer.analyzeProject(
  '/projects/myapp',
  filesWithContent,
  3  // concurrency
);

console.log('Features:', projectMeta.features);
console.log('APIs:', projectMeta.apis);
console.log('Patterns:', projectMeta.patterns);
```

### console API

**로그 출력**:

```typescript
// Sandbox 내부에서만 사용 가능
console.log('일반 로그');
console.error('에러 로그');

// 로그는 execute 도구 응답의 logs 배열에 포함됨
```

**주의**: `console.log`의 출력은 execute 응답의 `logs` 배열에 포함되며, Claude가 이를 확인합니다.

---

## 🔍 메타데이터 추출

### 자동 메타데이터 추출

**사용자 요청**:
```
현재 프로젝트를 분석해줘
```

**Copilot 실행 코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. MetadataAnalyzer 생성
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    // 2. 프로젝트 파일 스캔
    const files = await filesystem.searchFiles({
      path: '/workspace/myapp',
      pattern: '**/*.{ts,tsx,vue}'
    });

    // 3. 메타데이터 추출
    const filesWithContent = [];
    for (const file of files.files.slice(0, 20)) {
      const content = await filesystem.readFile({ path: file.path });
      filesWithContent.push({
        path: file.path,
        content: content.content
      });
    }

    const projectMeta = await analyzer.analyzeProject(
      '/workspace/myapp',
      filesWithContent,
      3  // concurrency
    );

    return {
      patterns: projectMeta.patterns,
      frameworks: projectMeta.frameworks,
      apiType: projectMeta.apiType,
      complexity: projectMeta.averageComplexity,
      excellentFiles: projectMeta.excellentFiles.length
    };
  `
});
```

**결과**:
```json
{
  "patterns": ["state-management", "api-call", "error-handling"],
  "frameworks": ["nuxt", "vue", "pinia"],
  "apiType": "grpc",
  "complexity": "medium",
  "excellentFiles": 5
}
```

---

## 📊 BestCase 비교 및 작업 분류

### 메타데이터 비교 → TODO 생성

**사용자 요청**:
```
현재 프로젝트를 BestCase와 비교해서 개선점을 알려줘
```

**Copilot 실행 코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. 현재 프로젝트 메타데이터 추출
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    const files = await filesystem.searchFiles({
      path: '/workspace/myapp',
      pattern: '**/*.{ts,vue}'
    });

    const filesWithContent = [];
    for (const file of files.files.slice(0, 20)) {
      const content = await filesystem.readFile({ path: file.path });
      filesWithContent.push({ path: file.path, content: content.content });
    }

    const projectMeta = await analyzer.analyzeProject('/workspace/myapp', filesWithContent, 3);

    // 2. 유사한 BestCase 찾기
    const allCases = await bestcase.list();
    const similarCase = allCases.bestcases.find(bc => {
      const bcMeta = bc.patterns?.metadata;
      if (!bcMeta) return false;

      // API 타입 일치 + 프레임워크 겹침
      return bcMeta.apiType === projectMeta.apiType &&
             bcMeta.frameworks.some(f => projectMeta.frameworks.includes(f));
    });

    if (!similarCase) {
      return { found: false, message: '유사한 BestCase가 없습니다.' };
    }

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
      // 고품질 참고 파일 선택 (점수 70점 이상)
      const referenceFiles = bestCase.bestCases[0].files
        .filter(f => f.metadata?.patterns?.includes('interceptor'))
        .filter(f => f.score >= 70)  // A tier 이상
        .sort((a, b) => b.score - a.score);

      todos.push({
        id: 'add-interceptor-pattern',
        reason: 'BestCase에 우수 interceptor 패턴 존재',
        referenceFile: referenceFiles[0]?.path,
        score: referenceFiles[0]?.score,
        priority: 'high'
      });
    }

    // 에러 처리 품질 비교
    const projectErrorHandling = projectMeta.filesWithGoodErrorHandling / projectMeta.totalFiles;
    const bestCaseErrorHandling = bestCaseMeta.filesWithGoodErrorHandling / bestCaseMeta.totalFiles;

    if (projectErrorHandling < bestCaseErrorHandling * 0.8) {
      const referenceFiles = bestCase.bestCases[0].files
        .filter(f => f.metadata?.errorHandling === 'comprehensive')
        .filter(f => f.score >= 70)
        .slice(0, 3);  // 상위 3개

      todos.push({
        id: 'improve-error-handling',
        reason: \`에러 처리 품질 낮음 (\${(projectErrorHandling * 100).toFixed(0)}% vs \${(bestCaseErrorHandling * 100).toFixed(0)}%)\`,
        referenceFiles: referenceFiles.map(f => ({ path: f.path, score: f.score })),
        priority: 'high'
      });
    }

    return {
      found: true,
      bestCase: bestCase.bestCases[0].projectName,
      todos,
      comparison: {
        missingPatterns,
        errorHandlingGap: ((bestCaseErrorHandling - projectErrorHandling) * 100).toFixed(0) + '%'
      }
    };
  `
});
```

**결과**:
```json
{
  "found": true,
  "bestCase": "excellent-project",
  "todos": [
    {
      "id": "add-interceptor-pattern",
      "reason": "BestCase에 우수 interceptor 패턴 존재",
      "referenceFile": "composables/useGrpcClient.ts",
      "score": 92,
      "priority": "high"
    },
    {
      "id": "improve-error-handling",
      "reason": "에러 처리 품질 낮음 (71% vs 90%)",
      "referenceFiles": [
        { "path": "composables/useGrpcClient.ts", "score": 92 },
        { "path": "composables/useApiClient.ts", "score": 85 }
      ],
      "priority": "high"
    }
  ],
  "comparison": {
    "missingPatterns": ["interceptor", "error-recovery"],
    "errorHandlingGap": "19%"
  }
}
```

**Copilot 응답**:
```
현재 프로젝트를 분석하고 BestCase와 비교했습니다.

📋 개선이 필요한 항목 (2개):

1. ⚠️ interceptor 패턴 추가 (우선순위: 높음)
   - 이유: BestCase에 우수한 interceptor 패턴이 있습니다
   - 참고 파일: composables/useGrpcClient.ts (92점/100점)

2. ⚠️ 에러 처리 개선 (우선순위: 높음)
   - 이유: 에러 처리 품질이 낮습니다 (71% vs 90%)
   - 참고 파일:
     - composables/useGrpcClient.ts (92점)
     - composables/useApiClient.ts (85점)

📊 비교 결과:
- 누락된 패턴: interceptor, error-recovery
- 에러 처리 품질 차이: 19%

어떤 항목부터 개선하시겠습니까?
```

---

## 📚 가이드 로드

### 메타데이터 기반 가이드 검색

**사용자 요청**:
```
interceptor 패턴을 추가하는 방법을 알려줘
```

**Copilot 실행 코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. 가이드 검색
    const searchResult = await guides.search({
      keywords: ['interceptor', 'grpc', 'error-handling'],
      apiType: 'grpc',
      mandatoryIds: [
        'grpc.api.connection',
        'error.handling'
      ]
    });

    // 2. 상위 5개 가이드 병합
    const combined = await guides.combine({
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
      content: combined.combined.substring(0, 500) + '...'
    };
  `
});
```

**결과**:
```json
{
  "guidesCount": 8,
  "usedGuides": [
    { "id": "grpc.api.connection", "title": "gRPC API 연결", "priority": 1000 },
    { "id": "error.handling", "title": "에러 처리", "priority": 1000 },
    { "id": "grpc.interceptor", "title": "gRPC Interceptor", "priority": 90 },
    { "id": "api.client.pattern", "title": "API 클라이언트 패턴", "priority": 85 },
    { "id": "error.recovery", "title": "에러 복구", "priority": 80 }
  ],
  "content": "# gRPC API 연결\n\n## 기본 구조\n\n```typescript\nexport const useGrpcClient = () => {\n  const config = useRuntimeConfig();\n  ..."
}
```

---

## 🎨 코드 생성

### 가이드 + 참고 파일 → 코드 생성

**사용자 요청**:
```
interceptor 패턴을 추가해줘
```

**Copilot 실행 코드**:
```typescript
await mcp.callTool('execute', {
  code: `
    // 1. 가이드 로드
    const guidelines = await guides.combine({
      ids: ['grpc.api.connection', 'grpc.interceptor', 'error.handling'],
      context: { task: 'add-interceptor' }
    });

    // 2. 참고 파일 로드 (BestCase에서)
    const bestCase = await bestcase.load({
      projectName: 'excellent-project',
      category: 'auto-scan-metadata'
    });

    const referenceFile = bestCase.bestCases[0].files.find(f =>
      f.metadata?.patterns?.includes('interceptor') && f.score >= 90
    );

    // 3. 현재 파일 읽기
    const currentFile = await filesystem.readFile({
      path: '/workspace/myapp/composables/useGrpcClient.ts'
    });

    return {
      guidelines: guidelines.combined.substring(0, 500),
      referenceFile: {
        path: referenceFile.path,
        content: referenceFile.content.substring(0, 500),
        score: referenceFile.score
      },
      currentFile: currentFile.content.substring(0, 500)
    };
  `
});
```

이후 Copilot은 가이드와 참고 파일을 바탕으로 새로운 코드를 생성합니다.

**생성된 코드**:
```typescript
// composables/useGrpcClient.ts

import { createChannel, createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

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
          // ConnectError 처리
          if (error.code === 'UNAUTHENTICATED') {
            // 인증 실패 처리
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

---

## 🔌 프로젝트 API 및 타입 자동 감지 (중요!)

### ⚠️ 코드 생성 전 필수 단계

**잘못된 방법** ❌:
```typescript
// Claude가 임의로 타입과 API 정의
interface Member {
  id: string;
  email: string;
  // ...
}

async function fetchMembers() {
  // 추측으로 작성한 API 호출
  const response = await fetch('/api/members');
  return response.json();
}
```

**올바른 방법** ✅:
```
1. 프로젝트 분석 → gRPC/OpenAPI 클라이언트 감지
2. 실제 타입 정의 추출 → Request/Response 구조 파악
3. BestCase 참고 파일 로드 → 우수 사례 확인
4. 실제 API와 타입을 사용하여 코드 생성
```

---

### Step 0: mandatory-api-detection 가이드 로드 (필수!)

**사용자 요청**:
```
memberManagement.vue 페이지를 완성해줘
```

**Copilot이 제일 먼저 해야 할 일**:
```typescript
// ✅ 필수: mandatory-api-detection 가이드 로드
await mcp.callTool('execute', {
  code: `
    const guidelines = await guides.combine({
      ids: [],
      mandatoryIds: ['mandatory-api-detection'],  // 필수 가이드
      context: {
        task: 'page-completion',
        entity: 'member'
      }
    });

    // 가이드가 제공하는 API 감지 및 검증 로직 실행
    return guidelines.combined;
  `
});
```

이 가이드는 다음을 **자동으로 강제**합니다:
- ✅ API 클라이언트 감지
- ✅ 타입 정의 추출
- ✅ 하드코딩 방지
- ✅ 검증 자동 실행

---

### Step 1: 프로젝트 API 클라이언트 자동 감지

**가이드 로드 후**, 실제 API 감지를 수행합니다:

```typescript
await mcp.callTool('execute', {
  code: `
    // 1. package.json에서 API 패키지 확인
    const packageJson = await filesystem.readFile({
      path: '/workspace/myapp/package.json'
    });

    const pkg = JSON.parse(packageJson.content);
    const hasGrpc = pkg.dependencies['@grpc/grpc-js'] ||
                    pkg.dependencies['@connectrpc/connect'];
    const hasOpenApi = pkg.dependencies['openapi-typescript'] ||
                       pkg.dependencies['swagger-client'];

    // 2. composables 디렉토리에서 API 클라이언트 검색
    const composables = await filesystem.searchFiles({
      path: '/workspace/myapp/composables',
      pattern: '**/use*Client.{ts,js}'
    });

    // 3. member 관련 API 검색
    const memberApis = await filesystem.searchFiles({
      path: '/workspace/myapp',
      pattern: '**/*member*.{ts,proto,yaml}'
    });

    return {
      apiType: hasGrpc ? 'grpc' : hasOpenApi ? 'openapi' : 'rest',
      clientFiles: composables.files.map(f => f.path),
      memberApiFiles: memberApis.files.map(f => f.path)
    };
  `
});
```

**결과**:
```json
{
  "apiType": "grpc",
  "clientFiles": [
    "composables/useGrpcClient.ts",
    "composables/useAuthClient.ts"
  ],
  "memberApiFiles": [
    "proto/member.proto",
    "types/member.types.ts"
  ]
}
```

---

### Step 2: 타입 정의 추출 (원본 유지!)

**중요**: 프로젝트에 이미 정의된 타입을 **절대 수정하지 말고 그대로 사용**해야 합니다.

```typescript
await mcp.callTool('execute', {
  code: `
    // 1. Member 타입 파일 읽기
    const memberTypes = await filesystem.readFile({
      path: '/workspace/myapp/types/member.types.ts'
    });

    // 2. gRPC proto 파일 읽기 (있는 경우)
    const memberProto = await filesystem.readFile({
      path: '/workspace/myapp/proto/member.proto'
    });

    // 3. API 클라이언트 파일 읽기
    const grpcClient = await filesystem.readFile({
      path: '/workspace/myapp/composables/useGrpcClient.ts'
    });

    return {
      types: memberTypes.content,
      proto: memberProto.content,
      client: grpcClient.content.substring(0, 1000)
    };
  `
});
```

**결과 (실제 타입 정의)**:
```typescript
// types/member.types.ts (실제 프로젝트 타입)
export interface MemberListRequest {
  page: number;
  pageSize: number;
  searchType?: 'email' | 'nickname' | 'phone' | 'country';
  searchKeyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface MemberListResponse {
  members: Member[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface Member {
  memberId: string;
  email: string;
  nickname: string;
  phone: string;
  country: string;
  registeredAt: string;
  status: 'active' | 'inactive' | 'banned';
  orderCount: number;
}
```

**API 클라이언트 (실제 프로젝트 메서드)**:
```typescript
// composables/useGrpcClient.ts
export const useGrpcClient = () => {
  const client = createClient(MemberService, transport);

  return {
    // 실제 존재하는 메서드
    getMemberList: (req: MemberListRequest) => client.getMemberList(req),
    getMemberDetail: (memberId: string) => client.getMemberDetail({ memberId }),
    updateMemberStatus: (req: UpdateMemberStatusRequest) => client.updateMemberStatus(req),
    // ...
  };
};
```

---

### Step 3: BestCase 참고 파일 로드

```typescript
await mcp.callTool('execute', {
  code: `
    // 1. 현재 프로젝트 메타데이터 추출
    const analyzer = metadata.createAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
    });

    const projectMeta = await analyzer.analyzeProject('/workspace/myapp', files, 3);

    // 2. BestCase 로드
    const bestCase = await bestcase.load({
      projectName: 'myapp',
      category: 'auto-scan-metadata'
    });

    // 3. member 관련 우수 참고 파일 검색 (70점 이상)
    const referenceFiles = bestCase.bestCases[0].files
      .filter(f => f.path.toLowerCase().includes('member'))
      .filter(f => f.score >= 70)
      .sort((a, b) => b.score - a.score);

    return {
      apiType: projectMeta.apiType,
      referenceFiles: referenceFiles.slice(0, 3).map(f => ({
        path: f.path,
        score: f.score,
        patterns: f.metadata?.patterns
      }))
    };
  `
});
```

**결과**:
```json
{
  "apiType": "grpc",
  "referenceFiles": [
    {
      "path": "pages/admin/userManagement.vue",
      "score": 88,
      "patterns": ["grpc-api-call", "pagination", "search-filter"]
    },
    {
      "path": "composables/useGrpcClient.ts",
      "score": 92,
      "patterns": ["interceptor", "error-handling"]
    }
  ]
}
```

---

### Step 4: 실제 API와 타입을 사용한 코드 생성

이제 Claude는 다음 정보를 모두 가지고 있습니다:
1. ✅ 프로젝트의 실제 타입 정의 (`MemberListRequest`, `MemberListResponse`, `Member`)
2. ✅ 실제 API 클라이언트 메서드 (`useGrpcClient().getMemberList()`)
3. ✅ BestCase 참고 파일 (88점, 92점 우수 사례)
4. ✅ 프로젝트 메타데이터 (apiType: grpc, frameworks: nuxt3, vue)

**생성된 코드 (실제 타입 사용)**:
```vue
<script setup lang="ts">
// ✅ 실제 프로젝트 타입 import
import type {
  MemberListRequest,
  MemberListResponse,
  Member
} from '~/types/member.types';

// ✅ 실제 API 클라이언트 사용
const { getMemberList } = useGrpcClient();

// ✅ 실제 Request 구조체 사용 (원본 유지)
const filters = reactive<MemberListRequest>({
  page: 1,
  pageSize: 20,
  searchType: 'email',
  searchKeyword: '',
  startDate: '',
  endDate: ''
});

// ✅ 실제 Response 구조체 사용 (원본 유지)
const { data: memberData, pending: isLoading } = await useAsyncData<MemberListResponse>(
  'member-list',
  () => getMemberList(filters)  // ✅ 실제 gRPC 메서드 호출
);

const members = computed(() => memberData.value?.members || []);
const totalCount = computed(() => memberData.value?.totalCount || 0);
</script>
```

**핵심 포인트**:
- ❌ `interface Member { ... }` 새로 정의하지 않음
- ✅ `import type { Member } from '~/types/member.types'` 기존 타입 사용
- ❌ `async function fetchMembers() { ... }` 추측으로 작성하지 않음
- ✅ `getMemberList(filters)` 실제 gRPC 메서드 사용

---

## 🔥 실전 예시

### 예시 1: "gRPC 클라이언트를 개선해줘"

**전체 흐름**:

1. **메타데이터 추출**
   ```typescript
   const projectMeta = await metadata.analyzeProject(...);
   // → patterns: ["api-call"]
   // → apiType: "grpc"
   // → complexity: "medium"
   ```

2. **BestCase 비교**
   ```typescript
   const todos = compareWithBestCase(projectMeta, bestCaseMeta);
   // → 누락: "interceptor", "error-recovery"
   ```

3. **가이드 로드**
   ```typescript
   const guides = await guides.search({
     keywords: ['grpc', 'interceptor', 'error-recovery']
   });
   // → 5개 가이드 발견
   ```

4. **참고 파일 선택**
   ```typescript
   const referenceFiles = bestCase.files
     .filter(f => f.metadata.patterns.includes('interceptor'))
     .filter(f => f.score >= 70)
     .sort((a, b) => b.score - a.score);
   // → useGrpcClient.ts (92점)
   ```

5. **코드 생성**
   - 가이드 + 참고 파일 → interceptor 패턴 추가

---

### 예시 2: "에러 처리를 개선해줘"

**Copilot 대화**:

```
👤 에러 처리를 개선해줘

🤖 현재 프로젝트를 분석하겠습니다...

   📊 분석 결과:
   - 에러 처리 품질: 71% (낮음)
   - BestCase 평균: 90%
   - 개선 필요: 12개 파일

   📚 참고 파일 발견 (3개):
   1. useGrpcClient.ts (92점) - comprehensive error handling
   2. useApiClient.ts (85점) - comprehensive error handling
   3. useFetch.ts (78점) - comprehensive error handling

   어떤 파일부터 개선하시겠습니까?

👤 useGrpcClient.ts부터 해줘

🤖 useGrpcClient.ts에 에러 처리를 추가하겠습니다.

   참고 파일 (92점)의 패턴을 적용합니다:
   - ConnectError 타입별 처리
   - 재시도 로직
   - 사용자 친화적 에러 메시지

   [코드 생성...]
```

---

### 예시 3: "memberManagement.vue 페이지를 완성해줘"

**전체 워크플로우 (올바른 방법)**:

```
👤 memberManagement.vue 페이지를 완성해줘

🤖 페이지를 완성하기 전에 프로젝트를 먼저 분석하겠습니다.

   📋 Step 1: API 클라이언트 감지
   ├─ package.json 확인 → gRPC 패키지 발견
   ├─ composables 검색 → useGrpcClient.ts 발견
   └─ member 관련 파일 검색 → types/member.types.ts 발견

   📋 Step 2: 타입 정의 추출
   ├─ MemberListRequest 발견
   ├─ MemberListResponse 발견
   ├─ Member 인터페이스 발견
   └─ API 메서드: getMemberList(req) 발견

   📋 Step 3: BestCase 참고 파일 로드
   ├─ pages/admin/userManagement.vue (88점) - 유사 패턴
   └─ composables/useGrpcClient.ts (92점) - API 패턴

   ✅ 이제 실제 타입과 API를 사용하여 코드를 생성하겠습니다.
```

**생성된 코드 (실제 프로젝트 타입 및 API 사용)**:

```vue
<script setup lang="ts">
// ✅ 1. 실제 프로젝트 타입 import (원본 유지)
import type {
  MemberListRequest,
  MemberListResponse,
  Member
} from '~/types/member.types';

// ✅ 2. 실제 gRPC 클라이언트 사용
const { getMemberList, updateMemberStatus } = useGrpcClient();

// ✅ 3. 실제 Request 구조체 사용 (필드 원본 유지)
const filters = reactive<MemberListRequest>({
  page: 1,
  pageSize: 20,
  searchType: 'email',      // ✅ 실제 타입에 정의된 값
  searchKeyword: '',
  startDate: '',
  endDate: ''
});

// ✅ 4. 로딩 상태
const isLoading = ref(false);
const error = ref<string | null>(null);

// ✅ 5. 실제 gRPC API 호출
const fetchMembers = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // ✅ 실제 getMemberList 메서드 호출
    const response = await getMemberList(filters);

    // ✅ 실제 Response 구조체 사용
    members.value = response.members;
    totalCount.value = response.totalCount;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다';
  } finally {
    isLoading.value = false;
  }
};

// ✅ 6. 실제 Member 타입 사용
const members = ref<Member[]>([]);
const totalCount = ref(0);

// 초기 로드
onMounted(() => {
  fetchMembers();
});

// 검색 처리
const handleSearch = () => {
  filters.page = 1;
  fetchMembers();
};

// 페이지 변경
const handlePageChange = (newPage: number) => {
  filters.page = newPage;
  fetchMembers();
};
</script>

<template>
  <div class="member-management">
    <!-- 검색 필터 -->
    <div class="filters">
      <select v-model="filters.searchType">
        <!-- ✅ 실제 타입에 정의된 값만 사용 -->
        <option value="email">이메일</option>
        <option value="nickname">닉네임</option>
        <option value="phone">전화번호</option>
        <option value="country">국적</option>
      </select>

      <input
        v-model="filters.searchKeyword"
        type="text"
        placeholder="검색어 입력"
        @keyup.enter="handleSearch"
      />

      <button @click="handleSearch">검색</button>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="loading">
      데이터를 불러오는 중...
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="error">
      {{ error }}
      <button @click="fetchMembers">재시도</button>
    </div>

    <!-- 테이블 -->
    <table v-else>
      <thead>
        <tr>
          <th>회원 ID</th>
          <th>이메일</th>
          <th>닉네임</th>
          <th>전화번호</th>
          <th>국적</th>
          <th>가입일</th>
          <th>상태</th>
          <th>주문수</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="member in members" :key="member.memberId">
          <!-- ✅ 실제 Member 타입의 필드 사용 -->
          <td>{{ member.memberId }}</td>
          <td>{{ member.email }}</td>
          <td>{{ member.nickname }}</td>
          <td>{{ member.phone }}</td>
          <td>{{ member.country }}</td>
          <td>{{ member.registeredAt }}</td>
          <td>{{ member.status }}</td>
          <td>{{ member.orderCount }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 페이지네이션 -->
    <div class="pagination">
      <button
        :disabled="filters.page === 1"
        @click="handlePageChange(filters.page - 1)"
      >
        이전
      </button>

      <span>{{ filters.page }} / {{ Math.ceil(totalCount / filters.pageSize) }}</span>

      <button
        :disabled="filters.page >= Math.ceil(totalCount / filters.pageSize)"
        @click="handlePageChange(filters.page + 1)"
      >
        다음
      </button>
    </div>
  </div>
</template>
```

**핵심 차이점 비교**:

| 항목 | ❌ 잘못된 방법 | ✅ 올바른 방법 |
|------|--------------|--------------|
| **타입 정의** | `interface Member { ... }` 새로 작성 | `import type { Member } from '~/types/member.types'` |
| **API 호출** | `fetch('/api/members')` 추측 | `getMemberList(filters)` 실제 메서드 |
| **Request 구조** | `{ page, limit, query }` 추측 | `MemberListRequest` 실제 구조체 |
| **Response 구조** | `{ data, total }` 추측 | `MemberListResponse` 실제 구조체 |
| **필드 이름** | `id`, `name` 추측 | `memberId`, `nickname` 실제 필드 |

**결과**:
- ✅ TypeScript 에러 0개
- ✅ 실제 gRPC API와 완벽 호환
- ✅ 프로젝트 타입 정의 원본 유지
- ✅ BestCase 패턴 적용 (88점, 92점 참고)

---

## 📊 점수 시스템 활용

### 점수 기반 참고 파일 필터링

```typescript
// 70점 이상 (A tier) 파일만 참고
const referenceFiles = bestCase.files
  .filter(f => f.score >= 70)
  .sort((a, b) => b.score - a.score);

// S tier (90점 이상) 파일만 참고
const excellentFiles = bestCase.files
  .filter(f => f.tier === 'S')
  .sort((a, b) => b.score - a.score);
```

### 프로젝트 품질 평가

```typescript
const projectScores = analyzer.calculateProjectScore(metadata, fileResults);

// 결과:
{
  overall: 85,      // 전체 점수
  average: 82,      // 평균 파일 점수
  tier: "A",        // 티어
  distribution: {
    S: 2,   // 90점 이상
    A: 8,   // 70-89점
    B: 5,   // 50-69점
    C: 2,   // 30-49점
    D: 1    // 30점 미만
  }
}
```

---

## 💡 팁

### 1. 효율적인 메타데이터 추출

```typescript
// ✅ 좋은 예: 최대 20개 파일만 분석
const filesWithContent = files.slice(0, 20);
const projectMeta = await analyzer.analyzeProject(...);

// ❌ 나쁜 예: 모든 파일 분석 (느림)
const filesWithContent = files;  // 1000개 파일...
```

### 2. BestCase 선택 기준

```typescript
// ✅ 좋은 예: API 타입 + 프레임워크 일치
const similarCase = allCases.find(bc =>
  bc.patterns.metadata.apiType === projectMeta.apiType &&
  bc.patterns.metadata.frameworks.some(f => projectMeta.frameworks.includes(f))
);

// ❌ 나쁜 예: 단순 이름 매칭
const similarCase = allCases.find(bc => bc.projectName.includes('frontend'));
```

### 3. 점수 기준 조정

```typescript
// 일반 프로젝트: 70점 이상
const referenceFiles = files.filter(f => f.score >= 70);

// 고품질만: 90점 이상 (S tier)
const excellentFiles = files.filter(f => f.score >= 90);

// 실험적 참고: 50점 이상 (B tier 이상)
const experimentalFiles = files.filter(f => f.score >= 50);
```

---

## 🐛 문제 해결

### Q1: "Ollama 서버에 연결할 수 없습니다"

**원인**: Ollama 서버가 실행되지 않았거나, URL이 잘못됨

**해결**:
```bash
# Ollama 서버 실행 확인
curl http://localhost:11434/api/tags

# Docker로 실행
docker-compose up -d ollama-code-analyzer

# 로그 확인
docker-compose logs ollama-code-analyzer
```

### Q2: "BestCase를 찾을 수 없습니다"

**원인**: BestCase가 아직 생성되지 않음

**해결**:
```bash
# cron job으로 BestCase 생성
docker exec mcp-code-mode-server node /app/scripts/scan/auto-scan-projects-ai.js

# 또는 수동 스캔
yarn scan:advanced
```

### Q3: "메타데이터 추출이 너무 느립니다"

**원인**: 파일 수가 너무 많거나, GPU가 없음

**해결**:
```typescript
// 파일 수 제한 (10-20개 권장)
const filesWithContent = files.slice(0, 20);

// 동시성 조정 (CPU 코어 수에 맞게)
const projectMeta = await analyzer.analyzeProject(
  path,
  files,
  2  // concurrency (1-4 권장)
);
```

### Q4: "점수가 너무 낮게 나옵니다"

**원인**: 점수 계산 기준이 엄격함

**해결**:
```typescript
// 점수 계산 로직 확인
const score = analyzer.calculateFileScore(metadata);

// 기준 조정 (70 → 60으로)
const referenceFiles = files.filter(f => f.score >= 60);
```

---

## 📚 추가 리소스

- **[WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md)** - 전체 워크플로우 상세 설명
- **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)** - 메타데이터 시스템 설명
- **[PROCESS_SUMMARY.md](./PROCESS_SUMMARY.md)** - 프로세스 요약
- **[Anthropic MCP Code Mode](https://aisparkup.com/posts/6318)** - 원본 개념 설명

---

**작성일**: 2025-11-11
**버전**: 1.0.0
**커밋**: `claude/llm-command-metadata-system-011CV1TPNnF7jpRZ1vHyrsjS`

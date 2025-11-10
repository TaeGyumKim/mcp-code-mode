------

applyTo: "**"applyTo: "**"

------



# MCP Code Mode Starter - AI Coding GuidelinesProvide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.# Global AI Coding Agent Instructions



이 프로젝트는 BestCase 관리 및 프로젝트 스캐닝 기능을 갖춘 MCP (Model Context Protocol) Code Mode 서버를 구현합니다.## MCP Server Integration



## 프로젝트 개요### Standard Workflow for Feature Implementation



**목적:** 프로젝트를 스캔하고 BestCase를 저장하여 LLM 토큰 사용량을 98% 절감하는 코드 실행 기반 MCP 서버 구축When implementing features, **ALWAYS** follow this decision tree workflow:



**핵심 기술:**#### Decision Tree: Choose Your Implementation Path

- Yarn 4.9.1 (Berry) 워크스페이스 모노레포

- Node.js 20 + TypeScript**START HERE:** What type of feature are you implementing?

- Nuxt 3 웹 인터페이스

- vm2 샌드박스 코드 실행---

- Docker 배포

#### Path A: UI Component Usage (openerd-nuxt3)

**핵심 컨셉:** 중간 데이터를 LLM 컨텍스트로 전달하는 대신, 샌드박스에서 코드를 실행하고 최종 결과만 반환

**When to use:** Using CommonTable, CommonButton, CommonLayout, or any openerd-nuxt3 component

---

**Step 1: Check Component Library (`openerd-nuxt3`)**

## 필수 아키텍처 규칙

- Use **`openerd-nuxt3-lib`** to read component source files

### 1. 워크스페이스 구조 (반드시 준수)- Use **`openerd-nuxt3-search`** to search for type definitions and interfaces

- Look for:

```  - Component props and their types

mcp-code-mode-starter/  - Model value structure (e.g., `v-model` format)

├── packages/  - Available slots and events (especially for CommonTable: use field names as slot names)

│   ├── bestcase-db/      # BestCase 저장소 (JSON 파일 기반)  - Required vs optional properties

│   ├── ai-bindings/      # filesystem + bestcase API export

│   └── ai-runner/        # vm2 샌드박스 실행**Example:**

├── mcp-servers/

│   ├── filesystem/       # TypeScript API: readFile, writeFile, searchFiles```

│   └── bestcase/         # TypeScript API: saveBestCase, loadBestCase1. Search component: mcp_openerd-nuxt3_search_files("CommonTable")

├── apps/2. Read source: mcp_openerd-nuxt3_read_text_file("path/to/CommonTable.vue")

│   └── web/              # Nuxt3 웹 인터페이스 (선택적)3. Check types: Look for CommonTableHeader interface, slot definitions

├── scan-*.js             # 스캐닝 스크립트 (ai-runner로 실행)4. Important: For CommonTable, header 'value' must match actual object field names

└── run-*.js              # 실행 래퍼```

```

**Step 2: Find Usage Patterns (Reference Projects)**

**패키지 의존성:**

- `ai-bindings`는 `mcp-servers/*` 의존 (상대 경로 import)- Use **`reference-tailwind-nuxt3`** for real-world examples

- `ai-runner`는 `ai-bindings` 의존 (workspace:*)- Use **`reference-tailwind-nuxt3-search`** to search for component usage

- `mcp-servers/bestcase`는 `bestcase-db/dist` 의존 (상대 경로 import)- Look for:

  - Real-world usage patterns

### 2. 모듈 해석 (매우 중요)  - Data binding patterns

  - Event handling approaches

**✅ 올바른 import 패턴:**  - Common configurations



```typescript**Example:**

// mcp-servers/bestcase/saveBestCase.ts에서

import { BestCaseStorage } from '../../packages/bestcase-db/dist/index.js';```

1. Search usage: grep_search for "CommonTable" in reference project

// packages/ai-bindings/src/index.ts에서2. Read examples: Read files that use the component

export * as filesystem from '../../mcp-servers/filesystem/index.js';3. Note patterns: How headers are defined, slot usage, data structures

export * as bestcase from '../../mcp-servers/bestcase/index.js';```



// packages/ai-runner/src/sandbox.ts에서**Step 3: Implement Following Patterns**

import { filesystem, bestcase } from 'ai-bindings';

```- Use the exact model structure from component library

- Follow data binding patterns from reference projects

**❌ 잘못된 패턴:**- Match naming conventions and coding style

- Include proper TypeScript types

```typescript

// mcp-servers에서 workspace:* 사용 금지---

import { BestCaseStorage } from 'bestcase-db';  // ❌ 실패함

#### Path B: API Integration (gRPC or OpenAPI)

// fs/path default import 금지

import fs from 'fs';  // ❌ named import 사용**When to use:** Implementing API calls with proto or OpenAPI definitions

import path from 'path';  // ❌ named import 사용

```**Step 1: Identify API Type**

Check `package.json` dependencies:

**올바른 fs/path import:**

- Has `@airian/proto` or similar? → Use gRPC/Proto workflow

```typescript- Has `@~/openapi` or OpenAPI generator? → Use OpenAPI workflow

import { promises as fs } from 'fs';

import { join, dirname } from 'path';**Step 2A: gRPC/Proto Workflow**

```

1. **Find API Client Pattern:**

### 3. TypeScript 빌드 설정

   ```

**tsup 설정 (packages/*/package.json):**   - Read composables/grpc.ts for useBackendClient pattern

   - Check reference project for gRPC integration examples

```json   - Look for interceptors (auth, language, loading, error handling)

{   ```

  "scripts": {

    "build": "tsup src/*.ts --format esm --dts"2. **Locate Proto Definitions:**

  },

  "main": "dist/index.js",   ```

  "types": "dist/index.d.ts",   - Check node_modules/@airian/proto/dist/types/proto_pb.d.ts for message types

  "type": "module"   - Check node_modules/@airian/proto/dist/types/proto_connect.d.ts for service methods

}   - Search for specific Request/Response types related to your feature

```   ```



**일반적인 빌드 에러:**3. **Import Proto Types:**



| 에러 | 원인 | 해결책 |   ```typescript

|------|------|--------|   import type { GetPopupsRequest, GetPopupsResponse_Popup, UpdatePopupRequest } from "@airian/proto";

| `Cannot find module 'vm2'` | 타입 정의 누락 | `src/vm2.d.ts` 생성 |   ```

| `ERR_MODULE_NOT_FOUND: dist/index.js` | 잘못된 import 경로 | `dist/agentRunner.js` 사용 (실제 빌드 출력) |

| `Default export not found` | 잘못된 import 문법 | named import 사용: `import { promises as fs }` |4. **Use Proto Types Correctly:**

| BestCase ID에 `/` 포함 | sanitization 누락 | 슬래시 치환: `projectName.replace(/\//g, '-')` |

   ```typescript

### 4. 샌드박스 실행 (vm2)   // ✅ CORRECT: Use plain objects for API calls

   const req = {

**타입 정의 필수 (packages/ai-runner/src/vm2.d.ts):**     page: 1,

     limit: 10,

```typescript     title: "search term"

declare module 'vm2' {   };

  export class VM {   await client.getPopups(req);

    constructor(options?: {

      timeout?: number;   // ❌ WRONG: Don't instantiate Message classes

      sandbox?: any;   const req = new GetPopupsRequest({ ... }); // This will fail

      compiler?: string;   ```

    });

    run(code: string): any;5. **Handle Proto Timestamp Fields:**

  }

}   ```typescript

```   // Proto Timestamps have { seconds: string | number }

   const timestamp = element.displayStartAt?.seconds;

**샌드박스 컨텍스트 패턴:**   const date = new Date(Number(timestamp) * 1000);

   ```

```typescript

// packages/ai-runner/src/sandbox.ts6. **Error Handling Pattern:**

import { VM } from 'vm2';   ```typescript

import { filesystem, bestcase } from 'ai-bindings';   await client

     .methodName(request)

const logs: string[] = [];     .then((response) => {

const sandbox = {       // Handle success

  filesystem,     })

  bestcase,     .catch(async (error) => {

  console: {       await useModal?.error(error, "methodName");

    log: (...args: any[]) => logs.push(args.join(' '))     });

  }   ```

};

**Step 2B: OpenAPI Workflow**

const vm = new VM({ timeout: 30000, sandbox });

```1. **Find API Client Pattern:**



**일반적인 샌드박스 이슈:**   ```

   - Read composables/api.ts or similar for API client setup

- **Async/Await 지원:** 코드를 async IIFE로 래핑   - Check reference project (e.g., token.ts) for OpenAPI usage

  ```typescript   ```

  const wrappedCode = `(async () => { ${code} })()`;

  ```2. **Locate OpenAPI Definitions:**

- **타임아웃 처리:** 기본 30초, `timeoutMs` 파라미터로 설정 가능

- **콘솔 로깅:** `logs[]` 배열에 캡처, 실행 후 출력   ```

   - Check node_modules/@~/openapi for generated types

### 5. BestCase 저장소   - Look for API service classes and type definitions

   ```

**파일 구조:**

3. **Import and Use Types:**

```   ```typescript

D:/01.Work/01.Projects/.bestcases/   import type { YourRequestType, YourResponseType } from "@~/openapi";

└── {projectName}-{category}-{timestamp}.json   ```

```

---

**ID Sanitization (매우 중요):**

#### Path C: Combined Workflow (openerd-nuxt3 + API)

```typescript

// ✅ 올바름: 프로젝트명의 슬래시 치환**When to use:** Building pages with UI components AND API integration

const sanitizedProjectName = input.projectName.replace(/\//g, '-').replace(/\\/g, '-');

const id = `${sanitizedProjectName}-${input.category}-${Date.now()}`;**Combined Steps:**



// ❌ 잘못됨: 직접 연결1. **Start with Component Structure (Path A)**

const id = `${input.projectName}-${input.category}-${Date.now()}`;   - Design UI with openerd-nuxt3 components

// "50.dktechin/frontend"인 경우 서브디렉토리 생성 시도로 실패   - Define headers, slots, and data structures

```   - Use reference project for layout patterns



**BestCase 스키마:**2. **Add API Integration (Path B)**

   - Implement API client setup

```typescript   - Import proto/OpenAPI types

interface BestCase {   - Connect data to components

  id: string;

  projectName: string;  // 원본 이름 (슬래시 포함 가능)3. **Map API Data to UI Components:**

  category: string;

  description: string;   ```typescript

  files: Array<{   // Example: CommonTable with Proto data

    path: string;   const headers: CommonTableHeader[] = [

    content: string;     { title: "번호", value: "index" },        // Custom field

    purpose: string;     { title: "제목", value: "title" },        // Proto field: element.title

  }>;     { title: "작성자", value: "authorName" }, // Proto field: element.authorName

  patterns: {   ];

    stats?: { totalFiles: number; vueFiles: number; ... };

    apiInfo?: { hasGrpc: boolean; hasOpenApi: boolean; ... };   // List contains proto objects directly

    codePatterns?: { framework: string; usesTypescript: boolean; ... };   const list = ref<GetPopupsResponse_Popup[]>([]);

    sampleCode?: { components: [], composables: [], api: [] };

    [key: string]: any;   // Template slots use proto field names

  };   <template #title="{ element }">

  metadata: {     <td>{{ element.title }}</td>

    createdAt: string;   </template>

    updatedAt: string;   ```

    tags: string[];

  };4. **Handle Route Query Sync (Reference Pattern):**

}

```   ```typescript

   // Watch route query and sync with request state

---   watch(

     () => route.query,

## 구현 패턴     () => {

       request.value = {

### 패턴 1: 새 MCP 서버 API 생성         page: Number(route.query.page ?? 1),

         limit: Number(route.query.limit ?? 10),

**사용 시기:** 샌드박스 코드에 노출할 새로운 기능 추가         title: route.query.title ? String(route.query.title) : undefined,

       };

**단계:**     },

     { immediate: true },

1. **API 디렉토리 생성:**   );

   ```

   ```bash

   mkdir mcp-servers/my-api5. **Add Error Handling with useModalState:**

   ```

   ```typescript

2. **TypeScript 함수 구현:**   const useModal = useModalState();



   ```typescript   await client

   // mcp-servers/my-api/myFunction.ts     .methodName(req)

   export interface MyFunctionInput {     .then((response) => {

     param: string;       /* success */

   }     })

        .catch(async (error) => {

   export interface MyFunctionOutput {       await useModal?.error(error, "methodName");

     result: string;     });

   }   ```

   

   /**---

    * 이 함수가 하는 일 설명

    * @example### Quick Reference Checklist

    * const result = await myapi.myFunction({ param: 'value' });

    */**Before implementing any feature, check:**

   export async function myFunction(input: MyFunctionInput): Promise<MyFunctionOutput> {

     return { result: `Processed: ${input.param}` };- [ ] Does it use openerd-nuxt3 components? → Use **Path A** or **Path C**

   }- [ ] Does it need API calls? → Check `package.json` for proto/openapi

   ```- [ ] Is it gRPC/Proto? → Read `grpc.ts` + proto definitions

- [ ] Is it OpenAPI? → Read API client + openapi types

3. **index에서 export:**- [ ] Need real examples? → Search **reference-tailwind-nuxt3** project

- [ ] Need error handling? → Use `useModalState()` pattern

   ```typescript- [ ] Need route sync? → Use `watch(() => route.query)` pattern

   // mcp-servers/my-api/index.ts- [ ] API 구현 안됨? → TODO 주석으로 처리, 빈 구현 금지

   export { myFunction } from './myFunction.js';- [ ] Display numbers/dates? → Use `~/utils/format` functions

   ```

**Formatting Requirements:**

4. **ai-bindings에 추가:**

- [ ] All numbers in DOM must use `formatNumber()` (1,234,567)

   ```typescript- [ ] All dates must use `formatDate()` (yyyy-MM-dd)

   // packages/ai-bindings/src/index.ts- [ ] All datetimes must use `formatDateTime()` (yyyy-MM-dd HH:mm:ss)

   export * as myapi from '../../mcp-servers/my-api/index.js';- [ ] Phone numbers should use `formatPhoneNumber()` (010-1234-5678)

   ```- [ ] Import from `~/utils/format` not `openerd-nuxt3/utils`



5. **빌드:****CommonPaginationTable Specific:**



   ```bash- [ ] Header `value` = actual object field name (not display label)

   yarn build:all- [ ] Template slot names = header `value` names

   ```- [ ] Custom fields (like "순번", "관리") need custom slots

- [ ] Use `v-model:selected` for checkbox selection

6. **샌드박스 코드에서 사용:**- [ ] Button disabled with `:disabled`, not `v-if`



   ```javascript**Routing & Navigation:**

   const result = await myapi.myFunction({ param: 'test' });

   console.log(result.result);- [ ] Use `navigateTo()` instead of `router.push()` (SSR)

   ```- [ ] Import `useRoute` only (not `useRouter`)

- [ ] Return `navigateTo()` result in functions

### 패턴 2: 스캐닝 스크립트 생성

**API & Paging:**

**사용 시기:** 프로젝트를 스캔하고 BestCase를 저장해야 할 때

- [ ] `useBackendClient("")` with empty string (global loading)

**템플릿:**- [ ] `usePaging(..., false, [...])` - local=false for auto-load

- [ ] Don't call `loadPage()` in route.query watch (duplicate)

```javascript- [ ] If API not implemented, use TODO comments only

// scan-my-feature.js

const PROJECT_NAME = 'project-name';---

const projectsBasePath = 'D:/01.Work/01.Projects';

const targetPath = `${projectsBasePath}/${PROJECT_NAME}`;### MCP Server Resources



try {#### Component Library (openerd-nuxt3)

  // 1. 파일 스캔

  const files = await filesystem.searchFiles({Location: `D:/01.Work/01.Projects/00.common/openerd-nuxt3`

    path: targetPath,

    pattern: '*.ts',- MCP Server: **`openerd-nuxt3-lib`** (file access)

    recursive: true- MCP Server: **`openerd-nuxt3-search`** (code search)

  });- Contains: All reusable UI components, composables, utilities

  - Key Files to Check:

  // 2. 패턴 분석  - Components: `src/runtime/components/common/*.vue`

  const patterns = {  - Types: Look for interface definitions in component files

    fileCount: files.files.filter(f => !f.isDirectory).length,  - Composables: `src/runtime/composables/*.ts`

    // ... 분석 내용

  };#### Reference Projects

  

  // 3. 샘플 파일 읽기**Tailwind + Nuxt 3 + openerd-nuxt3:**

  const sampleFile = files.files[0];Location: `D:/01.Work/01.Projects/50.dktechin/frontend`

  const content = await filesystem.readFile({ path: sampleFile.path });

  - MCP Server: **`reference-tailwind-nuxt3`** (file access)

  // 4. BestCase 저장- MCP Server: **`reference-tailwind-nuxt3-search`** (code search)

  const result = await bestcase.saveBestCase({- Use for:

    projectName: PROJECT_NAME,  - Tailwind styling patterns

    category: 'my-feature',  - CommonLayout usage examples

    description: `${PROJECT_NAME} 분석`,  - gRPC integration patterns (check composables/grpc.ts)

    files: [{  - Pinia store patterns

      path: sampleFile.name,  - TipTap editor implementation

      content: content.content,  - Form validation patterns

      purpose: '예시 파일'  - Route query synchronization

    }],  - Error handling with useModalState

    patterns: patterns,

    tags: ['typescript', 'analysis']**Key Reference Files:**

  });

  - `composables/grpc.ts` - gRPC client setup, interceptors, error handling

  console.log('✅ 저장됨:', result.id);- `pages/*Management.vue` - List page patterns with CommonTable

  - `pages/*Register.vue` - Form page patterns

} catch (error) {- `store/*.ts` - Pinia store patterns

  console.log('❌ 에러:', error.message);

}**Adding More References:**

```To add more reference projects, update `mcp.json` with new servers following this pattern:



**실행 래퍼:**```json

"reference-[type]-[framework]": {

```javascript  "type": "stdio",

// run-my-feature.js  "command": "npx",

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';  "args": ["-y", "@modelcontextprotocol/server-filesystem", "path/to/project"]

import { readFileSync } from 'fs';}

```

const code = readFileSync('./scan-my-feature.js', 'utf-8');

await runAgentScript({ code, timeoutMs: 60000 });## General Best Practices

```

### Code Style

**package.json에 추가:**

- Follow project-specific conventions found in `.github/copilot-instructions.md` if present

```json- Use TypeScript strict mode when available

{- Prefer composition API for Vue 3 projects

  "scripts": {- Use functional programming patterns where appropriate

    "scan:my-feature": "node run-my-feature.js"

  }### API Communication

}

```- Check for existing API client utilities before implementing new ones

- Use consistent error handling patterns across the project

### 패턴 3: API 감지- Always validate API responses before using data



**gRPC 감지:**### Component Development



```javascript- **ALWAYS** follow the decision tree workflow when implementing features

const pkgContent = await filesystem.readFile({ path: `${targetPath}/package.json` });- Keep components focused and single-purpose

const pkg = JSON.parse(pkgContent.content);- Use proper TypeScript typing for props and emits

const deps = { ...pkg.dependencies, ...pkg.devDependencies };- Implement proper loading and error states

- Follow accessibility best practices (ARIA labels, keyboard navigation)

const grpcKeywords = ['grpc', 'proto', '@grpc', 'protobuf'];- **For CommonTable:** Header `value` must match object field names exactly

const hasGrpc = Object.keys(deps).some(dep => - **For Proto types:** Use plain objects for API calls, not Message class instances

  grpcKeywords.some(kw => dep.toLowerCase().includes(kw))- **For error handling:** Always use useModalState() in catch blocks

);

```### Data Formatting



**OpenAPI 감지:**- **Numbers**: Always use `formatNumber()` for displaying numbers in DOM

  - Handles null/undefined safely

```javascript  - Supports number, bigint types

const openApiKeywords = ['openapi', 'swagger', '@~/openapi'];  - Korean locale formatting (1,234,567)

const hasOpenApi = Object.keys(deps).some(dep => - **Dates**: Always use `formatDate()` for displaying dates

  openApiKeywords.some(kw => dep.toLowerCase().includes(kw))  - Default format: "yyyy-MM-dd"

);  - Custom format support: `formatDate(date, "yyyy/MM/dd")`

```  - Handles proto Timestamp, DateTime, ISO strings, numbers

- **DateTimes**: Always use `formatDateTime()` for displaying date + time

**프레임워크 감지:**  - Default format: "yyyy-MM-dd HH:mm:ss"

  - Custom format support: `formatDateTime(date, "yyyy-MM-dd HH:mm")`

```javascript  - Handles proto Timestamp, DateTime, ISO strings, numbers

let framework = 'unknown';- **Phone Numbers**: Use `formatPhoneNumber()` for Korean phone numbers

if (deps['nuxt']) framework = 'Nuxt 3';  - Automatically adds hyphens: "010-1234-5678"

else if (deps['next']) framework = 'Next.js';  - Handles various formats (02-xxx-xxxx, 1xxx, etc.)

else if (deps['vue']) framework = 'Vue 3';

else if (deps['react']) framework = 'React';- **Import Location**: Always import from `~/utils/format`

```

  ```typescript

---  import { formatNumber, formatDate, formatDateTime, formatPhoneNumber } from "~/utils/format";

  ```

## 테스팅 & 디버깅

- **Why not openerd-nuxt3?**: Format functions exist in openerd-nuxt3 but are not exported in the distribution build

### 빌드 순서 (매우 중요)

### Routing and Navigation

**항상 이 순서로 빌드:**

- **SSR 환경**: 항상 `navigateTo()` 사용, `router.push()` 사용 금지

```bash- **Import**: `import { useRoute } from "vue-router"` (useRouter는 필요시에만)

# 1. BestCase DB (의존성 없음)- **Page Navigation**: `return navigateTo({ path: "/path", query: {...} })`

yarn workspace bestcase-db run build

### API Client Setup

# 2. AI Bindings (bestcase-db에 의존하는 mcp-servers에 의존)

yarn workspace ai-bindings run build- **useBackendClient**: 빈 문자열 `""` 사용 (전역 로딩 설정)

  ```typescript

# 3. AI Runner (ai-bindings에 의존)  const client = useBackendClient(""); // ✅ 전역 로딩

yarn workspace ai-runner run build  const client = useBackendClient("featureName"); // ❌ 개별 로딩 키 불필요

  ```

# 또는 통합 명령어 사용:

yarn build:all### Pagination with usePaging

```

- **local=false**: usePaging이 자동으로 초기 loadPage 호출

### 일반적인 테스트 실패  ```typescript

  const paging = usePaging(1, 10, 0, loadPage, false, [...]);

| 증상 | 원인 | 해결책 |  // local=false이므로 loadPage가 자동 호출됨 - 별도 호출 불필요

|------|------|--------|  ```

| `Code is required` | 잘못된 함수 시그니처 | `runAgentScript({ code })` 사용, `runAgentScript(code)` 아님 |- **watch에서 loadPage 호출 금지**: route.query watch에서 loadPage 중복 호출하지 않기

| `result.success is undefined` | 잘못된 result 속성 | `result.ok` 사용, `result.success` 아님 |

| 콘솔 출력 없음 | 로그 미출력 | `agentRunner.ts`에 로그 출력 추가 |### Handling Unimplemented APIs

| 대용량 스캔 타임아웃 | 기본 30초 타임아웃 | `timeoutMs: 60000` 이상 증가 |

| 빈 BestCase 파일 | async/await 누락 | 모든 `filesystem.*` 호출에 `await` 사용 |- **API 미구현 시**: TODO 주석으로 처리, 빈 구현체 작성하지 않기

- **삭제 기능**: API 없으면 빈 함수로 두고 TODO 주석만

### 디버그 체크리스트  ```typescript

  async function handleDelete() {

**스캔 실행 전:**    // TODO: 삭제 API 구현 필요 (proto에 정의되어 있지 않음)

    // const confirmed = await useModal?.confirm("삭제하시겠습니까?");

- [ ] `yarn build:all` 성공적으로 완료    // if (!confirmed) return;

- [ ] 프로젝트 경로 존재 및 접근 가능    // await client.deleteFAQ({ id })...

- [ ] BestCase 저장 디렉토리 존재 (`D:/01.Work/01.Projects/.bestcases/`)  }

- [ ] 스캐너 스크립트에 올바른 PROJECT_NAME 설정  ```

- **목록 조회**: API 없으면 빈 배열로 초기화

**스캔 실패 시:**  ```typescript

  async function loadPage() {

- [ ] 콘솔 출력에서 샌드박스 로그 확인    // TODO: API 구현 필요

- [ ] 파일 경로가 절대 경로인지 확인 (상대 경로 아님)    list.value = [];

- [ ] 패턴 매칭이 올바른지 확인 (예: `*.vue` not `vue`)    paging.total.value = 0;

- [ ] 경로 구분자 확인 (Windows에서도 `/` 사용)    paging.updatePagination();

  }

**BestCase 저장 실패 시:**  ```



- [ ] 프로젝트명에 잘못된 문자 포함 확인 (`/`, `\`)### UI 버튼 상태 관리

- [ ] patterns 객체가 직렬화 가능한지 확인 (함수, 순환 참조 없음)

- [ ] files 배열이 올바른 구조인지 확인- **disabled 속성 사용**: v-if 대신 :disabled 사용

- [ ] 디스크 공간 및 권한 확인

  ```vue

---  <!-- ✅ GOOD -->

  <CommonButton :disabled="selectedItems.length === 0" />

---

## AI 코드 분석 시스템 (LLM + GPU) - 2025.11.07 추가

### 1. AI 분석 아키텍처

**목적:** Ollama + GPU를 활용한 실시간 코드 품질 분석 (토큰 절감 + 정확도 향상)

**핵심 구조:**
```
Docker Compose 환경:
├── ollama-code-analyzer (GPU 전용)
│   ├── NVIDIA GeForce GTX 1060 6GB (device_ids: ['1'])
│   ├── Model: qwen2.5-coder:1.5b (2.2GB)
│   └── OLLAMA_NUM_PARALLEL=3 (병렬 처리)
├── mcp-code-mode-server
│   ├── CodeAnalyzer (llm-analyzer 패키지)
│   ├── Concurrency: 3 workers
│   └── auto-scan-projects-ai.js
└── bestcase-cron-scheduler (자동 스캔)
```

### 2. CodeAnalyzer 사용법 (중요)

**✅ 올바른 초기화 (config 객체 사용):**

```typescript
import { CodeAnalyzer } from './packages/llm-analyzer/dist/index.js';

// ✅ CORRECT: config 객체로 전달
const analyzer = new CodeAnalyzer({
  ollamaUrl: 'http://ollama-code-analyzer:11434',
  model: 'qwen2.5-coder:1.5b',
  concurrency: 3
});

// ❌ WRONG: 직접 파라미터 전달 (구버전 - URL이 객체로 전달되어 에러 발생)
const analyzer = new CodeAnalyzer(OLLAMA_URL, LLM_MODEL);
```

**✅ 파일 분석 API (파일 내용 읽기 필수):**

```typescript
// analyzeProject는 { path, content } 배열 필요
const filesWithContent = [];
for (const file of filesToAnalyze) {
  const content = await fs.readFile(file.path, 'utf-8');
  filesWithContent.push({
    path: file.path,
    content: content  // ✅ 파일 내용 포함
  });
}

const analysisResult = await analyzer.analyzeProject(
  projectPath,
  filesWithContent,  // ✅ { path, content }[] 형식
  CONCURRENCY
);

// ❌ WRONG: 파일 경로만 전달 (fileScores undefined 에러)
// await analyzer.analyzeProject(projectPath, filePaths, 3);
```

**결과 처리:**

```typescript
const { results, summary } = analysisResult;

// summary 구조:
// - averageScore: number (평균 점수)
// - totalFiles: number
// - topFiles: Array<{ path, score }>
// - excellentSnippets: ExcellentCodeSnippet[]

// results 구조:
// - filePath: string
// - score: number (0-100)
// - category: 'api' | 'component'
// - strengths: string[]
// - weaknesses: string[]
```

### 3. 프롬프트 작성 가이드 (매우 중요)

**원칙: STRICT and CRITICAL 평가**

❌ **잘못된 프롬프트 (너무 관대함):**
```
"Evaluate code quality (0-100):
- Good code: 60-80 points
- Excellent code: 80-100 points"

결과: 모든 파일이 65점 또는 60점으로 획일화됨
```

✅ **올바른 프롬프트 (엄격한 기준):**
```typescript
`You are a senior code reviewer. Analyze with STRICT real-world standards.

**Scoring Guidelines (be STRICT and CRITICAL):**

**1. Readability & Documentation (0-25):**
- 20-25: JSDoc comments, self-documenting names, perfect formatting
- 15-19: Good names, some comments
- 10-14: Acceptable but minimal comments
- 5-9: Poor names, no comments
- 0-4: Unreadable

**Real Examples of Excellent Code (85-95 points):**
- gRPC interceptor with retry logic and comprehensive error handling
- Composable with proper state management, validation, and TypeScript

**Examples of Poor Code (30-50 points):**
- Functions without error handling or validation
- Mixed concerns (UI + business logic + API)
- 'any' types everywhere

**Be CRITICAL. Most code should score 40-70. Only exceptional code gets 80+.**
`
```

**실제 점수 분포 (개선 전 vs 후):**
- **개선 전**: TypeScript 65점, Vue 60점 (획일화) ❌
- **개선 후**: TypeScript 50-55점, Vue 48-50점 (현실적 분포) ✅
- 우수 코드 (85+): 드물게 발견
- 평균: 50-52점

### 4. GPU 설정 및 모니터링

**docker-compose.ai.yml 필수 설정:**

```yaml
ollama:
  runtime: nvidia  # ✅ 필수
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            device_ids: ['1']  # ✅ NVIDIA GPU 강제 지정 (Intel GPU 0 제외)
            capabilities: [gpu]
  environment:
    - NVIDIA_VISIBLE_DEVICES=all
    - OLLAMA_NUM_PARALLEL=3  # 병렬 처리
    - OLLAMA_MAX_LOADED_MODELS=1
```

**GPU 사용 확인 명령어:**

```bash
# GPU 상태 확인
docker exec ollama-code-analyzer nvidia-smi

# 출력 예시:
# GPU-Util: 84% ✅ (정상)
# Memory-Usage: 1666MiB / 6144MiB
# Process: /ollama (PID 122)
# Temp: 70°C

# 모델 확인
docker exec ollama-code-analyzer ollama ps

# 출력 예시:
# NAME                  PROCESSOR    CONTEXT
# qwen2.5-coder:1.5b    100% GPU ✅  4096
```

**⚠️ 작업 관리자 오해 주의 (매우 중요):**

**작업 관리자에서 GPU 1%로 보여도 정상일 수 있음!**

- **GPU 1% (작업 관리자)**: **3D/Video Encode** 엔진 사용률 (AI 분석과 무관)
- **nvidia-smi GPU-Util 84%**: 실제 **Compute** 엔진 사용률 ✅
- Intel GPU (GPU 0, 47%): Windows UI 담당
- NVIDIA GPU (GPU 1, 84% Compute): AI 분석 담당 ✅

**확인 방법:**
```bash
# 작업 관리자: GPU 1 = 1% (3D 엔진)
# nvidia-smi: GPU-Util = 84% (Compute 엔진) ✅ 실제 사용률

docker exec ollama-code-analyzer nvidia-smi | grep "GPU-Util"
# 출력: |     84%      Default |  ✅ 정상

docker exec ollama-code-analyzer ollama ps
# PROCESSOR: 100% GPU ✅
```

### 5. BestCase 저장 로직 (샌드박스 외부) - 중요

❌ **실패 사례: runAgentScript 내부에서 저장**

```typescript
const scanCode = `
  // ... 분석 코드 ...
  
  // ❌ 샌드박스 내부에서 저장 시도
  const result = await bestcase.saveBestCase({
    projectName: PROJECT_NAME,
    category: 'auto-scan',
    // ...
  });
  
  console.log('✅ BestCase saved:', result.id);  // 로그만 출력됨
`;

await runAgentScript({ code: scanCode });
// 결과: 로그는 보이지만 실제 파일은 저장 안됨 ❌
```

✅ **올바른 방법: 샌드박스 외부에서 저장**

```typescript
const scanCode = `
  // ... 분석 코드 ...
  
  // ✅ 결과만 반환
  return {
    patterns,
    sampleFiles,
    scores: { final, pattern, api, component, tier }
  };
`;

// 샌드박스 실행 및 결과 받기
const result = await runAgentScript({ code: scanCode });

// ✅ 샌드박스 외부에서 저장
if (result.ok && result.output) {
  const { BestCaseStorage } = await import('./packages/bestcase-db/dist/index.js');
  const storage = new BestCaseStorage('/projects/.bestcases');
  
  const sanitizedProjectName = project.name.replace(/\//g, '-').replace(/\\/g, '-');
  const bestCaseId = `${sanitizedProjectName}-${category}-${Date.now()}`;
  
  await storage.save({
    id: bestCaseId,
    projectName: project.name,
    // ...
  });
  
  console.log(`✅ BestCase saved: ${bestCaseId}`);
}
```

**이유:**
- `runAgentScript`는 vm2 샌드박스에서 실행됨
- 샌드박스 내부의 파일 쓰기는 실제 호스트에 저장되지 않음
- `console.log`는 보이지만 파일 시스템 변경은 격리됨
- 반드시 샌드박스 외부에서 `BestCaseStorage.save()` 호출해야 함

### 6. Docker 볼륨 권한 설정

❌ **실패 사례: read-only 볼륨**

```yaml
mcp-code-mode:
  volumes:
    - D:/01.Work/01.Projects:/projects:ro  # ❌ read-only
```

**에러:**
```
EROFS: read-only file system, open '/projects/.bestcases/xxx.json'
```

✅ **올바른 설정: read-write 볼륨**

```yaml
mcp-code-mode:
  volumes:
    - D:/01.Work/01.Projects:/projects  # ✅ read-write (BestCase 저장용)
```

**재시작 필요:**
```bash
docker-compose -f docker-compose.ai.yml down
docker-compose -f docker-compose.ai.yml up -d
```

### 7. 파일 경로 처리 (Docker vs Host)

**Docker 컨테이너 내부:**
```javascript
const PROJECTS_BASE_PATH = '/projects';  // ✅ Docker 경로
const targetPath = '/projects/50.dktechin/frontend';
```

**호스트 (개발/테스트):**
```javascript
const PROJECTS_BASE_PATH = 'D:/01.Work/01.Projects';  // ✅ Windows 경로
```

**BestCase ID Sanitization (필수):**

```typescript
// ❌ WRONG: 슬래시 포함 시 서브디렉토리 생성 시도
const id = `${projectName}-${category}-${Date.now()}`;
// "50.dktechin/frontend" → /projects/.bestcases/50.dktechin/frontend-xxx.json (실패)

// ✅ CORRECT: 슬래시 치환
const sanitizedProjectName = projectName.replace(/\//g, '-').replace(/\\/g, '-');
const id = `${sanitizedProjectName}-${category}-${Date.now()}`;
// "50.dktechin-frontend-auto-scan-ai-1762517275487.json" (성공)
```

### 8. AI 분석 성능 최적화

**병렬 처리 설정:**

```javascript
// CONCURRENCY 값에 따른 성능 차이
// - CONCURRENCY=1: 4.7초/파일 (가장 빠름, 순차)
// - CONCURRENCY=2: 5.2초/파일
// - CONCURRENCY=3: 5.8초/파일 (권장, GPU 활용 최대화)

const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 3;
```

**파일 개수 제한:**

```javascript
// 너무 많은 파일 분석 방지
const filesToAnalyze = fileList
  .filter(f => f.name.endsWith('.vue') || f.name.endsWith('.ts'))
  .slice(0, 20);  // 최대 20개 파일

// 샘플 파일 읽기
const filesWithContent = [];
for (const file of filesToAnalyze.slice(0, 20)) {
  try {
    const content = await fs.readFile(file.path, 'utf-8');
    filesWithContent.push({ path: file.path, content });
  } catch (e) {
    // Skip unreadable files (symlink, permission 등)
  }
}
```

**예상 시간:**
- 소형 프로젝트 (3-5 파일): 10-15초
- 중형 프로젝트 (10-15 파일): 40-60초
- 대형 프로젝트 (20+ 파일): 80-120초
- 66개 프로젝트 전체: 약 45분

### 9. 실전 BestCase 예시

**저장된 BestCase 구조:**

```json
{
  "id": "50.dktechin-frontend-auto-scan-ai-1762517275487",
  "projectName": "50.dktechin/frontend",
  "category": "auto-scan-ai",
  "description": "50.dktechin/frontend AI-Enhanced Scan (Score: 50/100)",
  "files": [
    {
      "path": "ragManagement.vue",
      "content": "...",
      "purpose": "Vue Component Sample"
    }
  ],
  "patterns": {
    "apiInfo": {
      "hasGrpc": false,
      "hasOpenApi": true,
      "apiType": "OpenAPI"
    },
    "componentUsage": {
      "CommonTable": 0,
      "CommonPaginationTable": 3,
      "CommonButton": 15
    },
    "scores": {
      "final": 50,
      "pattern": 30,
      "api": 40,
      "component": 20,
      "tier": "C"
    },
    "aiAnalysis": {
      "averageScore": 51.6,
      "totalFiles": 10,
      "topFiles": [
        { "path": "grpc.ts", "score": 55 },
        { "path": "token.ts", "score": 55 },
        { "path": "ragManagement.vue", "score": 50 }
      ]
    }
  },
  "metadata": {
    "createdAt": "2025-11-07T12:07:55.487Z",
    "updatedAt": "2025-11-07T12:07:55.487Z",
    "tags": ["auto-scan", "ai-analysis", "C", "nuxt 3", "2025-11-07"]
  }
}
```

### 10. 모니터링 및 디버깅

**진행 상황 확인:**

```bash
# 실행 중인 프로세스 확인
docker top mcp-code-mode-server

# 출력:
# PID 5473: node auto-scan-projects-ai.js ✅

# 최신 BestCase 파일 확인
docker exec mcp-code-mode-server sh -c "ls -lt /projects/.bestcases/*auto-scan-ai*.json | head -10"

# GPU 사용률 모니터링
watch -n 5 'docker exec ollama-code-analyzer nvidia-smi'
```

**로그 확인:**

```bash
# Ollama 로그
docker logs -f ollama-code-analyzer --tail 50

# MCP 서버 로그
docker logs -f mcp-code-mode-server --tail 50
```

---

## 실패 사례 & 해결책

### 실패 사례 1: 전체 프로젝트 스캔 너무 느림

**문제:** 대형 프로젝트(92,638 파일) 전체 스캔이 너무 오래 걸림

**해결책:**

- 특정 파일 타입만 스캔 (`*.vue`, `*.ts`, `*.json`)
- 모든 내용 읽기 대신 파일 개수 통계 사용
- 샘플 수집 (첫 3개 컴포넌트, API, Composables)
- BestCase에 필수 설정 파일만 저장

### 실패 사례 2: BestCase ID에 슬래시 포함

**문제:** `50.dktechin/frontend`가 단일 파일 대신 서브디렉토리 생성

**해결책:**

```typescript
const sanitizedProjectName = input.projectName
  .replace(/\//g, '-')
  .replace(/\\/g, '-');
```

### 실패 사례 3: mcp-servers에서 Import 해석 실패

**문제:** `import { BestCaseStorage } from 'bestcase-db'` 실패

**이유:** mcp-servers 디렉토리에서 workspace 패키지 사용 불가

**해결책:** 상대 경로 import 사용:

```typescript
import { BestCaseStorage } from '../../packages/bestcase-db/dist/index.js';
```

### 실패 사례 4: fs/path Default Import

**문제:** `import fs from 'fs'`에서 TypeScript 컴파일 에러

**해결책:** named import 사용:

```typescript
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
```

### 실패 사례 5: vm2 타입 정의 누락

**문제:** TypeScript에서 `Cannot find module 'vm2'`

**해결책:** 타입 정의 파일 생성:

```typescript
// packages/ai-runner/src/vm2.d.ts
declare module 'vm2' {
  export class VM {
    constructor(options?: { timeout?: number; sandbox?: any });
    run(code: string): any;
  }
}
```

---

## 성능 최적화

### 토큰 절감 전략

**전통적인 MCP 방식:**

1. LLM이 `searchFiles` tool call 전송
2. 서버가 92,638개 파일 경로 반환 (엄청난 토큰 비용)
3. LLM이 처리 및 필터링
4. LLM이 `readFile` tool calls 전송
5. 서버가 파일 내용 반환 (더 많은 토큰)

6. 반복...>

  <template #index="{ index }">

**Code Mode 방식:**    <td class="text-center base-td default">

      {{ (paging.page.value - 1) * paging.limit.value + index + 1 }}

1. LLM이 코드와 함께 단일 `execute` 전송    </td>

2. 서버가 샌드박스에서 코드 실행  </template>

3. 코드가 로컬에서 필터링, 처리, 집계  <template #type="{ element }">

4. 서버가 최종 결과만 반환 (98% 토큰 절감)    <td class="text-center base-td default">{{ element.type || "-" }}</td>

  </template>

**예시:**  <template #title="{ element }">

    <td

```javascript      class="base-td default truncate max-w-[300px] cursor-pointer hover:underline"

// 100+ tool calls 대신, 이것을 한 번만 실행:      :title="element.title"

const allFiles = await filesystem.searchFiles({ path: '/projects', recursive: true });      @click="goToEdit(element.id)"

const vueFiles = allFiles.files.filter(f => f.name.endsWith('.vue'));    >

const stats = {      {{ element.title }}

  total: allFiles.files.length,    </td>

  vue: vueFiles.length,  </template>

  ts: allFiles.files.filter(f => f.name.endsWith('.ts')).length  <template #manage="{ element }">

};    <td class="text-center base-td default">

console.log(JSON.stringify(stats));      <CommonButton

// 500KB 대신 50바이트만 반환        size="sm"

```        type="outline"

        class="w-20"

### 스캔 성능 팁        @click="goToEdit(element.id)"

      >

- 여러 번 호출 대신 `recursive: true`를 한 번만 사용        수정

- 로드 후 메모리 내에서 필터링      </CommonButton>

- 필요한 파일만 읽기 (설정, 샘플)    </td>

- 원본 데이터 대신 통계 저장  </template>

- 내용 읽기 전 파일 확장자 확인</CommonPaginationTable>

```

---

**gRPC API Integration:**

## 빠른 참조

```typescript

### 필수 명령어// 1. Import proto types (optional - only if types are defined)

import type { GetPopupsRequest, GetPopupsResponse_Popup } from "@airian/proto";

```bash

# 모든 패키지 빌드// 2. Setup client (빈 문자열 = 전역 로딩 사용)

yarn build:allconst client = useBackendClient("");

const useModal = useModalState();

# 프로젝트 스캔 (먼저 scan-advanced.js 편집)

yarn scan:advanced// 3. Create request as plain object

const req = {

# 간단한 테스트 실행  page: 1,

yarn test:simple  limit: 10,

  title: "search",

# Docker 시작};

docker-compose up -d

// 4. Make API call with error handling

# 로그 확인await client

docker-compose logs -f  .getPopups(req)

```  .then((response) => {

    // Handle success

### 파일 위치    list.value = response.popups;

  })

- **BestCases:** `D:/01.Work/01.Projects/.bestcases/`  .catch(async (error) => {

- **Packages:** `packages/bestcase-db`, `packages/ai-bindings`, `packages/ai-runner`    await useModal?.error(error, "getPopups");

- **MCP APIs:** `mcp-servers/filesystem`, `mcp-servers/bestcase`  });

- **Scanners:** 루트의 `scan-*.js` 파일

- **Docs:** `README.md`, `VSCODE_MCP_GUIDE.md`, `COMPLETION_SUMMARY.md`// 5. API가 구현되지 않은 경우: TODO 주석으로 처리

async function loadPage(page: number = 1, limit: number = 10): Promise<void> {

---  // TODO: GetFAQs API 구현 필요 (proto에 Request/Response가 정의되어 있지 않음)

  // const req = { page, limit };

## 참고 문서  // await client.getFAQs(req)

  //   .then((response) => {

- **README.md** - 프로젝트 개요, 빠른 시작  //     list.value = response.faqs || [];

- **VSCODE_MCP_GUIDE.md** - VS Code 통합 상세 가이드  //     paging.total.value = response.totalCount || 0;

- **COMPLETION_SUMMARY.md** - 구현 요약  //   })

- **Anthropic MCP Docs** - 프로토콜 사양  //   .catch(async (error) => {

- **vm2 Documentation** - 샌드박스 보안 모델  //     await useModal?.error(error, "getFAQs");

  //   });

  // 임시: API 구현 전까지 빈 데이터로 처리
  list.value = [];
  paging.total.value = 0;
  paging.updatePagination();
}
```

**Route Query Synchronization:**

```typescript
// 1. Define request state (일반 객체 사용 - proto type 없을 수 있음)
const request = ref({
  page: 1,
  limit: 10,
  searchType: "title" as string,
  keyword: "" as string,
});

// 2. Watch route query (immediate: true로 초기 로드)
watch(
  () => route.query,
  () => {
    request.value = {
      page: Number(route.query.page ?? 1),
      limit: Number(route.query.limit ?? 10),
      searchType: String(route.query.searchType ?? "title"),
      keyword: String(route.query.keyword ?? ""),
    };
  },
  { immediate: true },
);

// 3. Search function updates URL (navigateTo 사용 - SSR 환경)
function search() {
  const query: Record<string, any> = {
    page: 1,
    limit: request.value.limit,
  };

  if (request.value.searchType) {
    query.searchType = request.value.searchType;
  }

  if (request.value.keyword) {
    query.keyword = request.value.keyword;
  }

  return navigateTo({ path: "/faqManagement", query });
}
```

**Date/Time/Number Formatting:**

```typescript
// Import utility functions from project utils
import { formatNumber, formatDate, formatDateTime, formatPhoneNumber } from "~/utils/format";

// 1. Number formatting (Korean style with commas)
{
  {
    formatNumber(1234567);
  }
} // "1,234,567"
{
  {
    formatNumber(paging.total.value);
  }
} // "1,234"
{
  {
    formatNumber(element.price);
  }
} // "50,000"

// 2. Date formatting (proto Timestamp support)
{
  {
    formatDate(element.createdAt);
  }
} // "2024-01-15"
{
  {
    formatDate(element.createdAt, "yyyy/MM/dd");
  }
} // Custom format

// 3. DateTime formatting (proto Timestamp support)
{
  {
    formatDateTime(element.lastLoginDate);
  }
} // "2024-01-15 14:30:25"
{
  {
    formatDateTime(element.updatedAt, "yyyy-MM-dd HH:mm");
  }
} // Custom format

// 4. Phone number formatting
{
  {
    formatPhoneNumber("01012345678");
  }
} // "010-1234-5678"

// Proto Timestamp handling (automatic conversion)
// formatDate/formatDateTime automatically handle proto Timestamp { seconds: number }
const timestamp = element.createdAt; // { seconds: 1234567890 }
formatDate(timestamp); // Converts to readable date
```

**Project Utils Location:**

- File: `utils/format.ts`
- Contains: `formatNumber`, `formatDate`, `formatDateTime`, `formatTime`, `formatPhoneNumber`
- Supports: Proto Timestamp, luxon DateTime, ISO strings, number, bigint
- All functions are null/undefined safe

**Date/Time Pickers (FromToPicker, DatePicker):**

```typescript
// Model structure: { from: Date, to: Date }
const datePicker = ref({
  from: new Date(),
  to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

// Use luxon for formatting (reference project pattern)
import { DateTime } from "luxon";
const formatted = DateTime.fromJSDate(date).toFormat("yyyy/MM/dd");
```

**File Upload Components (UploadImage):**

```typescript
// Separate handlers for multiple upload areas
const pcFiles = ref<FileInterface[]>([]);
const mobileFiles = ref<FileInterface[]>([]);

const onChangePc = (list: FileInterface[]) => {
  pcFiles.value = list;
};

// Use @update-files event, not v-model for file lists
<UploadImage @update-files="onChangePc" />
```

**Form Validation:**

```typescript
// Check reference projects for validation patterns
function validateForm(): boolean {
  if (!form.field.trim()) {
    alert("필드를 입력해주세요.");
    return false;
  }
  return true;
}

### Testing
- Write tests for critical business logic
- Test edge cases and error scenarios
- Keep tests maintainable and readable

---

## Docker 배포 관련 실패 사례

### 실패 사례 6: Yarn 4 devDependencies 설치 문제

**문제:** Docker 빌드 시 TypeScript를 찾을 수 없어 tsup 빌드 실패

**에러:**
```
DTS You need to install "typescript" in your project
Error: error occurred in dts build
```

**시도한 해결책과 결과:**

1. ❌ `yarn install --production=false`
   - Yarn 4.9.1에서 `--production` 플래그 미지원
   - 에러: `Unknown Syntax Error: Invalid option name ("--production=false")`

2. ❌ `yarn workspaces focus ...`
   - Yarn 4에서 `workspaces focus` 명령어 없음

3. ❌ `.yarnrc.yml` 없이 빌드
   - Yarn이 PnP 모드로 동작하여 node_modules 생성 안됨
   - TypeScript 패키지를 찾을 수 없음

**✅ 올바른 해결책:**

1. `.yarnrc.yml` 파일 생성:
   ```yaml
   nodeLinker: node-modules
   ```

2. Dockerfile에서 설정 파일 복사:
   ```dockerfile
   COPY package.json yarn.lock .yarnrc.yml ./
   COPY .yarn ./.yarn
   ```

3. 기본 설치 명령 사용:
   ```dockerfile
   RUN yarn install --inline-builds
   ```

**핵심 포인트:**
- Yarn 4에서 `yarn install`은 기본적으로 devDependencies 포함
- `--production` 플래그 대신 `NODE_ENV=production`으로 제어
- `nodeLinker: node-modules` 설정 필수 (Docker 환경)
- `.yarn/install-state.gz` 파일만 있어도 충분 (releases 디렉토리 불필요)

### 실패 사례 7: Docker 컨테이너 재시작 루프

**문제:** MCP STDIO 서버가 stdin을 기다리다가 즉시 종료되어 컨테이너가 재시작 반복

**증상:**
```
STATUS: Restarting (0) Less than a second ago
```

**원인:** 
- MCP STDIO 서버는 stdin에서 JSON-RPC 요청을 대기
- Docker CMD로 직접 실행 시 stdin이 없어 즉시 종료
- restart policy로 인해 무한 재시작

**✅ 해결책:**

Dockerfile CMD를 대기 상태로 변경:
```dockerfile
# MCP STDIO 서버를 직접 실행하지 않고 컨테이너만 유지
CMD ["tail", "-f", "/dev/null"]
```

실제 MCP 서버는 `docker exec`로 필요할 때만 실행:
```bash
docker exec -i mcp-code-mode-server node /app/mcp-stdio-server.js
```

**docker-compose.yml 설정:**
```yaml
services:
  mcp-code-mode:
    restart: unless-stopped
    # healthcheck 없이 단순 실행 유지
```

**VS Code mcp.json 설정:**
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

### 실패 사례 8: MCP 서버 list_bestcases 메서드 오류

**문제:** `bestcase.list is not a function` 에러 발생

**원인:**
- `mcp-servers/bestcase/index.ts`에 listBestCases 함수가 export되지 않음
- MCP 서버에서 잘못된 메서드명 호출 (`list` 대신 `listBestCases`)

**✅ 해결책:**

1. **listBestCases.ts 생성:**
```typescript
import { BestCaseStorage } from '../../packages/bestcase-db/dist/index.js';

export async function listBestCases() {
  const storage = new BestCaseStorage();
  const allCases = await storage.list();
  
  return {
    bestcases: allCases.map(bc => ({
      id: bc.id,
      projectName: bc.projectName,
      category: bc.category,
      description: bc.description,
      createdAt: bc.metadata.createdAt,
      updatedAt: bc.metadata.updatedAt,
      tags: bc.metadata.tags
    })),
    total: allCases.length
  };
}
```

2. **index.ts에 export 추가:**
```typescript
export { saveBestCase } from './saveBestCase.js';
export { loadBestCase } from './loadBestCase.js';
export { listBestCases } from './listBestCases.js';
```

3. **mcp-stdio-server.js 수정:**
```javascript
// list_bestcases 메서드
else if (request.method === 'list_bestcases') {
  const code = 'await bestcase.listBestCases()';  // ✅ 올바른 메서드명
  const result = await runAgentScript({ code, timeoutMs: 10000 });
  // ...
}
```

### 실패 사례 9: 수동 프로젝트 목록 관리의 한계

**문제:** 
- 프로젝트가 추가/삭제될 때마다 수동으로 코드 수정 필요
- D:/01.Work/01.Projects/* 하위 모든 Nuxt 프로젝트를 찾지 못함

**✅ 해결책:**

자동 Nuxt 프로젝트 탐색 기능 구현:

```javascript
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 디렉토리가 Nuxt 프로젝트인지 확인
 */
function isNuxtProject(projectPath) {
  try {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) return false;
    
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Nuxt 관련 패키지 확인
    return deps['nuxt'] || deps['nuxt3'] || deps['@nuxt/core'];
  } catch (error) {
    return false;
  }
}

/**
 * 모든 Nuxt 프로젝트 자동 탐색
 */
function findAllNuxtProjects(basePath) {
  const nuxtProjects = [];
  const entries = readdirSync(basePath);
  
  for (const entry of entries) {
    if (entry === '.bestcases' || entry.startsWith('.')) continue;
    
    const fullPath = join(basePath, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 직접 Nuxt 프로젝트인지 확인
      if (isNuxtProject(fullPath)) {
        nuxtProjects.push({
          name: entry,
          path: fullPath,
          category: 'auto-scan'
        });
      } else {
        // 하위 디렉토리도 확인 (1단계 깊이)
        try {
          const subEntries = readdirSync(fullPath);
          for (const subEntry of subEntries) {
            if (subEntry.startsWith('.')) continue;
            
            const subPath = join(fullPath, subEntry);
            if (statSync(subPath).isDirectory() && isNuxtProject(subPath)) {
              nuxtProjects.push({
                name: entry + '/' + subEntry,
                path: subPath,
                category: 'auto-scan'
              });
            }
          }
        } catch (err) {
          // 권한 문제 등으로 접근 불가한 경우 스킵
        }
      }
    }
  }
  
  return nuxtProjects;
}

// 프로젝트 목록 동적 생성
const PROJECTS_TO_SCAN = findAllNuxtProjects(PROJECTS_BASE_PATH);
```

**장점:**
- 새 프로젝트 추가 시 자동 감지
- 프로젝트 삭제 시 자동 제외
- 2단계 깊이까지 탐색 (예: `50.dktechin/frontend`)
- 유지보수 불필요



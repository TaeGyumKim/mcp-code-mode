# 현재 프로젝트 API 스캔 시스템 (3차 수정)

## 🚨 핵심 문제 지적

**사용자 피드백:**
> "BestCase에 API가 아니라 **해당 프로젝트에 API가 있는지**, 사용할 게 있는지를 체크해야해.  
> BestCase는 이미 어느 정도 완성도가 있는 프로젝트기 때문에 **항상 있을 수밖에 없잖아**"

## ❌ 이전 문제 (2차 수정까지)

```typescript
// ❌ BestCase에서 API 확인
const hasApiInBestCase = bestCase?.patterns?.apiInfo?.endpoints?.length > 0;

if (hasApiInBestCase) {
  // BestCase의 API 정보 사용
  const apiType = bestCase.patterns.apiInfo.apiType;
  const endpoints = bestCase.patterns.apiInfo.endpoints;
  
  todos.push({
    id: 'connectApi',
    description: `${apiType} API 연결 (${endpoints.length}개)`
  });
}
```

**문제점:**
- BestCase = **다른 프로젝트의 우수 사례** (참고용)
- 현재 작업 중인 프로젝트의 실제 API는 체크하지 않음
- BestCase가 완성도 높은 프로젝트라 항상 API가 있음 → **항상 true**
- 실제로 현재 프로젝트에 API가 없어도 연동 시도 → **오류 발생**

## ✅ 해결 방법 (3차 수정)

### 1️⃣ 현재 프로젝트 API 스캔 함수 추가

```typescript
/**
 * 현재 프로젝트의 API 파일 스캔 (gRPC proto, OpenAPI spec 등)
 */
async function scanProjectApiFiles(workspacePath: string): Promise<{
  apiType: 'grpc' | 'openapi';
  files: string[];
  methods: string[];
} | null> {
  console.error('[scanProjectApiFiles] Scanning workspace:', workspacePath);
  
  try {
    // 1. gRPC proto 파일 스캔 (*.proto)
    const protoFiles = await findFilesRecursive(workspacePath, '.proto');
    if (protoFiles.length > 0) {
      // proto 파일에서 RPC 메서드 추출
      const methods: string[] = [];
      for (const protoFile of protoFiles.slice(0, 3)) {
        const content = await fs.readFile(protoFile, 'utf-8');
        const rpcMatches = content.matchAll(/rpc\s+(\w+)\s*\(/g);
        for (const match of rpcMatches) {
          methods.push(match[1]);
        }
      }
      
      return {
        apiType: 'grpc',
        files: protoFiles,
        methods,
      };
    }
    
    // 2. OpenAPI spec 파일 스캔 (swagger.json, openapi.yaml 등)
    const openapiFiles = await findFilesRecursive(workspacePath, '.yaml', '.yml', '.json');
    const swaggerFiles = openapiFiles.filter(f => 
      f.includes('swagger') || f.includes('openapi') || f.includes('api-spec')
    );
    
    if (swaggerFiles.length > 0) {
      // OpenAPI spec에서 엔드포인트 추출
      const methods: string[] = [];
      for (const specFile of swaggerFiles.slice(0, 3)) {
        const content = await fs.readFile(specFile, 'utf-8');
        
        if (specFile.endsWith('.json')) {
          const spec = JSON.parse(content);
          if (spec.paths) {
            for (const [path, pathItem] of Object.entries(spec.paths)) {
              for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
                if (pathItem[method]) {
                  methods.push(`${method.toUpperCase()} ${path}`);
                }
              }
            }
          }
        }
      }
      
      return {
        apiType: 'openapi',
        files: swaggerFiles,
        methods,
      };
    }
    
    // 3. composables/providers 디렉토리에서 API 클라이언트 스캔
    const composablesPath = join(workspacePath, 'composables');
    const providersPath = join(workspacePath, 'providers');
    
    for (const apiDir of [composablesPath, providersPath]) {
      const files = await findFilesRecursive(apiDir, '.ts', '.js');
      const apiFiles = files.filter(f => 
        f.includes('grpc') || f.includes('api') || f.includes('client')
      );
      
      if (apiFiles.length > 0) {
        const methods: string[] = [];
        for (const file of apiFiles.slice(0, 3)) {
          const content = await fs.readFile(file, 'utf-8');
          
          // gRPC 클라이언트 메서드 추출
          if (file.includes('grpc')) {
            const methodMatches = content.matchAll(/client\.(\w+)\(/g);
            for (const match of methodMatches) {
              methods.push(match[1]);
            }
            
            if (methods.length > 0) {
              return { apiType: 'grpc', files: apiFiles, methods };
            }
          }
          
          // REST API 메서드 추출
          const fetchMatches = content.matchAll(/(?:fetch|axios|useFetch)\(['"]([^'"]+)['"]/g);
          for (const match of fetchMatches) {
            methods.push(match[1]);
          }
        }
        
        if (methods.length > 0) {
          return { apiType: 'openapi', files: apiFiles, methods };
        }
      }
    }
    
    console.error('[scanProjectApiFiles] No API files found in project');
    return null;
    
  } catch (error: any) {
    console.error('[scanProjectApiFiles] Error scanning project:', error.message);
    return null;
  }
}
```

### 2️⃣ `synthesizeTodoList` 수정

```typescript
export async function synthesizeTodoList(
  meta: RequestMetadata,
  bestCase?: any,
  workspacePath?: string  // 🔑 추가
): Promise<TodoItem[]> {
  const todos: TodoItem[] = [];
  
  // 🔑 현재 프로젝트에 실제 API가 있는지 스캔
  let projectApiInfo: any = null;
  if (workspacePath) {
    projectApiInfo = await scanProjectApiFiles(workspacePath);
    console.error('[synthesizeTodoList] Project API scan result:', {
      hasApi: !!projectApiInfo,
      apiType: projectApiInfo?.apiType,
      fileCount: projectApiInfo?.files?.length || 0,
      methods: projectApiInfo?.methods?.slice(0, 5) || [],
    });
  }
  
  // BestCase는 참고용 (우수 사례 패턴)
  console.error('[synthesizeTodoList] BestCase info (for reference):', {
    hasApi: !!bestCase?.patterns?.apiInfo,
    apiType: bestCase?.patterns?.apiInfo?.apiType,
    endpointCount: bestCase?.patterns?.apiInfo?.endpoints?.length || 0,
  });
  
  // 🔑 현재 프로젝트에 API가 있으면 무조건 API 연동 TODO 추가
  const hasApiInProject = projectApiInfo && projectApiInfo.methods.length > 0;
  
  if (hasApiInProject) {
    const apiType = projectApiInfo.apiType;
    const methods = projectApiInfo.methods;
    
    console.error('[synthesizeTodoList] ⚠️ API detected in PROJECT! Adding mandatory API integration TODO');
    
    meta.apiTypeHint = apiType as any;
    
    todos.push({
      id: 'connectApi',
      files: [...],
      loc: 80,
      description: `🔑 ${apiType.toUpperCase()} API 연결 (${methods.length}개 메서드 사용 가능)`,
    });
  }
  
  // ... 나머지 TODO 생성
  
  return todos;
}
```

### 3️⃣ `executeWorkflow`에서 `workspacePath` 전달

```typescript
// index.ts
const todos = await synthesizeTodoList(
  metadata, 
  input.bestCase, 
  input.workspacePath  // 🔑 추가
);
```

## 🔍 스캔 우선순위

1. **Proto 파일** (`.proto`)
   - `rpc GetBannerList(...)` 패턴 추출
   - 가장 명확한 gRPC API 증거

2. **OpenAPI 스펙** (`swagger.json`, `openapi.yaml`)
   - `paths` 객체에서 엔드포인트 추출
   - `GET /api/banners`, `POST /api/banners` 등

3. **API 클라이언트 파일** (`composables/`, `providers/`)
   - `client.getBannerList()` 패턴 추출
   - `useFetch('/api/banners')` 패턴 추출
   - 실제 사용 중인 API 메서드 확인

## 📊 동작 흐름 비교

### Before (2차 수정)

```
사용자: "배너 관리 페이지 작성"
  ↓
BestCase 로드 (참고용 우수 사례)
  - patterns.apiInfo.endpoints: [getBannerList, ...] ← 다른 프로젝트!
  ↓
❌ BestCase에 API가 있네? → TODO 추가
  ↓
실제 현재 프로젝트에는 API가 없음
  ↓
❌ API 연결 시도 → 에러!
```

### After (3차 수정)

```
사용자: "배너 관리 페이지 작성"
  ↓
현재 프로젝트 스캔 (workspacePath)
  1. Proto 파일 검색: *.proto → 발견!
  2. RPC 메서드 추출: getBannerList, deleteBanner, ...
  ↓
✅ 현재 프로젝트에 gRPC API 있음! → TODO 추가
  ↓
BestCase 로드 (참고용)
  - excellentSnippets에서 패턴 추출
  - 우수 사례 코드 스타일 참고
  ↓
✅ 실제 API 연결 코드 생성
```

## 🎯 로그 예시

```
[synthesizeTodoList] Starting TODO synthesis
[synthesizeTodoList] Workspace path: D:/01.Work/Projects/49.airian/frontend-admin

[scanProjectApiFiles] Scanning workspace: D:/01.Work/Projects/49.airian/frontend-admin
[scanProjectApiFiles] Found proto files: 3
[scanProjectApiFiles] Extracted gRPC methods: [
  "getBannerList",
  "createBanner",
  "updateBanner",
  "deleteBanner",
  "getBannerById"
]

[synthesizeTodoList] Project API scan result: {
  hasApi: true,
  apiType: "grpc",
  fileCount: 3,
  methods: ["getBannerList", "createBanner", "updateBanner", "deleteBanner", "getBannerById"]
}

[synthesizeTodoList] BestCase info (for reference): {
  hasApi: true,
  apiType: "gRPC",
  endpointCount: 12
}

[synthesizeTodoList] ⚠️ API detected in PROJECT! Adding mandatory API integration TODO
[synthesizeTodoList] API Type: grpc
[synthesizeTodoList] Methods: ["getBannerList", "createBanner", "updateBanner", "deleteBanner", "getBannerById"]

[synthesizeTodoList] Generated TODOs: [
  { id: "connectApi", desc: "🔑 GRPC API 연결 (5개 메서드 사용 가능)" },
  { id: "createPageWithApi", desc: "API 연동된 페이지 생성 (데이터 로드, 테이블, CRUD)" },
  { id: "addAsyncBoundary", desc: "로딩/에러 상태 처리 (CommonAsyncBoundary)" }
]
```

## 📁 스캔 대상 디렉토리 구조

```
D:/01.Work/Projects/49.airian/frontend-admin/
├── proto/
│   ├── banner.proto          ← 스캔 대상 1
│   ├── notice.proto
│   └── common.proto
├── composables/
│   ├── grpc/
│   │   └── useGrpcClient.ts  ← 스캔 대상 2
│   └── api/
│       └── useBanner.ts
├── providers/
│   └── api.provider.ts       ← 스캔 대상 3
├── swagger/
│   └── openapi.yaml          ← 스캔 대상 4
└── pages/
    └── bannerManagement.vue
```

## ✅ 효과

### Before

- **BestCase (참고 프로젝트)에 API 있음** → 무조건 연동 시도
- **현재 프로젝트에 API 없음** → 에러 발생
- 사용자: "왜 없는 API를 연결하려고 해?"

### After

- **현재 프로젝트에 API 있는지 실제 스캔**
- Proto 파일, OpenAPI spec, API 클라이언트 파일 확인
- **실제로 있을 때만** API 연동 TODO 추가
- BestCase는 **코드 패턴 참고용**으로만 사용

## 🎯 결론

이제 시스템이 다음과 같이 동작합니다:

1. **현재 작업 중인 프로젝트**를 먼저 스캔
2. Proto 파일, OpenAPI spec, API 클라이언트 실제 확인
3. **API가 있으면** → 연동 TODO 추가
4. **API가 없으면** → 기본 페이지만 생성
5. BestCase는 **우수 사례 코드 패턴**으로만 활용

**사용자가 맞습니다: BestCase가 아니라 현재 프로젝트를 체크해야 합니다!** ✅

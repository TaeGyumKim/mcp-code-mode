# BestCase 활용 가이드 (AI 에이전트용)

## 🎯 이 지침의 목적

**중요:** 이 지침은 **작업 중인 현재 프로젝트**의 BestCase를 MCP를 통해 자동으로 로드하고 활용하기 위한 것입니다.

## 📌 핵심 원칙

1. **항상 현재 프로젝트의 BestCase를 우선 참조**
   - MCP `list_bestcases` → 현재 프로젝트 찾기
   - MCP `load_bestcase` → 프로젝트 설정 로드
   - BestCase의 API 구조를 기반으로 코드 생성

2. **Default 지침은 보조 수단**
   - BestCase가 없는 경우에만 사용
   - 현재 프로젝트와 충돌 시 BestCase 우선

3. **자동화 가능한 것과 불가능한 것 구분**
   - ✅ 가능: BestCase 기반 코드 생성, API 타입 파악, 패턴 적용
   - ❌ 불가능: 설정 파일 자동 수정 (수동 작업 필요)

## 🔄 BestCase 활용 워크플로우

### Step 1: 현재 프로젝트 BestCase 자동 로드

**작업 시작 시 반드시 실행:**

```typescript
// 1. 현재 워크스페이스 경로 확인
const workspacePath = process.cwd(); // 예: D:/01.Work/01.Projects/50.dktechin/frontend

// 2. MCP로 모든 BestCase 목록 조회
const allBestCases = await mcp.list_bestcases();

// 3. 현재 프로젝트와 매칭되는 BestCase 찾기
const projectName = extractProjectName(workspacePath); // "50.dktechin/frontend"
const matchingCase = allBestCases.find(bc => 
  bc.projectName.includes(projectName) || 
  bc.projectName.endsWith(projectName)
);

// 4. BestCase 로드
if (matchingCase) {
  const bestCase = await mcp.load_bestcase(matchingCase.projectName, matchingCase.category);
  // 이제 bestCase.patterns를 기반으로 코드 생성
}
```

### Step 2: API 타입 자동 감지 및 적용

**BestCase에서 API 정보 추출:**

**BestCase에서 API 정보 추출:**

```typescript
// BestCase 로드 후
const apiInfo = bestCase.patterns?.apiInfo;

if (apiInfo?.hasGrpc && apiInfo?.hasOpenApi) {
  // 하이브리드: gRPC + OpenAPI 모두 사용
  console.log("이 프로젝트는 gRPC와 OpenAPI를 모두 사용합니다.");
  
  // gRPC 설정
  const grpcPackage = findPackage(bestCase.patterns.dependencies, ['@grpc/', 'proto']);
  // OpenAPI 설정
  const openApiPackage = findPackage(bestCase.patterns.dependencies, ['openapi']);
  
} else if (apiInfo?.hasGrpc) {
  // gRPC 전용
  console.log("이 프로젝트는 gRPC를 사용합니다.");
  
  // gRPC composables 생성 필요
  // 참고: bestCase.files에서 grpc.ts 파일 찾기
  const grpcFile = bestCase.files?.find(f => f.path.includes('grpc.ts'));
  
} else if (apiInfo?.hasOpenApi) {
  // OpenAPI 전용
  console.log("이 프로젝트는 OpenAPI를 사용합니다.");
  
  // OpenAPI composables 생성 필요
  const apiFile = bestCase.files?.find(f => f.path.includes('api.ts'));
}
```

### Step 3: 컴포넌트 패턴 자동 적용

**BestCase의 컴포넌트 사용량 기반:**

```typescript
const componentUsage = bestCase.patterns?.componentUsage || {};

// 가장 많이 사용된 컴포넌트 확인
const topComponents = Object.entries(componentUsage)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5);

console.log("이 프로젝트에서 자주 사용되는 컴포넌트:", topComponents);
// 예: [["CommonTable", 15], ["CommonButton", 12], ["CommonPaginationTable", 8]]

// 이를 기반으로 새 페이지 생성 시 동일한 컴포넌트 사용
```

**openerd-nuxt3에서 컴포넌트 확인:**

```typescript
// 1. 컴포넌트 검색
// 도구: mcp_openerd-nuxt3-search_search
// 파라미터: pattern="CommonTable", path="."

// 2. 소스 파일 읽기
// 도구: mcp_openerd-nuxt3-lib_read_file
// 파라미터: path="D:/01.Work/01.Projects/00.common/openerd-nuxt3/components/CommonTable.vue"

// 3. Props, Slots, Events 확인
// - Props: list, headers, v-model:selected
// - Slots: header의 value를 slot name으로 사용
// - Events: @row-click, @selection-change

// 4. 참조 프로젝트에서 사용 예시 찾기
// 도구: mcp_reference-tailwind-nuxt3-search_search
// 파라미터: pattern="CommonTable", path="."
```

### Step 3-1: 유틸리티 함수 확인

**openerd-nuxt3에 유틸리티가 있는지 먼저 확인:**

```typescript
// 1. 유틸리티 검색
// 도구: mcp_openerd-nuxt3-search_search
// 파라미터: pattern="formatNumber", path="utils"

// 2. 소스 확인
// 도구: mcp_openerd-nuxt3-lib_read_file  
// 파라미터: path="D:/01.Work/01.Projects/00.common/openerd-nuxt3/utils/format.ts"

// ✅ openerd-nuxt3에 있으면 사용
import { formatNumber } from 'openerd-nuxt3/utils'

// ❌ 없으면 프로젝트에 생성
// ~/utils/format.ts 생성 필요
```

### Step 4: 우수 사례 코드 자동 참조

**AI 분석 결과에서 85점 이상 코드 찾기:**

```typescript
const aiAnalysis = bestCase.patterns?.aiAnalysis;

if (aiAnalysis?.excellentSnippets) {
  // 85점 이상 코드만 필터링
  const excellentCode = aiAnalysis.excellentSnippets.filter(s => s.score >= 85);
  
  excellentCode.forEach(snippet => {
    console.log(`우수 파일: ${snippet.file} (${snippet.score}점)`);
    console.log(`이유: ${snippet.reason}`);
    
    // 실제 파일 내용 로드
    const fileContent = bestCase.files?.find(f => f.path === snippet.file);
    if (fileContent) {
      // 이 코드를 템플릿으로 사용
    }
  });
}
```

## 🛠️ 실전 시나리오별 가이드

### 시나리오 1: 새 페이지 생성 (목록 페이지)

**AI 에이전트 작업 순서:**

1. **BestCase 로드**
   ```typescript
   const bestCase = await loadCurrentProjectBestCase();
   ```

2. **API 타입 확인**
   ```typescript
   const apiType = bestCase.patterns?.apiInfo?.apiType; // "gRPC" or "OpenAPI"
   ```

3. **컴포넌트 확인 (openerd-nuxt3 우선)**
   ```typescript
   // BestCase 통계
   const topComponent = "CommonTable"; // 가장 많이 사용
   
   // openerd-nuxt3에서 소스 확인
   // 도구: mcp_openerd-nuxt3-lib_read_file
   // path: "D:/01.Work/01.Projects/00.common/openerd-nuxt3/components/CommonTable.vue"
   
   // Props 확인: list, headers, v-model:selected
   // Slots 확인: header의 value를 slot name으로 사용
   ```

4. **참조 프로젝트에서 사용 예시 찾기**
   ```typescript
   // 도구: mcp_reference-tailwind-nuxt3-search_search
   // pattern: "CommonTable", path: "."
   
   // 실제 사용 패턴 확인
   ```

5. **유틸리티 함수 확인**
   ```typescript
   // formatNumber가 필요한 경우
   // 도구: mcp_openerd-nuxt3-search_search
   // pattern: "formatNumber", path: "utils"
   
   // ✅ openerd-nuxt3에서 import
   import { formatNumber } from 'openerd-nuxt3/utils'
   // ❌ 프로젝트에 생성
   // ~/utils/format.ts 생성
   ```

6. **코드 생성 (BestCase + openerd-nuxt3 기반)**
   ```vue
   <template>
     <CommonLayout title="새 페이지">
       <div class="table-header">
         <h2 class="table-title">조회 결과</h2>
         <CommonButton>등록</CommonButton>
       </div>
       
       <!-- ✅ BestCase: CommonTable 가장 많이 사용 -->
       <!-- ✅ openerd-nuxt3 소스 확인: Props, Slots 적용 -->
       <CommonTable
         v-model:selected="selectedItems"
         :list="list"
         :headers="headers"
       >
         <!-- ✅ Slot: header의 value를 slot name으로 -->
         <template #price="{ item }">
           <!-- ✅ openerd-nuxt3 유틸리티 사용 -->
           {{ formatNumber(item.price) }}원
         </template>
       </CommonTable>
     </CommonLayout>
   </template>
   
   <script setup lang="ts">
   // ✅ BestCase: apiType 확인 후 클라이언트 선택
   const client = useBackendClient(""); // OpenAPI
   // 또는
   const client = useGrpcClient(); // gRPC
   
   // ✅ openerd-nuxt3 유틸리티 import
   import { formatNumber } from 'openerd-nuxt3/utils'
   
   // ✅ BestCase의 paging 패턴 적용
   const paging = usePaging(1, 10, 0, loadPage, false, [...]);
   </script>
   ```

### 시나리오 2: API 클라이언트 생성

**gRPC 프로젝트인 경우:**

```typescript
// 1. BestCase에서 grpc.ts 우수 사례 찾기
const grpcFile = bestCase.files?.find(f => 
  f.path.includes('grpc.ts') && (f.aiScore || 0) >= 85
);

// 2. 해당 파일 내용을 템플릿으로 사용
if (grpcFile) {
  // grpcFile.content를 기반으로 새 composables/grpc.ts 생성
  // 인터셉터, 에러 핸들링, 재시도 로직 포함
}

// 3. Proto 패키지 정보 사용
const protoPackage = bestCase.patterns?.dependencies?.find(d => 
  d.includes('@airian/proto') || d.includes('proto')
);
```

**OpenAPI 프로젝트인 경우:**

```typescript
// 1. BestCase에서 api.ts 또는 useBackendClient 찾기
const apiFile = bestCase.files?.find(f => 
  f.path.includes('api.ts') || f.path.includes('useBackendClient')
);

// 2. OpenAPI 패키지 정보
const openApiPackage = bestCase.patterns?.dependencies?.find(d => 
  d.includes('openapi')
);

// 3. 템플릿 적용
```

### 시나리오 3: 데이터 포맷팅

**BestCase에서 포맷 함수 사용 패턴 확인:**

```typescript
// BestCase 파일에서 formatNumber, formatDate 사용 빈도 확인
const formatUsage = bestCase.files?.filter(f => 
  f.content?.includes('formatNumber') || 
  f.content?.includes('formatDate')
);

if (formatUsage.length > 0) {
  // 이 프로젝트는 ~/utils/format을 사용
  console.log("Import from: ~/utils/format");
} else {
  // openerd-nuxt3/utils 사용 가능
  console.log("Import from: openerd-nuxt3/utils");
}
```

## � BestCase 데이터 구조 이해

### 완전한 BestCase JSON 예시

```json
{
  "id": "50.dktechin-frontend-auto-scan-ai-1762537863463",
  "projectName": "50.dktechin/frontend",
  "category": "auto-scan-ai",
  "description": "50.dktechin/frontend AI-Enhanced Scan (Tier A, Score: 52/100)",
  "patterns": {
    "scores": {
      "final": 52,
      "api": 40,
      "component": 20,
      "tier": "A"
    },
    "apiInfo": {
      "hasGrpc": false,
      "hasOpenApi": true,
      "apiType": "OpenAPI",
      "packages": ["@dktechin/openapi"]
    },
    "componentUsage": {
      "CommonTable": 5,
      "CommonPaginationTable": 3,
      "CommonButton": 12
    },
    "dependencies": [
      "@dktechin/openapi@^1.0.0",
      "openerd-nuxt3@^2.0.0"
    ],
    "aiAnalysis": {
      "averageScore": 66.3,
      "excellentSnippets": [
        {
          "file": "composables/api.ts",
          "score": 88,
          "reason": "OpenAPI 클라이언트 설정이 우수함"
        }
      ],
      "detailedResults": [...]
    }
  },
  "files": [
    {
      "path": "composables/api.ts",
      "type": "composable",
      "content": "...",
      "aiScore": 88
    }
  ]
}
```

## ✅ AI 에이전트 체크리스트

**코드 생성 전 반드시 확인:**

- [ ] 1. `list_bestcases`로 현재 프로젝트 BestCase 조회했는가?
- [ ] 2. `load_bestcase`로 프로젝트 설정 로드했는가?
- [ ] 3. `patterns.apiInfo`에서 API 타입 확인했는가?
- [ ] 4. `patterns.componentUsage`에서 자주 쓰는 컴포넌트 확인했는가?
- [ ] 5. `patterns.aiAnalysis.excellentSnippets`에서 우수 사례 참고했는가?
- [ ] 6. Default 지침과 BestCase가 충돌하는가? → **BestCase 우선**
- [ ] 7. 생성한 코드가 BestCase 패턴을 따르는가?

## � 하지 말아야 할 것

### ❌ 잘못된 접근

```typescript
// ❌ BestCase 무시하고 Default 지침만 사용
// "이 프로젝트는 무조건 gRPC를 사용한다" (틀림!)

// ❌ BestCase 로드 없이 추측
const client = useBackendClient(""); // OpenAPI인지 gRPC인지 확인 안함

// ❌ 다른 프로젝트 BestCase 참고
const bestCase = await load_bestcase("다른프로젝트", "auto-scan-ai");
```

### ✅ 올바른 접근

```typescript
// ✅ 항상 현재 프로젝트 BestCase 먼저 로드
const allCases = await list_bestcases();
const currentCase = findMatchingCase(allCases, currentWorkspace);
const bestCase = await load_bestcase(currentCase.projectName, currentCase.category);

// ✅ BestCase 기반 결정
if (bestCase.patterns?.apiInfo?.hasGrpc) {
  // gRPC 사용
} else if (bestCase.patterns?.apiInfo?.hasOpenApi) {
  // OpenAPI 사용
}

// ✅ 우수 사례 참고
const excellentFile = bestCase.patterns?.aiAnalysis?.excellentSnippets?.[0];
```

## 🔄 실시간 BestCase 활용 예시

### 예시 대화

**User:** "상품 목록 페이지 만들어줘"

**AI Agent (내부 프로세스):**

```typescript
// 1. BestCase 로드
const cases = await mcp.list_bestcases();
const current = cases.find(c => c.projectName.includes('현재프로젝트명'));
const bestCase = await mcp.load_bestcase(current.projectName, current.category);

// 2. API 타입 확인
const apiType = bestCase.patterns.apiInfo.apiType; // "OpenAPI"

// 3. 유사 페이지 찾기
const similarPages = bestCase.files.filter(f => 
  f.path.includes('Management.vue') && f.aiScore >= 80
);

// 4. 패턴 적용
// - API: OpenAPI 사용
// - 컴포넌트: CommonPaginationTable 사용 (가장 많이 쓰임)
// - 포맷: ~/utils/format 사용
// - Paging: usePaging(..., false, [...]) 패턴
```

**AI Agent (응답):**

"이 프로젝트는 OpenAPI를 사용하므로 `useBackendClient`로 API 클라이언트를 생성하겠습니다. 
BestCase 분석 결과, `CommonPaginationTable`이 가장 많이 사용되므로 이를 활용하겠습니다."

## 📚 참고: MCP 함수 사용법

### list_bestcases()

```typescript
const cases = await mcp.list_bestcases();
// 반환: Array<{id, projectName, category, score, timestamp}>
```

### load_bestcase(projectName, category)

```typescript
const bestCase = await mcp.load_bestcase("50.dktechin/frontend", "auto-scan-ai");
// 반환: BestCase 전체 데이터 (patterns, files 포함)
```

### 현재 프로젝트 찾기 헬퍼

```typescript
function findCurrentProjectBestCase(allCases, workspacePath) {
  // workspacePath: "D:/01.Work/01.Projects/50.dktechin/frontend"
  const projectName = workspacePath.split('/').slice(-2).join('/'); // "50.dktechin/frontend"
  
  return allCases.find(c => 
    c.projectName === projectName ||
    c.projectName.endsWith(projectName) ||
    c.id.includes(projectName.replace('/', '-'))
  );
}
```

## 🎯 요약

1. **항상 BestCase 먼저 로드**
2. **API 타입은 BestCase에서 확인** (추측 금지)
3. **컴포넌트 패턴은 BestCase 통계 따르기**
4. **우수 사례 (85점+) 코드를 템플릿으로 사용**
5. **Default 지침과 충돌 시 BestCase 우선**

이 지침을 따르면 현재 프로젝트에 최적화된 코드를 자동으로 생성할 수 있습니다.

# Sandbox 사용 가이드

MCP Code Mode의 `execute` 도구는 vm2 샌드박스에서 **순수 JavaScript**를 실행합니다.

## ✅ 사용 가능한 문법

### 1. 최신 JavaScript (ES6+)

```javascript
// ✅ const/let
const name = "test";
let count = 0;

// ✅ Arrow functions
const add = (a, b) => a + b;

// ✅ Template literals
const message = `Hello ${name}`;

// ✅ Destructuring
const { id, email } = user;
const [first, second] = array;

// ✅ Spread operator
const newArray = [...oldArray, newItem];
const newObj = { ...oldObj, key: value };

// ✅ async/await
const data = await filesystem.readFile({ path: '...' });

// ✅ Promise
const result = await Promise.all([api1(), api2()]);

// ✅ Object methods
const entries = Object.entries(obj);
const keys = Object.keys(obj);

// ✅ Array methods
const filtered = array.filter(x => x > 10);
const mapped = array.map(x => x * 2);

// ✅ Regular expressions
const hasMatch = /pattern/.test(content);
const matches = content.match(/pattern/g);

// ✅ JSON
const parsed = JSON.parse(jsonString);
const stringified = JSON.stringify(obj, null, 2);
```

## ❌ 사용 불가능한 문법

### 1. TypeScript 전용 문법

```typescript
// ❌ Interface
interface User {
  name: string;
  age: number;
}

// ❌ Type alias
type UserID = string | number;

// ❌ Enum
enum Status {
  Active,
  Inactive
}

// ❌ Type annotation
const name: string = "test";
const users: User[] = [];

// ❌ Generic
function identity<T>(arg: T): T {
  return arg;
}

// ❌ Decorators
@Component
class MyComponent {}
```

**✅ 해결책:** 타입 선언만 제거하고 사용

```javascript
// ✅ 순수 JavaScript
const user = {
  name: "test",
  age: 25
};

const userID = "123"; // 또는 숫자

const Status = {
  Active: "active",
  Inactive: "inactive"
};
```

### 2. JSX/TSX 문법

```javascript
// ❌ JSX
const element = <div>Hello</div>;

// ❌ Vue Template
const template = <template>
  <div>Hello</div>
</template>;
```

**✅ 해결책:** 백틱(\`)을 사용한 템플릿 리터럴

```javascript
// ✅ 템플릿 리터럴
const template = `<template>
  <div>Hello</div>
</template>`;

const element = `<div>Hello</div>`;
```

### 3. import/export 문

```javascript
// ❌ ES 모듈
import fs from 'fs';
import { readFile } from 'fs/promises';
export const myFunction = () => {};

// ❌ CommonJS
const fs = require('fs');
module.exports = myFunction;
```

**✅ 해결책:** 샌드박스 API 사용

```javascript
// ✅ 샌드박스 API (이미 주입됨)
const result = await filesystem.readFile({ path: '...' });
await filesystem.writeFile({ path: '...', content: '...' });
```

### 4. Node.js 기본 모듈

```javascript
// ❌ Node.js 모듈
const fs = require('fs');
const path = require('path');
const http = require('http');
```

**✅ 해결책:** 샌드박스 API 사용

```javascript
// ✅ 파일 시스템
const result = await filesystem.readFile({ path: '...' });
await filesystem.writeFile({ path: '...', content: '...' });
const files = await filesystem.searchFiles({ path: '...', pattern: '**/*.js' });

// ✅ BestCase
await bestcase.saveBestCase({ ... });
const bc = await bestcase.loadBestCase({ projectName: '...' });
const list = await bestcase.listBestCases();

// ✅ 가이드
const guides = await guides.searchGuides({ keywords: ['vue', 'api'] });
const guide = await guides.loadGuide({ id: 'guide-id' });

// ✅ 메타데이터
const analyzer = metadata.createAnalyzer({ ollamaUrl: '...', model: '...' });
const meta = await analyzer.analyzeProject(path, files);
```

## 🎯 샌드박스에서 사용 가능한 API

### 1. filesystem API
**⚠️ 중요: 3개의 API만 존재합니다**

```javascript
// 1. 파일 읽기
const result = await filesystem.readFile({
  path: '/projects/myapp/src/index.ts'
});
console.log(result.content); // 파일 내용
console.log(result.size);    // 파일 크기

// 2. 파일 쓰기
await filesystem.writeFile({
  path: '/projects/myapp/output.txt',
  content: 'Hello World'
});

// 3. 파일 검색 (glob 패턴)
const searchResult = await filesystem.searchFiles({
  path: '/projects/myapp',
  pattern: '**/*.vue',
  recursive: true
});
console.log(searchResult.files); // 파일 경로 배열
```

**❌ 존재하지 않는 API (사용 불가):**
```javascript
// ❌ list() - 존재하지 않음
const files = await filesystem.list(dir);

// ❌ stat() - 존재하지 않음
const stat = await filesystem.stat(path);

// ❌ walk() - 존재하지 않음
await filesystem.walk(dir, callback);

// ❌ exists() - 존재하지 않음
const exists = await filesystem.exists(path);
```

**✅ 올바른 대체 방법:**
```javascript
// ✅ 파일 목록 얻기: searchFiles() 사용
const result = await filesystem.searchFiles({
  path: '/projects/myapp',
  pattern: '**/*.{js,ts,vue}',
  recursive: true
});
const allFiles = result.files;

// ✅ 파일 존재 확인: readFile()로 시도
try {
  await filesystem.readFile({ path: '/projects/myapp/file.txt' });
  console.log('파일 존재함');
} catch (e) {
  console.log('파일 없음');
}

// ✅ 디렉토리 순회: searchFiles()로 파일 가져온 후 처리
const result = await filesystem.searchFiles({
  path: '/projects/myapp',
  pattern: '**/*',
  recursive: true
});

for (const filePath of result.files) {
  const fileResult = await filesystem.readFile({ path: filePath });
  console.log(filePath, fileResult.size);
}
```
### 2. bestcase API

```javascript
// BestCase 저장
await bestcase.saveBestCase({
  id: 'myapp-v1',
  projectName: 'myapp',
  category: 'manual',
  description: '우수 사례',
  files: [
    { path: 'src/App.vue', content: '...', purpose: '메인 앱' }
  ],
  patterns: {
    metadata: { /* ... */ }
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['vue', 'typescript']
  }
});

// BestCase 로드
const result = await bestcase.loadBestCase({
  projectName: 'myapp'
});
console.log(result.bestCases);

// BestCase 목록
const list = await bestcase.listBestCases();
console.log(list.length);
```

### 3. guides API

```javascript
// 가이드 검색
const guides = await guides.searchGuides({
  keywords: ['vue', 'component'],
  apiType: 'grpc',
  scope: 'project'
});

// 가이드 로드
const guide = await guides.loadGuide({
  id: 'vue-component-guide'
});

// 가이드 병합
const combined = await guides.combineGuides({
  guideIds: ['guide-1', 'guide-2']
});
```

### 4. metadata API

```javascript
// 분석기 생성
const analyzer = metadata.createAnalyzer({
  ollamaUrl: 'http://ollama:11434',
  model: 'qwen2.5-coder:7b'
});

// 프로젝트 분석
const projectMeta = await analyzer.analyzeProject(
  '/projects/myapp',
  ['src/App.vue', 'src/components/Table.vue'],
  3
);

// ✅ 프로젝트 컨텍스트 추출 (외부 프로젝트 경로 지정)
const context = await metadata.extractProjectContext('/projects/49.airian/frontend-admin');
console.log('API Type:', context.apiInfo.type);               // 'grpc' | 'openapi' | 'rest' | 'mixed'
console.log('API Packages:', context.apiInfo.packages);       // ['@grpc/grpc-js', ...]
console.log('Design System:', context.designSystemInfo.detected);  // ['element-plus', ...]
console.log('Utility Library:', context.utilityLibraryInfo.detected); // ['vueuse', ...]
console.log('Recommended Plan:', context.recommendedPlan);    // 권장 작업 계획

// BestCase 메타데이터 비교
const comparison = metadata.compareBestCase(
  projectMeta,
  bestCase.patterns.metadata,
  bestCase.files
);
console.log('Missing patterns:', comparison.missingPatterns);
console.log('TODOs:', comparison.todos);

// 디자인 시스템 정보
const dsInfo = metadata.getDesignSystemInfo('openerd-nuxt3');
console.log(dsInfo.components.table.name); // "CommonTable"

// 유틸리티 라이브러리 정보
const libInfo = metadata.getUtilityLibraryInfo('vueuse');
console.log(libInfo.functions.useLocalStorage);

```

### 5. console API

```javascript
// 로그 출력 (execute 응답의 logs에 포함)
console.log('일반 로그');
console.log('여러', '값을', '출력', { obj: true });
console.error('에러 로그');

// 객체는 자동으로 JSON.stringify()
console.log({ name: 'test', value: 123 });
// 출력: {"name":"test","value":123}
```

## 📋 일반적인 실수와 해결책

### 실수 1: JSX 사용

```javascript
// ❌ 잘못된 코드
const template = <template>
  <div>Hello</div>
</template>;

// ✅ 올바른 코드
const template = `<template>
  <div>Hello</div>
</template>`;
```

### 실수 2: import 사용

```javascript
// ❌ 잘못된 코드
import fs from 'fs';
const content = fs.readFileSync(path, 'utf8');

// ✅ 올바른 코드
const result = await filesystem.readFile({ path });
const content = result.content;
```

### 실수 3: TypeScript 타입 사용

```javascript
// ❌ 잘못된 코드
interface User {
  name: string;
  age: number;
}
const user: User = { name: 'test', age: 25 };

// ✅ 올바른 코드
const user = {
  name: 'test',
  age: 25
};
```

### 실수 4: 문자열 따옴표 누락

```javascript
// ❌ 잘못된 코드
const path = D:/Projects/myapp/src/index.ts;  // SyntaxError

// ✅ 올바른 코드
const path = 'D:/Projects/myapp/src/index.ts';
// 또는
const path = `D:/Projects/myapp/src/index.ts`;
```

## 🚀 실전 예제

### 예제 1: 파일 분석

```javascript
// 파일 읽기
const filePath = '/projects/myapp/pages/memberManagement.vue';
const result = await filesystem.readFile({ path: filePath });
const content = result.content;

// 패턴 분석
const analysis = {
  hasSearchButton: /@click="performSearch"/.test(content),
  hasExcelButton: /@click="downloadExcel"/.test(content),
  hasModal: /CommonModalLayout/.test(content),
  hasPagination: /CommonPaginationTable/.test(content),

  functions: {
    performSearch: /function performSearch/.test(content),
    downloadExcel: /function downloadExcel/.test(content)
  }
};

console.log('분석 결과:', JSON.stringify(analysis, null, 2));

return analysis;
```

### 예제 2: 파일 수정

```javascript
// 파일 읽기
const filePath = '/projects/myapp/pages/memberManagement.vue';
const result = await filesystem.readFile({ path: filePath });
let content = result.content;

// 검색 버튼에 @click 추가
content = content.replace(
  '>검색</CommonButton>',
  '@click="performSearch">검색</CommonButton>'
);

// 엑셀 버튼에 @click 추가
content = content.replace(
  '>엑셀 다운로드</CommonButton>',
  '@click="downloadExcel">엑셀 다운로드</CommonButton>'
);

// 파일 저장
await filesystem.writeFile({
  path: filePath,
  content: content
});

console.log('✅ 파일 수정 완료');

return { success: true };
```

### 예제 3: BestCase 비교

```javascript
// 현재 프로젝트 파일 분석
const files = await filesystem.searchFiles({
  path: '/projects/myapp',
  pattern: '**/*.vue',
  recursive: true
});

// BestCase 로드
const bcResult = await bestcase.loadBestCase({
  projectName: 'reference-project'
});

const bc = bcResult.bestCases[0];

// 패턴 비교
const comparison = {
  currentFiles: files.files.length,
  referenceFiles: bc.files.length,
  hasGrpc: bc.patterns.metadata?.apiType === 'grpc',
  designSystem: bc.patterns.metadata?.designSystem
};

console.log('비교 결과:', JSON.stringify(comparison, null, 2));

return comparison;
```

## 💡 팁

1. **async/await 사용**: 모든 API는 비동기이므로 `await`를 사용하세요.
2. **경로 형식**: Windows 경로는 슬래시 사용 (`D:/Projects/...`)
3. **에러 처리**: try-catch로 에러를 처리하세요.
4. **로그 활용**: console.log로 중간 결과를 확인하세요.
5. **반환값**: return으로 결과를 반환하면 execute 응답의 output에 포함됩니다.

## 🔍 디버깅

에러가 발생하면 execute 응답의 `error` 필드를 확인하세요:

```json
{
  "ok": false,
  "logs": [],
  "error": "❌ JSX/TSX 문법은 샌드박스에서 사용할 수 없습니다.\n\n원인: const variable = <template>... 같은 JSX 문법을 사용했습니다.\n\n✅ 해결책: 백틱(`)을 사용하여 문자열로 저장하세요:\n   const variable = `<template>...`;\n\n📚 샌드박스는 순수 JavaScript만 실행 가능합니다."
}
```

개선된 에러 메시지가 문제와 해결책을 안내해줍니다.

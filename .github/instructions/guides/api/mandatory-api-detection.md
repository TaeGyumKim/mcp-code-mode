---
id: mandatory-api-detection
version: 1.0.0
scope: project
priority: critical
mandatory: true
tags: [api, grpc, openapi, types, validation]
---

# ⚠️ 필수: API 자동 감지 및 타입 검증

> **이 가이드는 코드 생성 전 반드시 실행해야 합니다.**
>
> API가 존재하는데도 하드코딩된 데이터를 사용하는 것을 방지합니다.

## 🎯 목적

1. **API 클라이언트 자동 감지**: gRPC, OpenAPI, REST API 감지
2. **타입 정의 추출**: 기존 Request/Response 구조 파악
3. **하드코딩 방지**: 샘플 데이터 대신 실제 API 사용 강제

---

## 📋 필수 실행 단계

### Step 1: package.json 확인

```typescript
// MCP execute 도구 사용
const packageJson = await filesystem.readFile({
  path: '/workspace/[PROJECT]/package.json'
});

const pkg = JSON.parse(packageJson.content);

// API 타입 감지
const apiType = {
  grpc: !!(pkg.dependencies['@grpc/grpc-js'] ||
           pkg.dependencies['@connectrpc/connect'] ||
           pkg.dependencies['@airian/proto']),
  openapi: !!(pkg.dependencies['openapi-typescript'] ||
              pkg.dependencies['swagger-client']),
  rest: !!(pkg.dependencies['axios'] ||
           pkg.dependencies['ofetch'])
};
```

**결과 저장**:
```typescript
// 감지된 API 타입을 기록
console.log('📦 감지된 API:', apiType);
```

---

### Step 2: API 클라이언트 파일 검색

```typescript
// composables 디렉토리 검색
const composables = await filesystem.searchFiles({
  path: '/workspace/[PROJECT]/composables',
  pattern: '**/use*Client.{ts,js}'
});

// API 클라이언트 파일 목록
const clientFiles = composables.files.map(f => f.path);

console.log('🔌 발견된 API 클라이언트:', clientFiles);
```

**발견된 경우**:
- ✅ `useBackendClient.ts` → gRPC 클라이언트
- ✅ `useApiClient.ts` → REST API 클라이언트
- ✅ `useOpenApiClient.ts` → OpenAPI 클라이언트

---

### Step 3: 타입 정의 파일 검색

```typescript
// 타입 정의 파일 검색
const typeFiles = await filesystem.searchFiles({
  path: '/workspace/[PROJECT]',
  pattern: '**/*.{proto,d.ts,types.ts}'
});

console.log('📝 발견된 타입 파일:', typeFiles.files.map(f => f.path));
```

**중요**: proto 파일이나 types.ts가 있으면 **반드시** 해당 타입 사용!

---

### Step 4: BestCase 참고 파일 확인

```typescript
// 현재 작업과 관련된 BestCase 검색
const bestcases = await bestcase.listBestCases({
  category: '[CATEGORY]',  // 예: 'member-management'
  projectName: '[PROJECT]'
});

// 고품질 참고 파일 (점수 70점 이상)
const references = bestcases
  .filter(bc => bc.patterns.scores.overall >= 70)
  .flatMap(bc => bc.files.filter(f => f.score >= 70));

console.log('💎 참고 파일:', references.map(f => f.path));
```

---

## ❌ 금지 사항

### 1. 하드코딩된 데이터 사용 금지

```typescript
// ❌ 절대 금지!
const allMembers = ref([
  { id: 1, name: "테스트" },
  { id: 2, name: "샘플" }
]);
```

**이유**: API가 존재하는데 사용하지 않음

---

### 2. 타입 새로 정의 금지

```typescript
// ❌ 절대 금지!
interface Member {
  id: string;
  email: string;
  // ... 임의로 정의
}
```

**이유**: 프로젝트에 이미 타입이 정의되어 있음

---

### 3. API 호출 생략 금지

```typescript
// ❌ 절대 금지!
function loadMembers() {
  // TODO: API 호출 구현
  return mockData;
}
```

**이유**: 실제 API를 즉시 연결해야 함

---

## ✅ 올바른 방법

### 1. 실제 API 클라이언트 사용

```typescript
// ✅ 올바른 방법
const client = useBackendClient("");

async function loadMembers() {
  const req: GetUserListRequest = {
    page: 1,
    size: 10,
    // ... 실제 Request 타입 사용
  };

  await client.getUserList(req)
    .then((response: GetUserListResponse) => {
      list.value = response.users || [];
    })
    .catch((error) => {
      console.error("API 오류:", error);
    });
}
```

---

### 2. 기존 타입 Import

```typescript
// ✅ 올바른 방법
import type {
  GetUserListRequest,
  GetUserListResponse,
  GetUserListResponse_User
} from '@airian/proto';

// 타입을 그대로 사용
const list = ref<GetUserListResponse_User[]>([]);
```

---

### 3. BestCase 패턴 참고

```typescript
// ✅ 올바른 방법
// BestCase에서 발견한 패턴을 참고
const request = ref<GetUserListRequest>({
  page: 1,
  size: 10,
  // BestCase의 검색 필터 구조 참고
  email: "",
  nickName: "",
});
```

---

## 🚨 검증 체크리스트

코드 생성 후 **반드시** 확인:

- [ ] **API 클라이언트 사용**: `useBackendClient`, `useApiClient` 등 실제 클라이언트 호출
- [ ] **타입 Import**: 프로젝트의 기존 타입 정의 사용
- [ ] **하드코딩 제거**: 샘플 데이터가 없는지 확인
- [ ] **에러 처리**: API 호출 실패 시 에러 핸들링
- [ ] **Request 구조**: BestCase 참고하여 올바른 Request 형식
- [ ] **Response 타입**: Response 타입에 맞게 데이터 매핑

---

## 🔧 자동 검증 코드

```typescript
// 코드 생성 후 자동으로 실행할 검증
function validateApiUsage(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. 하드코딩된 배열 데이터 체크
  if (/const \w+ = ref\(\[[\s\S]*?\]\)/.test(code)) {
    errors.push('❌ 하드코딩된 데이터 발견: API를 사용하세요');
  }

  // 2. API 클라이언트 사용 체크
  if (!code.includes('useBackendClient') &&
      !code.includes('useApiClient') &&
      !code.includes('.getUserList') &&
      !code.includes('client.')) {
    errors.push('❌ API 클라이언트 사용 안 됨: useBackendClient 등을 사용하세요');
  }

  // 3. 타입 import 체크
  if (!code.includes('import type')) {
    errors.push('⚠️ 타입 import 없음: 기존 타입을 import 하세요');
  }

  // 4. TODO 주석 체크
  if (/\/\/ TODO.*API/.test(code)) {
    errors.push('❌ API 호출 미구현: TODO를 제거하고 실제 구현하세요');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 📊 실행 결과 예시

### ✅ 성공 케이스

```
📦 감지된 API: { grpc: true, openapi: false, rest: true }
🔌 발견된 API 클라이언트:
  - composables/useBackendClient.ts
  - composables/useAuthClient.ts
📝 발견된 타입 파일:
  - @airian/proto/index.d.ts
  - types/user.types.ts
💎 참고 파일 (3개):
  - pages/userManagement.vue (점수: 85)
  - composables/useUserApi.ts (점수: 78)

✅ API 검증 통과!
```

### ❌ 실패 케이스

```
📦 감지된 API: { grpc: true, openapi: false, rest: true }
🔌 발견된 API 클라이언트:
  - composables/useBackendClient.ts

❌ API 검증 실패!
  - 하드코딩된 데이터 발견: API를 사용하세요
  - 타입 import 없음: 기존 타입을 import 하세요
  - API 호출 미구현: TODO를 제거하고 실제 구현하세요

⚠️ 코드를 다시 작성해야 합니다.
```

---

## 🎯 결론

**이 가이드를 따르지 않으면**:
- ❌ 하드코딩된 샘플 데이터만 있는 페이지
- ❌ 실제로 동작하지 않는 코드
- ❌ 타입 불일치로 인한 런타임 에러

**이 가이드를 따르면**:
- ✅ 실제 API와 연결된 동작하는 페이지
- ✅ 타입 안정성 보장
- ✅ 프로덕션 준비 완료 코드

---

**작성일**: 2025-11-12
**버전**: 1.0.0
**우선순위**: CRITICAL
**필수 실행**: YES

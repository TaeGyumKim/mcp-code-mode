---
id: api.validation
scope: global
apiType: any
tags: [api, validation, signature, types, check]
priority: 90
version: 2025.11.10
requires: []
excludes: []
summary: "API 메서드/시그니처 존재 확인 및 타입 검증"
---

# API 검증 필수 지침

## 🎯 목적

**BestCase에 명시된 API 메서드가 실제로 존재하고 사용 가능한지 검증하라.**

## ✅ 검증 체크리스트

### 1. BestCase API 정보 확인

```typescript
const apiInfo = bestCase.patterns?.apiInfo;

// 필수 확인 항목
console.log('[API 검증]', {
  hasGrpc: apiInfo.hasGrpc,
  hasOpenApi: apiInfo.hasOpenApi,
  apiType: apiInfo.apiType,
  endpoints: apiInfo.endpoints?.length
});
```

### 2. 클라이언트 파일 존재 확인 (🔑 MCP 사용)

**현재 프로젝트에서 실제 파일 검색:**

```typescript
// gRPC 클라이언트 검색
#mcp_openerd-nuxt3_search_files
pattern: "grpc"
path: "composables"

// 결과: composables/grpc/useGrpcClient.ts 발견

// OpenAPI 클라이언트 검색
#mcp_openerd-nuxt3_search_files
pattern: "api"
path: "composables"

// 결과: composables/api/useApiClient.ts 발견
```

**파일 읽어서 메서드 확인:**

```typescript
#mcp_openerd-nuxt3_read_text_file
path: "composables/grpc/useGrpcClient.ts"

// 확인사항:
// 1. export된 함수 (useGrpcClient, createGrpcClient 등)
// 2. client 객체의 메서드 목록
// 3. 각 메서드의 파라미터 타입
```

### 3. 메서드 시그니처 확인 (🔑 MCP 사용)

**BestCase에서 필요한 메서드 확인:**

```typescript
const requiredMethods = bestCase.patterns.apiInfo.endpoints.map(ep => ep.method);
// 예: ['getBannerList', 'getBanner', 'createBanner', 'updateBanner', 'deleteBanner']
```

**현재 프로젝트에서 메서드 존재 여부 검색:**

```typescript
// 특정 메서드 검색
#mcp_openerd-nuxt3-ripgrep_search
pattern: "getBannerList"
path: "composables/grpc"

// 결과 확인:
// - 메서드가 정의되어 있는가?
// - 파라미터 타입은 무엇인가?
```

**실제 파일에서 시그니처 확인:**

```typescript
#mcp_openerd-nuxt3_read_text_file
path: "composables/grpc/useGrpcClient.ts"

// 확인:
// getBannerList(params: { page?: number; limit?: number }): Promise<BannerList>
```

### 4. 파라미터 타입 확인

```typescript
// gRPC 예시
interface GetBannerListRequest {
  page?: number;
  limit?: number;
  status?: string;
}

// 클라이언트 시그니처와 일치 확인
client.getBannerList(params: GetBannerListRequest)
```

## 🚨 검증 실패 시 처리

### 케이스 1: 메서드 미존재

```typescript
if (!methodExists('getBannerList')) {
  console.error('[API 검증 실패] getBannerList 메서드가 클라이언트에 없음');
  console.error('[제안] BestCase 업데이트 또는 클라이언트 파일 확인 필요');
  
  // 리스크 점수에 반영
  apiMismatch += 1; // risk += 10
}
```

### 케이스 2: 파일 미존재

```typescript
if (!fileExists('composables/grpc.ts')) {
  console.error('[API 검증 실패] gRPC 클라이언트 파일이 없음');
  console.error('[제안] 클라이언트 파일 생성 필요');
  
  // 리스크 점수에 반영
  apiMismatch += 2; // risk += 20
}
```

### 케이스 3: 타입 불일치

```typescript
if (parameterTypeMismatch) {
  console.error('[API 검증 경고] 파라미터 타입이 예상과 다름');
  console.error('[제안] TypeScript 타입 정의 확인');
  
  // 경고 로그만
  typeWarn += 1; // risk += 2
}
```

## ✅ 검증 통과 조건

1. **파일 존재**: 클라이언트 파일 (grpc.ts 또는 api.ts)
2. **메서드 존재**: BestCase에 명시된 모든 메서드
3. **타입 일치**: 파라미터/반환값 타입 (TypeScript)
4. **에러 핸들링**: catchError 또는 try/catch 존재

## 📊 로그 예시

```
[API 검증 시작]
  - BestCase: 49.airian/frontend-airspace
  - API 타입: gRPC
  - 클라이언트: composables/grpc.ts

[파일 확인] ✅ composables/grpc.ts 존재

[메서드 확인]
  ✅ getBannerList 존재
  ✅ getBanner 존재
  ✅ createBanner 존재
  ✅ updateBanner 존재
  ❌ deleteBanner 미존재 ← 리스크 +10

[타입 확인]
  ✅ GetBannerListRequest 일치
  ⚠️ CreateBannerRequest 일부 필드 누락 ← 경고

[API 검증 완료] 리스크: 12/40
```

## 🔄 프리플라이트 연동

```typescript
// preflight.ts에서 호출
export async function preflightCheck(meta, todos, bestCase) {
  // ... 기존 검증
  
  // API 검증 추가
  const apiValidation = await validateApiMethods(bestCase, meta.apiTypeHint);
  
  if (!apiValidation.allExist) {
    apiMismatch += apiValidation.missingCount;
    reasons.push({
      check: 'API Methods Exist',
      passed: false,
      details: `Missing: ${apiValidation.missing.join(', ')}`
    });
  }
  
  // 리스크 계산
  const risk = 10 * apiMismatch + ...;
}
```

---
id: openapi.api.integration
scope: project
apiType: openapi
tags: [openapi, rest, nuxt3, api, backend, composables]
priority: 90
version: 2025.11.10
requires: [api.client.base]
excludes: [grpc.only]
summary: "OpenAPI 기반 REST API 통합 - 클라이언트 설정, 타입 정의, useAsyncData 패턴"
---

# OpenAPI 통합 가이드

## 적용 조건

- `package.json`에 OpenAPI generator 패키지 존재
- BestCase의 `patterns.apiInfo.hasOpenApi === true`

## 필수 단계

### 1. API 클라이언트 패턴 찾기

**참조 파일:**
```
composables/api.ts - API client setup
reference project (token.ts) - OpenAPI usage patterns
```

### 2. OpenAPI 정의 위치

```typescript
// node_modules/@~/openapi - generated types
// API service classes
// Type definitions
```

### 3. Import 및 타입 사용

```typescript
import type { YourRequestType, YourResponseType } from "@~/openapi";
```

### 4. useAsyncData 패턴

```typescript
const { data, error, refresh, pending } = await useAsyncData(
  'uniqueKey',
  () => $fetch('/api/endpoint', {
    method: 'GET',
    query: { page: 1, limit: 10 }
  })
);
```

## 체크리스트

- [ ] API 클라이언트 설정 확인 (composables/api.ts)
- [ ] OpenAPI 정의 위치 확인 (node_modules/@~/openapi)
- [ ] 타입 정의 import
- [ ] useAsyncData 또는 $fetch 사용
- [ ] 에러 핸들링 추가

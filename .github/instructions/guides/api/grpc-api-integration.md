---
id: grpc.api.integration
scope: project
apiType: grpc
tags: [grpc, proto, nuxt3, api, backend, composables]
priority: 90
version: 2025.11.10
requires: [grpc.client.base]
excludes: [openapi.only]
summary: "gRPC Proto 기반 API 통합 패턴 - 클라이언트 설정, 타입 정의, 에러 핸들링"
---

# gRPC API 통합 가이드

## 적용 조건

- `package.json`에 `@airian/proto` 또는 gRPC 관련 패키지 존재
- BestCase의 `patterns.apiInfo.hasGrpc === true`

## 필수 단계

### 1. API 클라이언트 패턴 찾기

**참조 파일 검색:**
```
composables/grpc.ts - useBackendClient 패턴
reference project - gRPC integration examples
proto 정의 - interceptors (auth, language, loading, error handling)
```

### 2. Proto 정의 위치 확인

```typescript
// node_modules/@airian/proto/dist/types/proto_pb.d.ts - message types
// node_modules/@airian/proto/dist/types/proto_connect.d.ts - service methods
```

**특정 Request/Response 타입 검색**

### 3. Proto 타입 Import

```typescript
import type { 
  GetPopupsRequest, 
  GetPopupsResponse_Popup, 
  UpdatePopupRequest 
} from "@airian/proto";
```

### 4. Proto 타입 올바른 사용

```typescript
// ✅ CORRECT: 일반 객체 사용
const req = {
  page: 1,
  limit: 10,
  title: "search term"
};
await client.getPopups(req);

// ❌ WRONG: Message 클래스 인스턴스화 (실패함)
const req = new GetPopupsRequest({ ... });
```

### 5. Proto Timestamp 필드 처리

```typescript
// Proto Timestamps: { seconds: string | number }
const timestamp = element.displayStartAt?.seconds;
const date = new Date(Number(timestamp) * 1000);
```

### 6. 에러 핸들링 패턴

```typescript
await client
  .methodName(request)
  .then((response) => {
    // Handle success
  })
  .catch(async (error) => {
    await useModal?.error(error, "methodName");
  });
```

## 체크리스트

- [ ] gRPC 클라이언트 패턴 확인 (composables/grpc.ts)
- [ ] Proto 정의 위치 확인 (node_modules/@airian/proto)
- [ ] Request/Response 타입 import
- [ ] 일반 객체로 API 호출 (Message 클래스 사용 금지)
- [ ] Timestamp 필드 올바른 처리
- [ ] 에러 핸들링 추가 (useModalState)

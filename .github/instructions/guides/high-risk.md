---
id: high-risk
scope: global
apiType: any
tags: [risk, scaffold, safety]
priority: 200
version: 2025.11.10
requires: []
excludes: []
summary: "고위험 작업 전용 지침 (리스크 ≥40) - 스캐폴딩만 수행"
---

# 고위험 작업 지침 (Risk ≥ 40)

## ⚠️ 자동 적용 금지

리스크 점수가 40 이상인 경우, **코드를 자동으로 적용하지 마세요**.

## 📝 스캐폴딩 전용 모드

다음 내용만 제공하세요:

### 1. 파일 구조 제안

```typescript
// 생성/수정할 파일 목록
const scaffolding = {
  create: [
    'pages/my/inquiry/[id].vue',
    'composables/useInquiryDetail.ts'
  ],
  modify: [
    'types/inquiry.ts'
  ],
  estimatedLoc: 350  // 예상 라인 수
};
```

### 2. TODO 체크리스트

- [ ] gRPC 메서드 시그니처 확인 (`GetInquiryDetail`)
- [ ] Protobuf 메시지 타입 정의 검증
- [ ] 의존성 설치 확인 (nuxt-grpc-client 등)
- [ ] 테스트 케이스 작성
- [ ] 타입 체크 통과 확인

### 3. 위험 요소 명시

```typescript
const risks = {
  apiMismatch: "gRPC 메서드 미확인 (점수: 10)",
  breakingChanges: "기존 API 호환성 미검증 (점수: 15)",
  missingDeps: "UI 컴포넌트 미존재 (점수: 8)",
  complexity: "LOC 300+ 예상 (점수: 12)",
  totalRisk: 45  // ≥ 40
};
```

### 4. 수동 검증 단계

1. **API 연결 테스트**

   ```bash
   grpcurl -plaintext localhost:50051 list
   ```

2. **타입 체크**

   ```bash
   npx nuxi typecheck
   ```

3. **린트**

   ```bash
   npm run lint
   ```

4. **로컬 테스트 실행**

   ```bash
   npm run dev
   ```

## 🚫 금지 사항

- ❌ 파일 자동 생성/수정
- ❌ 코드 블록 직접 제공 (예시는 가능)
- ❌ API 호출 자동 추가
- ❌ 의존성 자동 설치

## ✅ 허용 사항

- ✅ 파일 구조 제안
- ✅ TODO 체크리스트 제공
- ✅ 위험 요소 분석
- ✅ 수동 검증 가이드
- ✅ 참고 코드 예시 (복사 금지 명시)

---

**사용자에게 전달**: "리스크가 높아 자동 적용이 제한됩니다. 위 스캐폴딩을 참고하여 수동으로 작업해주세요."

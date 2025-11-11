# AI 코딩 에이전트 메인 지침 (Ultra Compact - Meta Instruction)

> **⚠️ 외부 프로젝트용 초경량 메타 지침**
>
> **이 파일은 실제 워크플로우를 포함하지 않습니다. 반드시 MCP Guides 서버를 통해 동적으로 로드하세요.**

## 🚨 필수 실행 순서 (절대 생략 불가!)

```typescript
// ===================================================
// 🔴 모든 작업은 이 순서를 반드시 따라야 합니다
// ===================================================

// 1️⃣ 작업 시작 로그
console.log('[작업 시작]', {
  file: '파일 경로',
  task: '작업 설명',
  timestamp: new Date().toISOString()
});

// 2️⃣ BestCase 로드 (❌ 생략 금지!)
const bestCase = await bestcase.loadBestCase({ projectName: '프로젝트명' });
console.log('[BestCase]', {
  apiType: bestCase.patterns.apiInfo.apiType,
  hasGrpc: bestCase.patterns.apiInfo.hasGrpc
});

// 3️⃣ guides 검색 (❌ 생략 금지!)
const { guides: results } = await guides.searchGuides({
  keywords: ['추출한', '키워드'],
  apiType: bestCase.patterns.apiInfo.apiType,
  mandatoryIds: [
    `${bestCase.patterns.apiInfo.apiType}.api.connection`,
    'api.validation',
    'error.handling'
  ]
});

// 4️⃣ guides 로드 (❌ 생략 금지!)
const { guide } = await guides.loadGuide({ 
  id: results[0].id  // 예: 'grpc.api.connection'
});
console.log('[Guide 로드]', {
  id: guide.id,
  version: guide.version,
  summary: guide.summary
});

// 5️⃣ guide.content 기반으로 코드 생성
// guide.content에서 패턴/규칙 확인 후 코드 작성

// 6️⃣ 작업 완료 로그 (❌ 생략 금지!)
console.log('[작업 완료]', {
  file: '파일 경로',
  usedGuides: [{ id: guide.id, version: guide.version }],
  protoTypes: ['사용한 Proto 타입'],
  methods: ['사용한 API 메서드']
});
```

## ❌ 절대 금지 사항

1. ❌ **BestCase 없이 작업 시작** → proto 파일 직접 grep 금지
2. ❌ **guides 없이 코드 작성** → 추측으로 composable 사용 금지
3. ❌ **Proto 타입 재정의** → interface 생성 금지, Proto 클래스 직접 사용
4. ❌ **작업 로그 생략** → 모든 단계마다 console.log 필수
5. ❌ **trial & error 반복** → BestCase.endpoints에서 확인

## 📋 필수 규칙 (요약)

1. **BestCase 우선**: API 타입/우수 사례 확인 필수
2. **필수 지침 강제**: `{apiType}.api.connection`, `api.validation`, `error.handling`
3. **리스크 ≥40**: `guides/high-risk` 1개만 로드
4. **환경 폴백**: openerd/tailwind 없으면 로컬 유틸
5. **근거 로그**: 지침 id/버전 + 우수 사례 파일(점수, 이유)

## � 토큰 절감 효과

| 항목 | 토큰 |
|------|------|
| **본 메타 지침** | ~15 토큰 |
| `workflow.main` 동적 로드 | ~350 토큰 |
| 필수 지침 3개 | ~200 토큰 |
| 검색 지침 3개 | ~150 토큰 |
| **합계** | **~715 토큰** |

**기존 (정적 포함)**: ~1500 토큰  
**절감률**: **52%** (1500 → 715)  
**추가 메타 전환**: **85%** (100 → 15)

---

**상세 내용**: `guides.loadGuide({ id: "workflow.main" })` 실행

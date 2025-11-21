# MCP 가이드 시스템 (동적 bestcase 기반)

> **이 가이드들은 1979개의 실제 bestcase 파일에서 자동 추출된 패턴을 기반으로 합니다.**

AI 코딩 에이전트를 위한 동적 지침 시스템으로, 실제 프로젝트 코드 패턴을 학습하고 적용합니다.

---

## 🎯 핵심 철학

### 1. **Bestcase-First Approach**
- 모든 가이드는 실제 bestcase 코드에서 추출
- 임의로 작성된 패턴이 아닌 검증된 실제 코드 사용
- 1979개 파일에서 지속적으로 패턴 업데이트

### 2. **Pattern-Driven Development**
- 코드를 처음부터 작성하지 않음
- 유사한 bestcase를 찾아서 패턴 재사용
- 프로젝트별 특성을 자동으로 감지하고 적응

### 3. **Dynamic Adaptation**
- API 타입 (gRPC/OpenAPI/REST) 자동 감지
- 프레임워크 (Nuxt 3/Vue 3/React) 자동 감지
- UI 라이브러리 (openerd-nuxt3/element-plus) 자동 감지

---

## 📂 디렉토리 구조

```
guides/
├── README.md              # 이 파일
├── workflow/              # 워크플로우 가이드 (최우선)
│   ├── main-workflow.md   # 외부 프로젝트용 메인 워크플로우 (priority: 200)
│   └── core-workflow.md   # 핵심 워크플로우 파이프라인 (priority: 100)
├── high-risk.md           # 고위험 작업 전용 (priority: 200, 리스크 ≥40)
├── api/                   # API 통합 가이드
│   ├── mandatory-api-detection.md       # ⚠️ 필수: API 자동 감지 (mandatory: true)
│   ├── grpc-api-connection.md           # gRPC 연결 완전 레퍼런스 (411줄)
│   ├── grpc-api-integration.md          # gRPC 빠른 시작 (94줄)
│   ├── grpc-patterns-from-bestcases.md  # 🆕 실제 gRPC 패턴 (bestcase)
│   ├── openapi-api-connection.md        # OpenAPI 연결 완전 레퍼런스 (267줄)
│   ├── openapi-integration.md           # OpenAPI 빠른 시작 (63줄)
│   └── api-validation.md                # API 메서드 검증 (priority: 90)
├── ui/                    # UI 패턴 가이드
│   ├── openerd-nuxt3-components.md           # Openerd 컴포넌트 (priority: 85)
│   ├── routing-navigation.md                 # 라우팅 패턴 (priority: 80)
│   ├── pagination-pattern.md                 # 페이지네이션 (priority: 75)
│   ├── pagination-patterns-from-bestcases.md # 🆕 실제 페이지네이션 패턴
│   ├── route-query-sync-from-bestcases.md    # 🆕 Route Query 동기화 패턴
│   ├── formatting-from-bestcases.md          # 🆕 포맷팅 유틸 패턴
│   └── formatting-utilities.md               # 포맷팅 유틸 (priority: 70)
├── patterns/              # 🆕 페이지 패턴 가이드 (bestcase 기반)
│   ├── management-page-pattern.md   # Management 페이지 표준 패턴
│   └── form-page-pattern.md         # Form/Register 페이지 표준 패턴
└── error/                 # 에러 처리
    └── error-handling.md            # 에러 처리 패턴 (priority: 90)
```

---

## 🆕 새로운 Bestcase 기반 가이드

### 자동 생성된 동적 가이드

다음 가이드들은 실제 bestcase 파일을 분석하여 자동으로 생성되었습니다:

| 가이드 | 분석된 bestcase | 추출된 패턴 | 업데이트 |
|--------|----------------|------------|---------|
| grpc-patterns-from-bestcases.md | 200개 | 4개 패턴 | 2025.11.21 |
| pagination-patterns-from-bestcases.md | 200개 | 5개 패턴 | 2025.11.21 |
| route-query-sync-from-bestcases.md | 200개 | 5개 패턴 | 2025.11.21 |
| formatting-from-bestcases.md | 200개 | 3개 패턴 | 2025.11.21 |
| management-page-pattern.md | 30개 | 완전한 구조 | 2025.11.21 |
| form-page-pattern.md | 20개 | 완전한 구조 | 2025.11.21 |

### 자동 재생성

가이드는 다음 명령으로 bestcase에서 다시 생성할 수 있습니다:

```bash
# 기본 패턴 추출
npx tsx scripts/analyze-bestcases-for-guides.ts

# 페이지 패턴 생성
npx tsx scripts/generate-comprehensive-guides.ts
```

---

## 🎯 가이드 우선순위

| 우선순위 | 가이드 | 용도 | 소스 |
|---------|--------|------|------|
| 200 | mandatory-api-detection | 필수 API 감지 | 수동 작성 |
| 200 | workflow.main | 메인 워크플로우 | 수동 작성 |
| 200 | high-risk | 고위험 작업 | 수동 작성 |
| 100 | core.workflow | 핵심 파이프라인 | 수동 작성 |
| 95 | grpc-patterns-dynamic | gRPC 패턴 | **bestcase 자동** |
| 95 | {apiType}.api.connection | API 연결 레퍼런스 | 수동 작성 |
| 90 | {apiType}.api.integration | API 통합 패턴 | 수동 작성 |
| 85 | management-page-pattern | Management 페이지 | **bestcase 자동** |
| 85 | form-page-pattern | Form 페이지 | **bestcase 자동** |
| 85 | ui.openerd.components | UI 컴포넌트 | 수동 작성 |
| 80 | pagination-patterns-dynamic | 페이지네이션 | **bestcase 자동** |
| 80 | nuxt.routing.navigation | 라우팅 | 수동 작성 |
| 75 | route-query-sync-dynamic | Query 동기화 | **bestcase 자동** |
| 70 | formatting-dynamic | 포맷팅 | **bestcase 자동** |

---

## 🔑 필수 가이드 (Mandatory)

다음 가이드는 `mandatory: true` 설정으로 **항상 자동 로드**됩니다:

### mandatory-api-detection
- **목적**: API 클라이언트 자동 감지 및 하드코딩 방지
- **실행 시점**: 코드 생성 전
- **체크**: gRPC/OpenAPI 클라이언트 존재 여부, 타입 정의 확인
- **강제**: 샘플 데이터 대신 실제 API 사용 강제

---

## 📚 API 가이드 사용법

### gRPC 가이드 선택 가이드

#### 언제 grpc-patterns-from-bestcases.md를 사용하나요? (🆕 추천)
- ✅ **실제 프로젝트의 gRPC 사용 패턴**을 보고 싶을 때
- ✅ **bestcase에서 검증된 패턴**을 참고하고 싶을 때
- ✅ **빠르게 실제 코드 예시**를 확인하고 싶을 때

**특징**:
- scope: global
- priority: 95
- 내용: 실제 4개 bestcase에서 추출한 패턴
- 자동 업데이트 가능

#### 언제 grpc-api-connection.md를 사용하나요?
- ✅ **처음 gRPC를 프로젝트에 통합**할 때
- ✅ **MCP 도구로 Proto 타입을 찾고 검증**해야 할 때
- ✅ **완전한 체크리스트**가 필요할 때 (411줄)

#### 언제 grpc-api-integration.md를 사용하나요?
- ✅ **이미 gRPC 설정이 완료**된 프로젝트
- ✅ **빠르게 패턴만 참조**하고 싶을 때 (94줄)

---

## 🔄 가이드 로딩 메커니즘

### 1. 자동 로딩 (mandatory)
```typescript
// mandatory: true 가이드는 항상 로드됨
guides = [...mandatoryGuides, ...searchResults];
```

### 2. 키워드 검색
```typescript
// 사용자 요청에서 키워드 추출 후 매칭
searchGuides({
  keywords: ["grpc", "api"],
  projectInfo: { apiType: "grpc" },
  maxResults: 3
});
```

### 3. Bestcase 패턴 자동 적용
```typescript
// 동적 가이드는 최신 bestcase 패턴을 자동 반영
const guide = await loadGuide({ id: "grpc-patterns-dynamic" });
```

### 4. 우선순위 정렬
```typescript
// priority 높은 순서대로 정렬
guides.sort((a, b) => b.priority - a.priority);
```

---

## 📝 메타데이터 필드

모든 가이드는 YAML frontmatter를 포함해야 합니다:

```yaml
---
id: unique-id                    # 고유 식별자 (필수)
version: 2025.11.21              # 버전 (YYYY.MM.DD 형식)
scope: global|project|repo|org   # 적용 범위 (필수)
apiType: grpc|openapi|any        # API 타입 (필수)
priority: 0-200                  # 우선순위 (필수, 숫자)
mandatory: true|false            # 필수 여부 (선택)
tags: [tag1, tag2]               # 검색 태그
requires: [guide-id]             # 의존성 (선택)
excludes: [guide-id]             # 충돌 (선택)
summary: "1줄 요약"               # 검색 결과 표시용 (필수)
---
```

---

## 🚀 사용 예시

### 예시 1: gRPC 프로젝트 신규 설정
```typescript
// 자동 로드되는 가이드:
// 1. mandatory-api-detection (mandatory: true)
// 2. workflow.main (priority: 200)
// 3. grpc-patterns-dynamic (bestcase 패턴, priority: 95)
// 4. grpc-api-connection (완전한 레퍼런스, priority: 95)

// 결과: 실제 패턴 + 완전한 체크리스트 + Proto 검색
```

### 예시 2: Management 페이지 작성
```typescript
// 자동 로드되는 가이드:
// 1. mandatory-api-detection (mandatory: true)
// 2. management-page-pattern (bestcase 30개 분석, priority: 85)
// 3. pagination-patterns-dynamic (bestcase 5개, priority: 80)

// 결과: 완전한 Management 페이지 구조 + 실제 패턴
```

### 예시 3: Form 페이지 작성
```typescript
// 자동 로드되는 가이드:
// 1. mandatory-api-detection (mandatory: true)
// 2. form-page-pattern (bestcase 20개 분석, priority: 85)

// 결과: Form 페이지 표준 구조 + Validation + Submit 패턴
```

---

## 🔧 가이드 자동 재생성

### Bestcase 업데이트 시 가이드 재생성

새로운 bestcase가 추가되면 가이드를 재생성하여 최신 패턴을 반영합니다:

```bash
# 1. 기본 패턴 추출 (gRPC, Pagination, Route Query, Formatting 등)
npx tsx scripts/analyze-bestcases-for-guides.ts

# 2. 페이지 패턴 생성 (Management, Form 페이지)
npx tsx scripts/generate-comprehensive-guides.ts

# 3. 생성된 가이드 확인
ls -la .github/instructions/guides/**/*.md
```

### 자동화 (권장)

CI/CD 파이프라인에 추가:

```yaml
# .github/workflows/update-guides.yml
name: Update Guides from Bestcases

on:
  schedule:
    - cron: '0 0 * * 0'  # 매주 일요일
  workflow_dispatch:

jobs:
  update-guides:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx tsx scripts/analyze-bestcases-for-guides.ts
      - run: npx tsx scripts/generate-comprehensive-guides.ts
      - run: git add .github/instructions/guides
      - run: git commit -m "chore: Update guides from bestcases"
      - run: git push
```

---

## 📊 통계

- **총 가이드**: 21개 (README 포함)
  - **수동 작성**: 14개
  - **자동 생성 (bestcase)**: 6개
- **필수 가이드**: 1개 (mandatory-api-detection)
- **분석된 bestcase**: 1,979개
- **추출된 패턴**: 17개
- **API 가이드**: 7개 (수동 6개 + 자동 1개)
- **UI 가이드**: 7개 (수동 4개 + 자동 3개)
- **페이지 패턴**: 2개 (자동 생성)
- **워크플로우**: 2개
- **에러 처리**: 1개

---

## 📖 가이드 작성 가이드

### 수동 가이드 vs 자동 가이드

#### 수동 가이드가 필요한 경우:
- ✅ 워크플로우, 프로세스 가이드
- ✅ 필수 체크리스트
- ✅ 고위험 작업 가이드
- ✅ 메타 지침 (가이드 시스템 자체)

#### 자동 가이드가 적합한 경우:
- ✅ 코드 패턴 (gRPC, Pagination 등)
- ✅ 페이지 구조 (Management, Form 등)
- ✅ 컴포넌트 사용법
- ✅ 자주 변경되는 패턴

### 구조 권장사항

1. **Executive Summary** (맨 위)
   - 핵심 체크리스트 (3-5개)
   - 무엇을, 왜 해야 하는지

2. **Quick Start** (간결한 예시)
   - 기본 패턴
   - 복사-붙여넣기 가능한 코드

3. **상세 설명** (필요 시)
   - 고급 패턴
   - 주의사항
   - 안티패턴

4. **체크리스트** (맨 아래)
   - 최종 확인 항목
   - 빠진 것 없이 검증

---

## 🔍 트러블슈팅

### 가이드가 로드되지 않아요
1. YAML frontmatter 형식 확인
2. `priority`가 숫자인지 확인 (문자열 X)
3. `id`, `scope`, `apiType`, `priority`, `summary` 필수 필드 확인

### 가이드가 너무 많이 로드돼요
1. `excludes` 필드로 충돌 가이드 명시
2. `scope`를 `project`로 좁히기
3. `priority` 낮추기

### Bestcase 패턴이 오래되었어요
1. `npx tsx scripts/analyze-bestcases-for-guides.ts` 실행
2. `npx tsx scripts/generate-comprehensive-guides.ts` 실행
3. 새로운 패턴이 반영됨

---

## 📅 최근 업데이트

- **2025.11.21**: 🆕 Bestcase 기반 동적 가이드 시스템 추가 및 정리
  - grpc-patterns-from-bestcases.md (4개 패턴)
  - pagination-patterns-from-bestcases.md (5개 패턴)
  - route-query-sync-from-bestcases.md (5개 패턴)
  - formatting-from-bestcases.md (3개 패턴)
  - management-page-pattern.md (30개 bestcase 분석)
  - form-page-pattern.md (20개 bestcase 분석)
  - 자동 재생성 스크립트 추가
  - 예시 0개인 가이드 제거 (error-handling-from-bestcases, table-headers-from-bestcases)
  - 테스트 파일 정리 (test-*.mjs, test-bestcases-results.json 삭제)
- **2025.11.18**: mandatory-api-detection 메타데이터 표준화
  - priority: critical → 200
  - apiType 추가
  - summary 추가
- **2025.11.11**: 대부분의 가이드 초기 작성
- **2025.11.10**: 워크플로우, high-risk 가이드 작성

---

## 💡 팁

1. **Bestcase-First**: 코드 작성 전에 항상 bestcase 검색
2. **패턴 재사용**: 유사한 bestcase를 찾아서 패턴 복사
3. **동적 가이드 우선**: bestcase 기반 가이드를 먼저 참고
4. **정기 업데이트**: 주기적으로 가이드 재생성
5. **품질 측정**: 생성된 코드를 sandbox에서 검증

---

**MCP Code Mode** - Pattern-Driven Development with Bestcase Intelligence

# MCP 가이드 시스템

AI 코딩 에이전트를 위한 동적 지침 시스템입니다.

## 📂 디렉토리 구조

```
guides/
├── README.md              # 이 파일
├── workflow/              # 워크플로우 가이드 (최우선)
│   ├── main-workflow.md   # 외부 프로젝트용 메인 워크플로우 (priority: 200)
│   └── core-workflow.md   # 핵심 워크플로우 파이프라인 (priority: 100)
├── high-risk.md           # 고위험 작업 전용 (priority: 200, 리스크 ≥40)
├── api/                   # API 통합 가이드
│   ├── mandatory-api-detection.md  # ⚠️ 필수: API 자동 감지 (priority: 200, mandatory: true)
│   ├── grpc-api-connection.md      # gRPC 연결 완전 레퍼런스 (priority: 95, 411줄)
│   ├── grpc-api-integration.md     # gRPC 빠른 시작 (priority: 90, 94줄)
│   ├── openapi-api-connection.md   # OpenAPI 연결 완전 레퍼런스 (priority: 95, 267줄)
│   ├── openapi-integration.md      # OpenAPI 빠른 시작 (priority: 90, 63줄)
│   └── api-validation.md           # API 메서드 검증 (priority: 90)
├── ui/                    # UI 패턴 가이드
│   ├── openerd-nuxt3-components.md  # Openerd 컴포넌트 (priority: 85)
│   ├── routing-navigation.md        # 라우팅 패턴 (priority: 80)
│   ├── pagination-pattern.md        # 페이지네이션 (priority: 75)
│   └── formatting-utilities.md      # 포맷팅 유틸 (priority: 70)
└── error/                 # 에러 처리
    └── error-handling.md  # 에러 처리 패턴 (priority: 90)
```

## 🎯 가이드 우선순위

| 우선순위 | 가이드 | 용도 |
|---------|--------|------|
| 200 | workflow.main, high-risk, mandatory-api-detection | 필수 실행 |
| 100 | core.workflow | 핵심 파이프라인 |
| 95 | {apiType}.api.connection | API 연결 레퍼런스 |
| 90 | {apiType}.api.integration, api.validation, error.handling | 구현 패턴 |
| 85 | ui.openerd.components | UI 컴포넌트 |
| 80 | nuxt.routing.navigation | 라우팅 |
| 75 | ui.pagination.usePaging | 페이지네이션 |
| 70 | utils.formatting | 유틸리티 |

## 🔑 필수 가이드 (Mandatory)

다음 가이드는 `mandatory: true` 설정으로 **항상 자동 로드**됩니다:

### mandatory-api-detection
- **목적**: API 클라이언트 자동 감지 및 하드코딩 방지
- **실행 시점**: 코드 생성 전
- **체크**: gRPC/OpenAPI 클라이언트 존재 여부, 타입 정의 확인
- **강제**: 샘플 데이터 대신 실제 API 사용 강제

## 📚 API 가이드 사용법

### gRPC 가이드 선택 가이드

#### 언제 grpc-api-connection.md를 사용하나요?
- ✅ **처음 gRPC를 프로젝트에 통합**할 때
- ✅ **MCP 도구로 Proto 타입을 찾고 검증**해야 할 때
- ✅ **완전한 체크리스트**가 필요할 때 (411줄)
- ✅ "Proto 타입 직접 사용" 원칙을 학습할 때

**특징**:
- scope: global (모든 프로젝트 공통)
- priority: 95
- 내용: MCP 도구 사용법, Proto 검색, 타입 검증, 완전한 예시

#### 언제 grpc-api-integration.md를 사용하나요?
- ✅ **이미 gRPC 설정이 완료**된 프로젝트
- ✅ **빠르게 패턴만 참조**하고 싶을 때 (94줄)
- ✅ Proto import, 기본 사용법만 필요할 때

**특징**:
- scope: project (프로젝트 특화)
- priority: 90
- 내용: Proto import, 기본 CRUD 패턴, 에러 처리 요약

### OpenAPI 가이드 선택 가이드

#### 언제 openapi-api-connection.md를 사용하나요?
- ✅ **처음 OpenAPI를 프로젝트에 통합**할 때
- ✅ **완전한 레퍼런스**가 필요할 때 (267줄)
- ✅ useAsyncData, 에러 처리, 타입 안전성을 학습할 때

#### 언제 openapi-integration.md를 사용하나요?
- ✅ **이미 OpenAPI 설정이 완료**된 프로젝트
- ✅ **빠른 참조**만 필요할 때 (63줄)

## 🔄 가이드 로딩 메커니즘

### 자동 로딩 (mandatory)
```typescript
// mandatory: true 가이드는 항상 로드됨
guides = [...mandatoryGuides, ...searchResults];
```

### 키워드 검색
```typescript
// 사용자 요청에서 키워드 추출 후 매칭
searchGuides({
  keywords: ["grpc", "api"],
  projectInfo: { apiType: "grpc" },
  maxResults: 3
});
```

### 우선순위 정렬
```typescript
// priority 높은 순서대로 정렬
guides.sort((a, b) => b.priority - a.priority);
```

## 📝 메타데이터 필드

모든 가이드는 YAML frontmatter를 포함해야 합니다:

```yaml
---
id: unique-id                    # 고유 식별자 (필수)
version: 2025.11.18              # 버전 (YYYY.MM.DD 형식)
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

### 필드 상세 설명

#### priority (우선순위)
- **200**: 최우선 (workflow, high-risk, mandatory guides)
- **100**: 핵심 워크플로우
- **90-95**: API 연결 및 필수 패턴
- **70-85**: UI 패턴 및 유틸리티

#### scope (적용 범위)
- **global**: 모든 프로젝트 공통 (예: gRPC 연결 패턴)
- **project**: 프로젝트 특화 (예: gRPC integration)
- **repo**: 저장소 특화
- **org**: 조직 특화

#### apiType (API 타입)
- **grpc**: gRPC 전용
- **openapi**: OpenAPI/REST 전용
- **any**: 모든 API 타입

## 🚀 사용 예시

### 예시 1: gRPC 프로젝트 신규 설정
```typescript
// 자동 로드되는 가이드:
// 1. mandatory-api-detection (mandatory: true)
// 2. workflow.main (priority: 200)
// 3. grpc-api-connection (apiType 매칭, priority: 95)
// 4. api.validation (priority: 90)

// 결과: 완전한 체크리스트 + Proto 검색 + 타입 검증
```

### 예시 2: 기존 gRPC 프로젝트에서 CRUD 추가
```typescript
// 자동 로드되는 가이드:
// 1. mandatory-api-detection (mandatory: true)
// 2. grpc-api-integration (빠른 참조, priority: 90)

// 결과: Proto import + CRUD 패턴만 빠르게 참조
```

### 예시 3: 고위험 작업 (리스크 ≥40)
```typescript
// 자동 로드되는 가이드:
// 1. high-risk (priority: 200)
// 2. mandatory-api-detection (mandatory: true)

// 결과: 스캐폴딩만 수행, 구현은 사용자에게 위임
```

## 📖 가이드 작성 가이드

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

### 길이 가이드라인

- **Quick Reference**: 50-100줄 (integration 파일)
- **Complete Reference**: 200-400줄 (connection 파일)
- **너무 긴 경우**: 섹션 분리 또는 별도 파일

### ⚠️ 주의사항

- **중복 방지**: 같은 내용을 여러 가이드에 반복하지 말 것
- **버전 관리**: 날짜 형식 (YYYY.MM.DD) 통일
- **summary 필수**: 검색 결과에 표시되므로 명확하게 작성
- **priority 숫자**: 문자열("critical") 사용 금지

## 🔍 트러블슈팅

### 가이드가 로드되지 않아요
1. YAML frontmatter 형식 확인
2. `priority`가 숫자인지 확인 (문자열 X)
3. `id`, `scope`, `apiType`, `priority`, `summary` 필수 필드 확인

### 가이드가 너무 많이 로드돼요
1. `excludes` 필드로 충돌 가이드 명시
2. `scope`를 `project`로 좁히기
3. `priority` 낮추기

### 필수 가이드를 추가하고 싶어요
1. `mandatory: true` 필드 추가
2. `priority: 200` 설정 권장
3. 정말 필수인지 재고 (현재 1개만 mandatory)

## 📊 통계

- **총 가이드**: 14개
- **필수 가이드**: 1개 (mandatory-api-detection)
- **API 가이드**: 6개
- **UI 가이드**: 4개
- **워크플로우**: 2개
- **에러 처리**: 1개
- **고위험**: 1개

## 📅 최근 업데이트

- **2025.11.18**: mandatory-api-detection 메타데이터 표준화
  - priority: critical → 200
  - apiType 추가
  - summary 추가
- **2025.11.11**: 대부분의 가이드 초기 작성
- **2025.11.10**: 워크플로우, high-risk 가이드 작성

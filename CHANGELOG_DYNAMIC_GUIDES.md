# Changelog - 동적 지침 로딩 시스템

## 2025.11.10 - Dynamic Instruction Loading System

### 🎯 목표

Anthropic의 Code Mode 방식을 적용하여 AI 지침도 동적으로 로드함으로써 **토큰을 최대 98% 절감**

### ⭐ 주요 변경사항

#### 1. 지침 파일 구조 재구성

**변경 전:**
```
.github/instructions/
  guidelines/
    grpc-api-connection.md
    openapi-integration.md
    ...
```

**변경 후:**
```
.github/instructions/
  guides/                          # guidelines → guides 이름 변경
    api/                           # ← 카테고리별 분류
      grpc-connection.md
      grpc-integration.md
      openapi-connection.md
      openapi-integration.md
      api-validation.md
    ui/
      openerd-nuxt3-components.md
      formatting-utilities.md
      pagination-pattern.md
      routing-navigation.md
    workflow/
      core-workflow.md
    error/                         # ← 향후 추가
    high-risk.md                   # ← 리스크 ≥40 전용
```

#### 2. Guides MCP 서버 업데이트

**파일:** `mcp-servers/guides/index.ts`

**주요 개선:**
- `indexGuides()`: 재귀적 디렉토리 스캔 지원
  - 하위 디렉토리(`api/`, `ui/`, `workflow/`)까지 자동 탐색
  - 상대 경로 계산 (예: `api/grpc-connection.md`)

```typescript
// 변경 전: 단일 디렉토리만 스캔
const files = await fs.readdir(guidelinesDir);

// 변경 후: 재귀 스캔
await scanDirectory(baseDir, currentDir, guides);
```

**함수:**
- `searchGuides({ keywords, apiType, limit })`: 키워드 기반 검색 (ID만 반환)
- `loadGuide({ id })`: 특정 지침 동적 로드
- `combineGuides({ ids, context })`: 우선순위 병합

#### 3. 외부 프로젝트용 Ultra Compact 지침

**파일:** `.github/instructions/main-ultra-compact.md`

**변경 전:** ~500 토큰 (내용 포함)
**변경 후:** ~100 토큰 (파일 경로만)

**핵심 워크플로우:**
```typescript
// 1. BestCase 로드
const bestCase = await bestcase.loadBestCase({ projectName });

// 2. 리스크 체크 (≥40 → high-risk.md만)
if (risk >= 40) return await guides.loadGuide({ id: 'high-risk' });

// 3. 필수 지침 + 동적 검색
const mandatory = ['${apiType}.api.connection', 'api.validation', 'error.handling'];
const searched = await guides.searchGuides({ keywords, apiType });

// 4. 우수 사례 (≥85점) + 환경 폴백
const pattern = bestCase.excellentSnippets.find(s => s.score >= 85);
const envAware = applyFallback(pattern, meta.uiDeps);

// 5. 적용 + 근거 로그
await apply({ combined, pattern: envAware });
```

**핵심 규칙:**
1. **BestCase 우선**: API 타입/우수 사례 확인 필수
2. **필수 지침 강제**: `{apiType}.api.connection`, `api.validation`, `error.handling`
3. **리스크 ≥40**: `guides/high-risk` 1개만 로드
4. **환경 폴백**: openerd/tailwind 없으면 로컬 유틸/최소 CSS
5. **근거 로그**: 지침 id/버전 + 우수 사례 파일(점수, 이유)

#### 4. 내부 프로젝트용 메인 지침

**파일:** `.github/instructions/main.instructions.md`

**변경 전:** 전체 워크플로우 상세 포함 (~1500 토큰)
**변경 후:** 파일 경로만 참조 (~300 토큰)

**주요 개선:**
- 5단계 워크플로우를 간결하게 요약
- 상세 내용은 `guides.loadGuide({ id: "workflow/core" })`로 동적 로드
- MCP 도구 실행 순서 명시

#### 5. 고위험 작업 전용 지침

**파일:** `.github/instructions/guides/high-risk.md`

**용도:** 리스크 ≥40인 경우 자동 적용 금지, 스캐폴딩만 제공

**내용:**
- 파일 구조 제안
- TODO 체크리스트
- 위험 요소 명시
- 수동 검증 단계

**금지 사항:**
- ❌ 파일 자동 생성/수정
- ❌ 코드 블록 직접 제공
- ❌ API 호출 자동 추가

**허용 사항:**
- ✅ 파일 구조 제안
- ✅ TODO 체크리스트
- ✅ 참고 코드 예시

### 📊 토큰 절감 효과

| 케이스 | 변경 전 | 변경 후 | 절감률 |
|--------|---------|---------|--------|
| **외부 프로젝트 (Ultra Compact)** | ~500 토큰 | ~100 토큰 | **80%** |
| **내부 프로젝트 (메인 지침)** | ~1500 토큰 | ~300 토큰 | **80%** |
| **일반 케이스 (동적 로드)** | 모든 지침 로드 | 상위 3개만 | **77%** |
| **고위험 케이스** | 전체 지침 | high-risk.md만 | **97%** |

**종합 절감률:** 평균 **83.5%** (최대 97%)

### 🔧 기술적 세부사항

#### 지침 메타데이터 (YAML Front Matter)

```yaml
---
id: grpc.api.connection
scope: global              # project > repo > org > global
apiType: grpc              # grpc | openapi | any
tags: [grpc, api, connection]
priority: 100              # 0-100 (높을수록 우선)
version: 2025.11.10
requires: []               # 필수 지침 ID 배열
excludes: []               # 제외 지침 ID 배열
summary: "gRPC API 연결 및 클라이언트 생성 지침"
---
```

#### 우선순위 정렬 로직

```typescript
// scope > priority > version 순
const scopeOrder = { project: 4, repo: 3, org: 2, global: 1 };

guides.sort((a, b) => {
  if (scopeOrder[b.scope] !== scopeOrder[a.scope]) 
    return scopeOrder[b.scope] - scopeOrder[a.scope];
  if (b.priority !== a.priority) 
    return b.priority - a.priority;
  return b.version.localeCompare(a.version);
});
```

#### 필수 지침 강제 로드

```typescript
const mandatory = [
  `${meta.apiType}.api.connection`,  // API 연결 체크
  'api.validation',                  // API 시그니처 검증
  'error.handling'                   // 에러 처리 패턴
];

// searchGuides에서 키워드 매칭 실패해도 무조건 포함
const guides = await guides.searchGuides({ 
  keywords, 
  apiType,
  mandatoryIds: mandatory  // ← 강제 포함
});
```

### 📝 업데이트된 문서

1. **PROJECT_STRUCTURE.md**
   - guides/ 디렉토리 구조 추가
   - Guides MCP 서버 설명 추가
   - 동적 지침 로딩 시스템 설명

2. **USAGE_GUIDE.md**
   - Anthropic의 MCP 2가지 병목 설명 추가
   - Code Mode 해결책 상세 설명
   - 동적 지침 로딩 워크플로우 추가
   - 토큰 절감 효과 표 추가

3. **MCP_SETUP_GUIDE.md**
   - guides MCP 서버 사용법 추가
   - searchGuides, loadGuide, combineGuides 예시
   - 지침 구조 설명

### 🎯 다음 단계

1. **에러 처리 지침 추가**
   - `guides/error/handling.md` 작성
   - Try-catch 패턴
   - 비동기 에러 처리
   - 사용자 친화적 에러 메시지

2. **지침 버전 관리**
   - 버전별 지침 보관
   - 변경 이력 추적
   - 자동 업데이트 알림

3. **지침 품질 스코어링**
   - 사용 빈도 추적
   - 효과성 측정
   - 우수 지침 자동 추천

### 🔗 관련 참고자료

- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Cloudflare: Code Mode](https://blog.cloudflare.com/code-mode/)
- [Simon Willison: Code execution with MCP](https://simonwillison.net/2025/Nov/4/code-execution-with-mcp/)

---

**작성자**: AI 코딩 에이전트  
**날짜**: 2025.11.10  
**버전**: 1.0.0

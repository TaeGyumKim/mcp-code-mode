# 코드 자동 추천 API (Code Recommendation API)

MCP Code Mode의 핵심 기능으로, 분석된 BestCase 프로젝트에서 현재 작업 중인 페이지와 유사한 코드를 자동으로 추천합니다.

## 개요

"페이지를 완성해줘"라는 요청을 받았을 때, 시스템이:

1. 현재 프로젝트의 특성(API 타입, 디자인 시스템, 프레임워크)을 분석
2. 저장된 BestCase 중 유사한 페이지를 검색
3. 관련도가 높은 코드 파일을 자동으로 추천
4. 적용 가이드를 생성

## 새로운 API 함수

### 1. `bestcase.findSimilarPages()`

유사한 페이지를 검색합니다.

```typescript
const result = await bestcase.findSimilarPages({
  category: 'list',              // 페이지 카테고리
  apiType: 'grpc',               // API 타입
  designSystem: 'openerd-nuxt3', // 디자인 시스템
  frameworks: ['vue3', 'pinia'], // 프레임워크
  tags: ['pagination'],          // 기능 태그
  minTotalScore: 70,             // 최소 품질 점수
  minMatchScore: 40,             // 최소 일치 점수
  limit: 5                       // 최대 결과 수
});

// 결과
{
  pages: [
    {
      id: 'sample-ecommerce-list-xxx',
      projectName: 'sample-ecommerce',
      category: 'list',
      description: '상품 목록 페이지',
      matchScore: 100,           // 일치도
      matchReasons: [            // 일치 이유
        '카테고리 완전 일치: list',
        'API 타입 일치: grpc',
        '디자인 시스템 일치: openerd-nuxt3'
      ],
      totalScore: 85,            // 품질 점수
      excellentIn: ['structure', 'apiConnection'],
      fileCount: 4,
      patterns: ['pagination', 'sorting'],
      apiType: 'grpc',
      designSystem: 'openerd-nuxt3'
    }
  ],
  total: 1
}
```

**일치 점수 계산:**
- 카테고리 일치: 최대 35점
- API 타입 일치: 최대 25점
- 디자인 시스템 일치: 최대 20점
- 프레임워크 일치: 최대 15점
- 태그 일치: 최대 5점
- 품질 보너스: 최대 5점

### 2. `bestcase.recommendCodeForPage()`

현재 프로젝트 분석을 기반으로 코드를 자동 추천합니다.

```typescript
const recommendation = await bestcase.recommendCodeForPage({
  category: 'list',
  apiType: 'grpc',
  designSystem: 'openerd-nuxt3',
  frameworks: ['vue3', 'pinia', 'nuxt3'],
  features: ['pagination', 'sorting', 'filtering']
});

// 결과
{
  files: [
    {
      path: 'composables/useProductList.ts',
      content: '// 실제 코드 내용...',
      purpose: 'gRPC API 연동 및 목록 상태 관리',
      sourceId: 'sample-ecommerce-list-xxx',
      sourceProject: 'sample-ecommerce',
      relevanceScore: 70,        // 관련도
      reasons: [
        '페이지 일치도: 100점',
        'composable 파일 (우선순위 2위)'
      ],
      fileCategory: 'composable'
    }
    // ... 더 많은 파일들
  ],
  sources: [
    {
      id: 'sample-ecommerce-list-xxx',
      projectName: 'sample-ecommerce',
      category: 'list',
      matchScore: 100,
      totalScore: 85,
      excellentIn: ['structure', 'apiConnection']
    }
  ],
  applicationGuide: '## list 페이지 구현 가이드\n...',
  totalFiles: 4,
  analysis: { /* 입력 분석 데이터 */ }
}
```

**파일 관련도 계산:**
- 페이지 매칭 점수: 최대 40점
- 파일 카테고리 우선순위: 최대 30점
- 기능 키워드 매칭: 최대 20점
- 파일 크기/복잡도: 최대 10점

**파일 카테고리 우선순위 (목록 페이지 기준):**
1. page
2. composable
3. component
4. api
5. type

## 사용 예시

### 완전한 워크플로우 (MCP 클라이언트)

```typescript
// 1. 현재 프로젝트 분석
const projectPath = '/projects/myapp';
const context = await metadata.extractProjectContext(projectPath);

// 2. 코드 추천 받기
const recommendation = await bestcase.recommendCodeForPage({
  category: 'list',                              // 만들고자 하는 페이지
  apiType: context.apiInfo.type,                 // 프로젝트 API 타입
  designSystem: context.designSystemInfo.detected,
  frameworks: context.frameworks,
  features: ['pagination', 'sorting', 'filtering']
});

// 3. 추천된 코드 확인
console.log(`추천 파일 수: ${recommendation.totalFiles}`);

for (const file of recommendation.files) {
  console.log(`\n[${file.relevanceScore}점] ${file.path}`);
  console.log(`목적: ${file.purpose}`);
  console.log(`카테고리: ${file.fileCategory}`);
  console.log(`코드:\n${file.content}`);
}

// 4. 적용 가이드 확인
console.log(recommendation.applicationGuide);

// 5. 실제 적용 (프로젝트에 맞게 수정)
for (const file of recommendation.files) {
  const targetPath = adaptPathToProject(file.path, projectPath);
  const adaptedContent = adaptCodeToProject(file.content, context);
  await filesystem.writeFile({ path: targetPath, content: adaptedContent });
}
```

### 간단한 검색

```typescript
// 특정 기능이 우수한 BestCase만 검색
const result = await bestcase.findSimilarPages({
  category: 'form',
  minTotalScore: 80,
  minMatchScore: 50
});

console.log(`우수한 폼 페이지: ${result.total}개`);
```

### 기존 API와 결합

```typescript
// 메타데이터 비교 + 코드 추천
const projectMeta = await analyzer.analyzeProject(path, files);
const recommendation = await bestcase.recommendCodeForPage({
  category: 'detail',
  apiType: projectMeta.apiType,
  designSystem: projectMeta.designSystem,
  frameworks: projectMeta.frameworks
});

// BestCase 비교로 추가 개선점 확인
const comparison = metadata.compareBestCase(
  projectMeta,
  recommendation.sources[0],  // 가장 유사한 BestCase
  recommendation.files
);

console.log('누락된 패턴:', comparison.missingPatterns);
console.log('TODO 항목:', comparison.todos);
```

## 지원되는 페이지 카테고리

- `list` - 목록/테이블 페이지
- `detail` - 상세 보기 페이지
- `form` - 폼/생성/수정 페이지
- `login` - 로그인/인증 페이지
- `dashboard` - 대시보드/홈 페이지
- `settings` - 설정 페이지
- `profile` - 프로필/계정 페이지

각 카테고리는 별칭도 지원합니다:
- `list` = table, grid, index, browse, search-results
- `form` = create, edit, new, update, input
- `dashboard` = home, overview, summary, main

## 적용 가이드

추천 결과에는 자동 생성된 적용 가이드가 포함됩니다:

```markdown
## list 페이지 구현 가이드

### 참고된 BestCase
1. **sample-ecommerce** (list) - 일치도 100점 | 우수: structure, apiConnection

### 추천 파일 구조

#### 컴포저블 (훅)
- **composables/useProductList.ts** (70점)
  - 목적: gRPC API 연동 및 목록 상태 관리 컴포저블
  - 이유: 페이지 일치도: 100점, composable 파일 (우선순위 2위)

#### 컴포넌트
- **pages/products/index.vue** (65점)
  - 목적: 상품 목록 페이지
  - 이유: 페이지 일치도: 100점, component 파일 (우선순위 3위)

### 적용 순서
1. **타입 정의** - 데이터 구조 먼저 정의
2. **API 연동** - 서버 통신 로직 구현
3. **컴포저블** - 비즈니스 로직 및 상태 관리
4. **컴포넌트** - UI 구성요소 생성
5. **페이지** - 전체 조립 및 라우팅

### 주의사항
- 추천 코드는 **참고용**입니다. 프로젝트에 맞게 수정하세요.
- 디자인 시스템 컴포넌트명을 현재 프로젝트에 맞게 변경하세요.
- API 엔드포인트와 타입을 실제 백엔드에 맞게 조정하세요.
```

## 성능 특성

- 모든 BestCase를 메모리에 로드하여 검색 (현재)
- 중복 파일 자동 제거 (같은 카테고리에서 최고 점수만 유지)
- 최대 15개 파일 추천 (성능 최적화)
- 관련도 30점 미만 파일 자동 필터링

## 향후 개선 계획

1. **인덱스 기반 검색** - 대규모 BestCase 지원
2. **캐싱** - 자주 사용되는 검색 결과 캐싱
3. **유사도 학습** - 실제 사용 패턴 기반 가중치 조정
4. **코드 차이점 분석** - 프로젝트에 맞는 자동 코드 변환

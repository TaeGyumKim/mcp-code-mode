# Execute Tool 워크플로 예제

Execute 도구를 활용한 실제 워크플로 예제입니다.

## 1. 기본 사용법 (RAG 자동 추천)

### 검색 페이지 구현

```json
{
  "method": "tools/call",
  "params": {
    "name": "execute",
    "arguments": {
      "code": "return context.recommendations[0].content;",
      "autoRecommend": {
        "currentFile": "<template>\n  <!-- TODO: 검색 구현 -->\n</template>",
        "filePath": "pages/users/search.vue",
        "description": "사용자 검색 페이지를 구현해 줘"
      }
    }
  }
}
```

**응답 예시:**
```json
{
  "ok": true,
  "output": "<template>...",
  "recommendations": [
    {
      "filePath": "pages/products/search.vue",
      "similarity": 0.89,
      "keywords": ["search", "pagination", "table"]
    }
  ],
  "guidesLoaded": true,
  "guidesLength": 25000,
  "projectInfo": {
    "apiType": "grpc",
    "designSystem": "element-plus"
  },
  "warnings": []
}
```

## 2. 토큰 제어 (최소 가이드)

```json
{
  "autoRecommend": {
    "currentFile": "...",
    "filePath": "pages/users/index.vue",
    "description": "목록 페이지",
    "maxGuides": 2,
    "maxGuideLength": 10000,
    "mandatoryGuideIds": []
  }
}
```

## 3. RAG 없이 직접 검색

```javascript
// execute 코드 내에서
const results = await bestcase.searchFileCases({
  keywords: ['search', 'pagination'],
  fileRole: 'page',
  minScores: { apiConnection: 40 }
});

const similar = await bestcase.findSimilarPages({
  pattern: 'search',
  minScore: 50
});

return {
  fileCases: results.results,
  similarPages: similar
};
```

## 4. 다차원 BestCase 검색

```javascript
// execute 코드 내에서 프로젝트 레벨 BestCase 검색
const projectBestCases = await bestcase.searchBestCases({
  minScore: 70,
  keywords: ['crud', 'pagination'],
  apiType: 'grpc',
  limit: 3
});

// 파일 레벨 검색
const fileCases = await bestcase.searchFileCases({
  keywords: context.extractedKeywords,
  fileRole: 'page'
});

// 유사 페이지 추천
const recommended = await bestcase.recommendCodeForPage({
  targetPattern: 'user-management',
  topK: 5
});

return {
  projects: projectBestCases,
  files: fileCases.results,
  recommended
};
```

## 5. 가이드 직접 로딩

```javascript
// execute 코드 내에서
const searchResult = await guides.searchGuides({
  keywords: ['grpc', 'list', 'pagination'],
  apiType: 'grpc',
  mandatoryIds: ['00-bestcase-priority', '10-grpc-patterns']
});

const combined = await guides.combineGuides({
  ids: searchResult.guides.map(g => g.id).slice(0, 3),
  context: {
    project: 'my-app',
    apiType: 'grpc'
  }
});

console.log('Loaded guides:', searchResult.guides.length);
return combined.combined.substring(0, 1000);
```

## 6. 프로젝트 컨텍스트 활용

```javascript
// execute 코드 내에서
const ctx = context.projectContext;

if (ctx.apiInfo.type === 'grpc') {
  console.log('gRPC 프로젝트 감지');
  // gRPC 특화 코드 생성
}

if (ctx.designSystemInfo.detected.includes('element-plus')) {
  console.log('Element Plus 사용');
  // Element Plus 컴포넌트 사용
}

// 추천 코드에서 패턴 추출
const patterns = context.recommendations
  .flatMap(r => r.analysis.patterns)
  .filter((v, i, a) => a.indexOf(v) === i);

return {
  apiType: ctx.apiInfo.type,
  designSystem: ctx.designSystemInfo.detected,
  commonPatterns: patterns
};
```

## 7. 경고 처리

```javascript
// execute 코드 내에서
if (context.warnings.length > 0) {
  console.log('Warnings:', context.warnings);

  // 임베딩 불일치 경고 확인
  const hasMismatch = context.warnings.some(w =>
    w.includes('mismatch')
  );

  if (hasMismatch) {
    console.log('⚠️ 임베딩 모델 불일치 감지!');
    console.log('FORCE_REANALYZE=true yarn scan 실행 권장');
  }
}

return {
  hasWarnings: context.warnings.length > 0,
  warnings: context.warnings
};
```

## 8. 메타데이터 기반 자동 가이드

```javascript
// execute 코드 내에서 (수동 가이드 로딩)
const projectMeta = await metadata.extractProjectContext('/projects/my-app');

const guideResult = await metadata.loadGuides(projectMeta, {
  apiType: projectMeta.apiInfo.type,
  designSystem: projectMeta.designSystemInfo.detected[0],
  mandatoryIds: ['00-bestcase-priority']
});

console.log('Keywords used:', guideResult.keywords);
console.log('Guides loaded:', guideResult.guides.length);

return guideResult.combined;
```

## 9. 완전한 페이지 생성 워크플로

```javascript
// execute 코드 내에서
const refs = context.recommendations;
const guides = context.guides;
const proj = context.projectContext;

if (refs.length === 0) {
  return { error: 'No reference code found' };
}

// 1. 참조 코드에서 패턴 추출
const bestRef = refs[0];
const patterns = bestRef.analysis.patterns;
const components = bestRef.analysis.componentsUsed;

// 2. API 메서드 확인
const apiMethods = bestRef.analysis.apiMethods;
const hasGrpc = apiMethods.some(m => m.includes('grpc'));

// 3. 결과 조합
return {
  referenceFile: bestRef.filePath,
  patterns,
  components,
  apiType: hasGrpc ? 'grpc' : 'rest',
  guideAvailable: context.hasGuides,
  projectContext: proj ? {
    apiType: proj.apiInfo.type,
    designSystem: proj.designSystemInfo.detected
  } : null,
  template: `
// 패턴: ${patterns.join(', ')}
// 컴포넌트: ${components.join(', ')}
// API: ${apiMethods.join(', ')}

<template>
  <!-- Reference: ${bestRef.filePath} -->
  ${bestRef.content.substring(0, 500)}...
</template>
  `.trim()
};
```

## 10. 스킵 옵션 활용

### 빠른 추천만 (가이드/컨텍스트 스킵)

```json
{
  "autoRecommend": {
    "currentFile": "...",
    "filePath": "pages/test.vue",
    "description": "테스트",
    "skipGuideLoading": true,
    "skipProjectContext": true
  }
}
```

### 프로젝트 컨텍스트만 필요

```json
{
  "autoRecommend": {
    "currentFile": "...",
    "filePath": "pages/test.vue",
    "description": "테스트",
    "skipGuideLoading": true
  }
}
```

## 환경 설정 체크리스트

### 1. Ollama 설치 및 모델 다운로드

```bash
# Ollama 설치
curl -fsSL https://ollama.com/install.sh | sh

# 임베딩 모델 다운로드 (필수)
ollama pull nomic-embed-text

# 코드 분석 모델 다운로드 (선택)
ollama pull qwen2.5-coder:7b
```

### 2. 환경 변수 설정

```bash
# .env 파일
HOST_PROJECTS_PATH=/path/to/projects
PROJECTS_PATH=/projects
OLLAMA_URL=http://ollama:11434
EMBEDDING_MODEL=nomic-embed-text
GENERATE_EMBEDDINGS=true
LLM_MODEL=qwen2.5-coder:7b
```

### 3. 초기 스캔 실행

```bash
# FileCase 생성
yarn scan

# 또는 강제 재분석
FORCE_REANALYZE=true yarn scan
```

### 4. Docker 시작

```bash
docker-compose -f docker-compose.ai.yml up -d
```

## 문제 해결

### Ollama 연결 실패

```json
{
  "warnings": [
    "Ollama server not available at http://ollama:11434. Ensure Ollama is running and OLLAMA_URL is correctly set."
  ]
}
```

**해결:**
1. Ollama 서비스 실행 확인: `ollama list`
2. OLLAMA_URL 환경 변수 확인
3. 방화벽/네트워크 설정 확인

### 임베딩 모델 불일치

```json
{
  "warnings": [
    "Embedding model mismatch detected 5 times. Some FileCases may have been generated with a different embedding model."
  ]
}
```

**해결:**
```bash
FORCE_REANALYZE=true yarn scan
```

### 추천 결과 없음

```json
{
  "recommendations": [],
  "warnings": [
    "No recommendations found, skipping guide loading"
  ]
}
```

**해결:**
1. FileCase가 생성되었는지 확인: `ls /projects/.bestcases/`
2. 키워드가 올바른지 확인
3. `yarn scan` 실행하여 FileCase 생성

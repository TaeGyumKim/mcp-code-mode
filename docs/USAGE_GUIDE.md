# BestCase Code Mode - 사용 가이드

## 🎯 프로젝트 개요

이 프로젝트는 **Anthropic의 Code Execution with MCP**와 **Cloudflare의 Code Mode** 개념을 구현하여:
1. 로컬 프로젝트 파일(`D:\01.Work\01.Projects`)에 접근
2. 프로젝트별 BestCase를 저장
3. **동적 지침 로딩 시스템**으로 필요한 지침만 런타임에 로드
4. LLM이 TypeScript 코드로 작업을 수행하여 **토큰을 98% 절감**

## 🔑 핵심 개념

### 기존 MCP 방식의 문제점 (2가지)

#### 1. 도구 정의가 컨텍스트 잡아먹음
```
모든 도구 설명을 처음부터 로드
→ 수천 개 도구 × 상세 설명 = 수십만 토큰
→ 사용자 요청 읽기도 전에 컨텍스트 고갈 💸
```

#### 2. 중간 결과가 모델을 계속 왕복
```
사용자: "구글 드라이브에서 회의록 다운로드해서 Salesforce에 첨부해줘"
→ LLM: 도구 호출 (드라이브에서 문서 가져오기)
→ 50,000 토큰의 회의록이 LLM 컨텍스트로 전송
→ LLM: 분석 후 또 다른 도구 호출 (Salesforce 업데이트)
→ 또 50,000 토큰이 파라미터에 복사됨
총 100,000+ 토큰 소비 💸
```

### Code Mode 방식 (Anthropic 제안)

#### 1. 도구를 파일시스템의 코드로 변환
```
servers/
├── google-drive/
│   ├── getDocument.ts
│   └── index.ts
├── salesforce/
│   ├── updateRecord.ts
│   └── index.ts
```

#### 2. 필요한 도구만 동적 로드 + 데이터는 코드에서만 처리
```
사용자: "구글 드라이브에서 회의록 다운로드해서 Salesforce에 첨부해줘"
→ LLM: TypeScript 코드 생성 (2,000 토큰)
→ 샌드박스에서 코드 실행:
   const transcript = (await gdrive.getDocument({ documentId: 'abc' })).content;
   await salesforce.updateRecord({
     recordId: '00Q5f',
     data: { Notes: transcript }
   });
   // 회의록은 변수에만 존재, LLM 컨텍스트 우회!
→ LLM: 최종 결과만 확인 (100 토큰)
총 2,100 토큰 소비 ✨ (98% 절감!)
```

## ⭐ 동적 지침 로딩 시스템 (2025.11.10 추가)

### 기존 문제: 지침도 토큰을 잡아먹음

```
기존 방식: 모든 지침을 항상 메모리에 로드
→ 워크플로우 상세 설명 (~1500 토큰)
→ API 연동 가이드 (~800 토큰)
→ UI 컴포넌트 사용법 (~600 토큰)
총 2,900 토큰이 항상 컨텍스트에 존재
```

### 해결책: 지침을 파일시스템으로 분리

```
.github/instructions/
  guides/
    api/grpc-connection.md       # 필요할 때만 로드
    ui/pagination.md             # 필요할 때만 로드
    workflow/core.md             # 필요할 때만 로드
    high-risk.md                 # 리스크 ≥40일 때만
```

### 워크플로우

```typescript
// 1. BestCase 로드
const bestCase = await bestcase.loadBestCase({ projectName: 'my-app' });

// 2. 리스크 분석
const { risk, keywords } = await analyzeMeta(userRequest, bestCase);
if (risk >= 40) {
  // 고위험: high-risk.md 1개만 로드 (~50 토큰)
  return await guides.loadGuide({ id: 'high-risk' });
}

// 3. 필수 지침 + 동적 검색 (상위 3개만)
const mandatory = ['grpc.api.connection', 'api.validation', 'error.handling'];
const searched = await guides.searchGuides({ keywords, apiType: 'grpc' });
const top3 = searched.slice(0, 3).map(g => g.id);

// 4. 필요한 시점에만 개별 로드
const combined = await guides.combineGuides({ 
  ids: [...mandatory, ...top3] 
});
// → 총 ~350 토큰 (기존 1500 → 77% 절감!)
```

### 토큰 절감 효과

| 케이스 | 기존 | 동적 로딩 | 절감률 |
|--------|------|----------|--------|
| **일반 케이스** | 1500 토큰 | 350 토큰 | **77%** |
| **고위험 케이스** | 1500 토큰 | 50 토큰 | **97%** |
| **외부 프로젝트** | 500 토큰 | 100 토큰 | **80%** |

## 📁 프로젝트 구조

```
mcp-code-mode-starter/
├── packages/
│   ├── bestcase-db/          # BestCase 저장소
│   ├── ai-bindings/           # MCP 도구 통합
│   └── ai-runner/             # TypeScript 샌드박스
├── mcp-servers/               # MCP → TypeScript 변환
│   ├── filesystem/            # 파일 시스템 도구들
│   │   ├── readFile.ts
│   │   ├── writeFile.ts
│   │   └── searchFiles.ts
│   └── bestcase/              # BestCase 도구들
│       ├── saveBestCase.ts
│       └── loadBestCase.ts
└── apps/web/                  # Nuxt3 웹 인터페이스
```

## 🚀 사용 방법

### 1. BestCase 저장 예시

LLM에게 다음과 같이 요청:
```
"D:/01.Work/01.Projects/my-nuxt-app 프로젝트의 구조를 BestCase로 저장해줘"
```

LLM이 생성하는 코드:
```typescript
// 프로젝트 파일 검색
const projectFiles = await filesystem.searchFiles({
  path: 'D:/01.Work/01.Projects/my-nuxt-app',
  pattern: '*',
  recursive: true
});

// 주요 설정 파일 읽기
const nuxtConfig = await filesystem.readFile({
  path: 'D:/01.Work/01.Projects/my-nuxt-app/nuxt.config.ts'
});

const packageJson = await filesystem.readFile({
  path: 'D:/01.Work/01.Projects/my-nuxt-app/package.json'
});

// BestCase 저장
const result = await bestcase.saveBestCase({
  projectName: 'my-nuxt-app',
  category: 'nuxt3-setup',
  description: 'Nuxt3 프로젝트 표준 구조',
  files: [
    {
      path: 'nuxt.config.ts',
      content: nuxtConfig.content,
      purpose: 'Nuxt 설정 파일'
    },
    {
      path: 'package.json',
      content: packageJson.content,
      purpose: '의존성 관리'
    }
  ],
  patterns: {
    structure: projectFiles.files.map(f => f.path),
    conventions: {
      componentDir: 'components',
      pageDir: 'pages',
      apiDir: 'server/api'
    }
  },
  tags: ['nuxt3', 'typescript', 'vue']
});

console.log(`BestCase 저장 완료: ${result.id}`);
```

**중요**: 파일 내용은 LLM 컨텍스트를 거치지 않고 코드에서만 처리됨!

### 2. BestCase 활용하여 새 프로젝트 생성

LLM에게 요청:
```
"my-nuxt-app과 같은 구조로 새 프로젝트를 D:/01.Work/01.Projects/another-app에 생성해줘"
```

LLM이 생성하는 코드:
```typescript
// BestCase 로드
const bestCaseResult = await bestcase.loadBestCase({
  projectName: 'my-nuxt-app',
  category: 'nuxt3-setup'
});

const bc = bestCaseResult.bestCase;
if (!bc) {
  console.log('BestCase를 찾을 수 없습니다');
  return;
}

// 새 프로젝트 경로
const newProjectPath = 'D:/01.Work/01.Projects/another-app';

// BestCase의 파일들을 새 프로젝트에 복사
for (const file of bc.files) {
  const newFilePath = `${newProjectPath}/${file.path}`;
  
  // 프로젝트 이름 교체 등 커스터마이징
  let content = file.content;
  content = content.replace(/my-nuxt-app/g, 'another-app');
  
  await filesystem.writeFile({
    path: newFilePath,
    content: content
  });
  
  console.log(`생성: ${newFilePath}`);
}

console.log('프로젝트 생성 완료!');
```

### 3. 프로젝트 분석 및 리포트

```
"D:/01.Work/01.Projects의 모든 프로젝트를 분석하고 통계를 내줘"
```

```typescript
const projectsPath = 'D:/01.Work/01.Projects';

// 모든 프로젝트 디렉토리 찾기
const items = await filesystem.searchFiles({
  path: projectsPath,
  recursive: false
});

const stats = {
  totalProjects: 0,
  byTech: {} as Record<string, number>,
  totalFiles: 0
};

for (const item of items.files) {
  if (!item.isDirectory) continue;
  
  stats.totalProjects++;
  
  // package.json 확인
  try {
    const pkg = await filesystem.readFile({
      path: `${item.path}/package.json`
    });
    
    const pkgData = JSON.parse(pkg.content);
    
    // 기술 스택 파악
    const deps = Object.keys(pkgData.dependencies || {});
    if (deps.includes('nuxt')) {
      stats.byTech['Nuxt'] = (stats.byTech['Nuxt'] || 0) + 1;
    }
    if (deps.includes('react')) {
      stats.byTech['React'] = (stats.byTech['React'] || 0) + 1;
    }
    
    // 파일 개수
    const files = await filesystem.searchFiles({
      path: item.path,
      recursive: true
    });
    stats.totalFiles += files.files.length;
    
  } catch (e) {
    // package.json 없는 프로젝트
  }
}

console.log(JSON.stringify(stats, null, 2));
```

**결과**: 수백 개의 파일 내용이 LLM을 거치지 않고, 최종 통계만 전달!

## 💡 토큰 절감 비교

### 시나리오: "프로젝트 100개 파일 분석 후 리포트 생성"

#### 기존 MCP 방식:
- 파일 100개 읽기: 100 × 5,000 토큰 = 500,000 토큰
- 각 파일 분석 컨텍스트: 500,000 토큰
- 리포트 생성: 10,000 토큰
- **총 1,010,000 토큰** 💸💸💸

#### Code Mode 방식:
- 코드 생성: 2,000 토큰
- 코드 실행: 0 토큰 (컨텍스트 우회)
- 최종 리포트: 500 토큰
- **총 2,500 토큰** ✨✨✨

**절감율: 99.75%**

## 🔧 API 사용

### Filesystem API

```typescript
// 파일 읽기
await filesystem.readFile({ path: '...' });

// 파일 쓰기
await filesystem.writeFile({ path: '...', content: '...' });

// 파일 검색
await filesystem.searchFiles({ 
  path: '...', 
  pattern: '*.ts',
  recursive: true 
});
```

### BestCase API

```typescript
// 저장
await bestcase.saveBestCase({
  projectName: '...',
  category: '...',
  description: '...',
  files: [...],
  tags: [...]
});

// 로드
await bestcase.loadBestCase({
  projectName: '...',
  category: '...'
});
```

## 🛡️ 보안

- **샌드박스 실행**: vm2를 사용하여 안전한 코드 실행
- **파일 접근 제한**: `D:\01.Work\01.Projects` 경로로 제한 가능
- **타임아웃**: 기본 30초 제한

## 📊 BestCase 저장 위치

기본 저장 경로: `D:\01.Work\01.Projects\.bestcases\`

각 BestCase는 JSON 파일로 저장:
```
.bestcases/
├── my-nuxt-app-nuxt3-setup-1699000000000.json
├── my-api-express-setup-1699000001000.json
└── ...
```

## 🎓 학습 및 개선

프로젝트를 사용하면서:
1. 자주 사용하는 패턴을 BestCase로 저장
2. LLM이 BestCase를 활용하여 일관된 코드 생성
3. 토큰 비용 절감 + 품질 향상

## 다음 단계

1. [x] 기본 파일시스템 도구
2. [x] BestCase 저장소
3. [x] TypeScript 샌드박스
4. [ ] Nuxt 웹 UI 개선
5. [ ] 벡터 검색 (유사 BestCase 찾기)
6. [ ] 자동 BestCase 업데이트
7. [ ] Skills 통합

---

**참고 자료**:
- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Cloudflare: Code Mode](https://blog.cloudflare.com/code-mode/)
- [Simon Willison's Analysis](https://simonwillison.net/2025/Nov/4/code-execution-with-mcp/)

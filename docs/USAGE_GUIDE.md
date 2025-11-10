# BestCase Code Mode - 사용 가이드

## 🎯 프로젝트 개요

이 프로젝트는 **Anthropic의 Code Execution with MCP**와 **Cloudflare의 Code Mode** 개념을 구현하여:
1. 로컬 프로젝트 파일(`D:\01.Work\01.Projects`)에 접근
2. 프로젝트별 BestCase를 저장
3. LLM이 TypeScript 코드로 작업을 수행하여 **토큰을 98% 절감**

## 🔑 핵심 개념

### 기존 MCP 방식의 문제점
```
사용자: "프로젝트 파일 읽어서 분석해줘"
→ LLM: 도구 호출 (파일 읽기)
→ 50,000 토큰의 파일 내용이 LLM 컨텍스트로 전송
→ LLM: 분석 후 또 다른 도구 호출
→ 또 50,000 토큰이 컨텍스트를 통과
총 100,000+ 토큰 소비 💸
```

### Code Mode 방식
```
사용자: "프로젝트 파일 읽어서 분석해줘"
→ LLM: TypeScript 코드 생성 (2,000 토큰)
→ 샌드박스에서 코드 실행:
   - 파일 읽기 (컨텍스트 우회)
   - 데이터 처리 (컨텍스트 우회)
   - 결과만 로그 출력
→ LLM: 최종 결과만 확인 (100 토큰)
총 2,100 토큰 소비 ✨ (98% 절감!)
```

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

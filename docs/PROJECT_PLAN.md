# BestCase Code Mode Project

## 목적
로컬 프로젝트 파일(D:\01.Work\01.Projects)에 접근하여 BestCase를 저장하고,
LLM 작업 요청 시 TypeScript 스크립트로 호출하여 토큰을 최소화하며 코드를 자동 생성

## 아키텍처

```
mcp-code-mode-starter/
├── apps/
│   └── web/                    # Nuxt3 웹 인터페이스
│       ├── server/api/
│       │   ├── agent/execute.post.ts    # 코드 실행 엔드포인트
│       │   └── bestcase/                # BestCase 관리 API
│       └── pages/              # UI
├── packages/
│   ├── ai-bindings/            # MCP 도구 → TypeScript API 변환
│   │   └── src/
│   │       ├── filesystem/     # 파일시스템 접근
│   │       ├── bestcase/       # BestCase 저장소
│   │       └── search/         # 프로젝트 검색
│   ├── ai-runner/              # TypeScript 샌드박스 실행
│   │   └── src/
│   │       ├── sandbox.ts      # 안전한 코드 실행 환경
│   │       └── agentRunner.ts  # 에이전트 러너
│   └── bestcase-db/            # BestCase 데이터베이스
│       └── src/
│           ├── storage.ts      # 파일 기반 저장소
│           └── indexer.ts      # 벡터 검색 (옵션)
└── mcp-servers/                # MCP → TypeScript 변환 결과
    ├── filesystem/
    │   ├── readFile.ts
    │   ├── writeFile.ts
    │   └── searchFiles.ts
    └── bestcase/
        ├── saveBestCase.ts
        ├── loadBestCase.ts
        └── searchBestCases.ts
```

## 핵심 기능

### 1. MCP 도구를 TypeScript 파일로 변환
```typescript
// mcp-servers/filesystem/readFile.ts
interface ReadFileInput {
  path: string;
}
interface ReadFileOutput {
  content: string;
}
export async function readFile(input: ReadFileInput): Promise<ReadFileOutput> {
  return callMCPTool('filesystem__read_file', input);
}
```

### 2. BestCase 저장 및 검색
- 프로젝트별 모범 사례 저장
- 파일 구조, 설정, 코딩 패턴 등 기록
- LLM이 필요할 때만 로드

### 3. 토큰 최적화
- 150,000 토큰 → 2,000 토큰 (98% 절감)
- 중간 데이터는 코드 실행 환경에서만 처리
- 최종 결과만 LLM에 전달

### 4. 자동 코드 생성
```typescript
// LLM이 생성하는 코드 예시
const projectFiles = await filesystem.searchFiles({ 
  path: 'D:/01.Work/01.Projects/myapp',
  pattern: '*.ts'
});

const bestCase = await bestcase.loadBestCase({
  projectName: 'myapp',
  category: 'typescript-config'
});

// 중간 데이터는 LLM 컨텍스트를 거치지 않음
const newCode = generateCode(projectFiles, bestCase);
await filesystem.writeFile({
  path: 'D:/01.Work/01.Projects/myapp/newFile.ts',
  content: newCode
});

console.log('Generated file successfully');
```

## 사용 시나리오

1. **사용자**: "myapp 프로젝트의 BestCase를 저장해줘"
2. **에이전트**: TypeScript 코드 생성 및 실행
   - 프로젝트 파일 분석
   - 구조, 패턴, 설정 추출
   - BestCase DB에 저장
3. **결과**: 토큰 사용 최소화 (전체 파일 내용은 컨텍스트에 없음)

---

1. **사용자**: "다른 프로젝트에 myapp과 같은 구조로 코드 생성해줘"
2. **에이전트**: TypeScript 코드 생성 및 실행
   - BestCase 로드
   - 템플릿 적용
   - 새 파일 생성
3. **결과**: 빠른 실행, 낮은 비용

## 기술 스택

- **런타임**: Node.js + TypeScript
- **웹**: Nuxt3 + h3
- **샌드박스**: VM2 or isolated-vm
- **저장소**: JSON 파일 or SQLite
- **MCP**: @modelcontextprotocol/sdk
- **워크스페이스**: Yarn 4.9.1

## 다음 단계

1. 파일시스템 MCP 서버 구현
2. BestCase 저장소 구현
3. TypeScript 샌드박스 환경 설정
4. MCP → TypeScript 변환기 구현
5. Nuxt API 엔드포인트 통합

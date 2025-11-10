# AI 기반 코드 품질 분석 시스템

## 문제점 분석

### 현재 시스템의 한계

1. **단순 키워드 매칭**: `hasOpenApi`, `hasGrpc` 등 패키지 존재만 확인
2. **실제 사용 품질 미측정**: API가 잘 연결되어 있는지, v-model 바인딩이 적절한지 판단 불가
3. **우수 코드 발견 불가**: 전체 점수는 낮아도 특정 부분이 뛰어난 경우 식별 불가

### 필요한 분석

1. **API 연결 품질**
   - OpenAPI: composables에서 타입 안전하게 사용하는지
   - gRPC: interceptor, error handling 제대로 구현했는지
   - REST: axios instance 설정, retry 로직 존재하는지

2. **컴포넌트 바인딩 품질**
   - `v-model` 사용 시 script에서 적절히 처리하는지
   - CommonToFromPicker + dateTerm → watch, computed 로직 확인
   - Props 타입 정의, emit 이벤트 핸들링 체크

3. **부분 코드 우수성**
   - 파일 단위로 품질 점수 부여
   - 우수 사례 자동 추출
   - 패턴별 BestCase 생성

## 해결 방안: LLM 기반 분석

### 1. Ollama 로컬 LLM 활용

**장점:**
- ✅ 무료, 오프라인 동작
- ✅ 코드 유출 없음 (보안)
- ✅ Docker 컨테이너로 간편 배포
- ✅ API 호출 제한 없음

**모델 선택:**
- `deepseek-coder:6.7b` - 코드 분석 특화
- `codellama:7b` - Meta의 코드 LLM
- `qwen2.5-coder:7b` - 최신 코드 모델

### 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   MCP Server     │────────>│  Ollama Server   │          │
│  │  (Node.js)       │  HTTP   │  (LLM Runtime)   │          │
│  │                  │<────────│                  │          │
│  └──────────────────┘         └──────────────────┘          │
│         │                              │                     │
│         │                              │                     │
│         v                              v                     │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  BestCase DB     │         │  Model Storage   │          │
│  │  (.bestcases/)   │         │  (qwen2.5-coder) │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3. 분석 프롬프트 설계

#### API 연결 품질 분석

```typescript
// 프롬프트 예시
const apiAnalysisPrompt = `
You are a senior Vue.js/Nuxt3 code reviewer.

Analyze this composable file and score API integration quality (0-100):

File: ${filePath}
\`\`\`typescript
${fileContent}
\`\`\`

Scoring criteria:
1. Type Safety (0-30 points)
   - Proper TypeScript interfaces
   - Generic types usage
   - Request/Response type definitions

2. Error Handling (0-30 points)
   - Try-catch blocks
   - Error interceptors
   - User-friendly error messages

3. Best Practices (0-40 points)
   - Loading state management
   - Request cancellation
   - Retry logic
   - Authentication handling

Respond in JSON format:
{
  "score": 85,
  "breakdown": {
    "typeSafety": 28,
    "errorHandling": 25,
    "bestPractices": 32
  },
  "strengths": ["Excellent type definitions", "Comprehensive error handling"],
  "weaknesses": ["Missing request cancellation"],
  "excellentCode": "lines 45-67 (error interceptor implementation)",
  "recommendations": ["Add AbortController for cancellation"]
}
`;
```

#### 컴포넌트 바인딩 품질 분석

```typescript
const componentAnalysisPrompt = `
Analyze this Vue component's v-model and data binding quality (0-100):

Template:
\`\`\`vue
${templateContent}
\`\`\`

Script:
\`\`\`typescript
${scriptContent}
\`\`\`

Check:
1. v-model usage (0-30 points)
   - Proper ref/reactive declarations
   - Two-way binding correctness
   - Type safety

2. Event handling (0-30 points)
   - Watch/computed for v-model changes
   - Proper event emitters
   - Side effect handling

3. Component integration (0-40 points)
   - Props typing
   - openerd-nuxt3 components usage
   - Data flow clarity

Respond in JSON format:
{
  "score": 75,
  "vModelBindings": [
    {
      "name": "dateTerm",
      "component": "CommonToFromPicker",
      "quality": 80,
      "hasWatch": true,
      "hasValidation": false,
      "recommendation": "Add date validation"
    }
  ],
  "excellentPatterns": ["watch usage for dateTerm", "proper ref initialization"],
  "issues": ["Missing validation for date range"]
}
`;
```

#### 부분 코드 우수성 발견

```typescript
const excellenceDetectionPrompt = `
Find excellent code patterns in this file that can serve as BestCase examples:

\`\`\`typescript
${fileContent}
\`\`\`

Look for:
- Exceptionally clean code
- Innovative solutions
- Perfect implementations
- Reusable patterns

Extract top 3 code snippets with:
{
  "excellentSnippets": [
    {
      "lines": "45-67",
      "category": "error-handling",
      "score": 95,
      "reason": "Comprehensive error interceptor with retry logic",
      "code": "...",
      "usageContext": "When implementing gRPC error handling"
    }
  ]
}
`;
```

### 4. 구현 계획

#### Phase 1: Ollama 통합 (1-2일)

1. **docker-compose.yml 수정**
```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama-code-analyzer
    volumes:
      - ollama-models:/root/.ollama
    ports:
      - "11434:11434"
    restart: unless-stopped
    
  mcp-code-mode:
    depends_on:
      - ollama
    environment:
      - OLLAMA_URL=http://ollama:11434

volumes:
  ollama-models:
```

2. **모델 다운로드 스크립트**
```bash
# init-ollama.sh
docker exec ollama-code-analyzer ollama pull qwen2.5-coder:7b
docker exec ollama-code-analyzer ollama pull deepseek-coder:6.7b
```

#### Phase 2: LLM 클라이언트 구현 (2-3일)

```typescript
// packages/llm-analyzer/src/ollamaClient.ts
export class OllamaClient {
  private baseUrl: string;
  
  async analyze(prompt: string, model: string = 'qwen2.5-coder:7b') {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json'
      })
    });
    
    return response.json();
  }
}
```

#### Phase 3: 분석 파이프라인 (3-4일)

```typescript
// packages/llm-analyzer/src/codeAnalyzer.ts
export class CodeAnalyzer {
  async analyzeFile(filePath: string, content: string) {
    const fileType = this.detectFileType(filePath);
    
    switch(fileType) {
      case 'composable':
        return this.analyzeComposable(content);
      case 'component':
        return this.analyzeComponent(content);
      case 'api':
        return this.analyzeAPI(content);
    }
  }
  
  async analyzeComposable(content: string) {
    const prompt = this.buildAPIAnalysisPrompt(content);
    const result = await this.llm.analyze(prompt);
    return this.parseAPIAnalysisResult(result);
  }
  
  async analyzeComponent(content: string) {
    const { template, script } = this.parseVueFile(content);
    const prompt = this.buildComponentAnalysisPrompt(template, script);
    const result = await this.llm.analyze(prompt);
    return this.parseComponentAnalysisResult(result);
  }
}
```

#### Phase 4: BestCase 자동 생성 (2-3일)

```typescript
// auto-scan-ai-powered.js
async function scanWithAI(project) {
  const analyzer = new CodeAnalyzer();
  const results = [];
  
  // 1. 전체 파일 분석
  for (const file of project.files) {
    const analysis = await analyzer.analyzeFile(file.path, file.content);
    results.push(analysis);
  }
  
  // 2. 우수 코드 추출
  const excellentSnippets = results
    .flatMap(r => r.excellentSnippets || [])
    .filter(s => s.score >= 90)
    .sort((a, b) => b.score - a.score);
  
  // 3. 카테고리별 BestCase 생성
  const bestCasesByCategory = groupBy(excellentSnippets, 'category');
  
  for (const [category, snippets] of Object.entries(bestCasesByCategory)) {
    await bestcase.saveBestCase({
      projectName: project.name,
      category: `excellent-${category}`,
      description: `Excellent ${category} patterns from ${project.name}`,
      files: snippets.map(s => ({
        path: s.filePath,
        content: s.code,
        purpose: s.reason,
        score: s.score
      })),
      patterns: {
        aiAnalysis: {
          overallScore: calculateAverage(snippets.map(s => s.score)),
          topPatterns: snippets.slice(0, 5)
        }
      }
    });
  }
}
```

### 5. 스코어링 체계 재설계

```typescript
interface AICodeScore {
  // 프로젝트 전체 점수
  overall: {
    total: number;           // 0-100
    apiQuality: number;      // 0-100
    componentQuality: number; // 0-100
    codeExcellence: number;  // 0-100
  };
  
  // API 타입별 세부 점수
  apiScores: {
    openapi?: {
      score: number;
      typeSafety: number;
      errorHandling: number;
      bestPractices: number;
      excellentFiles: string[];
    };
    grpc?: { /* 동일 구조 */ };
    rest?: { /* 동일 구조 */ };
  };
  
  // 컴포넌트별 세부 점수
  componentScores: {
    [componentName: string]: {
      score: number;
      vModelQuality: number;
      eventHandling: number;
      typeDefinitions: number;
      excellentUsages: Array<{
        filePath: string;
        lines: string;
        score: number;
        reason: string;
      }>;
    };
  };
  
  // 우수 코드 스니펫
  excellentSnippets: Array<{
    category: string;
    filePath: string;
    lines: string;
    score: number;
    code: string;
    reason: string;
    reusable: boolean;
  }>;
  
  // 등급
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  tierByCategory: {
    api: string;
    component: string;
    patterns: string;
  };
}
```

### 6. 대안: OpenAI/Claude API 사용

Ollama가 부담스럽다면:

```typescript
// packages/llm-analyzer/src/openaiClient.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeAnalyzer {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async analyzeCode(prompt: string) {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    return JSON.parse(response.content[0].text);
  }
}
```

**환경 변수 설정:**
```env
# .env
LLM_PROVIDER=ollama  # or openai, anthropic
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
OLLAMA_URL=http://ollama:11434
```

### 7. 성능 최적화

1. **병렬 처리**: 여러 파일 동시 분석
2. **캐싱**: 변경되지 않은 파일은 재분석 스킵
3. **배치 처리**: 여러 파일을 하나의 프롬프트로
4. **선택적 분석**: 중요 파일만 AI 분석 (composables, components)

```typescript
async function smartScan(project) {
  // 1. 빠른 키워드 스캔으로 필터링
  const importantFiles = await quickFilter(project.files);
  
  // 2. AI 분석은 중요 파일만
  const aiResults = await Promise.all(
    importantFiles.map(file => analyzer.analyzeFile(file))
  );
  
  // 3. 캐시 활용
  const cached = await cache.get(project.name);
  const changed = findChangedFiles(project, cached);
  
  // 4. 변경된 파일만 재분석
  const updates = await analyzeChanged(changed);
}
```

## 예상 타임라인

- **Week 1**: Ollama Docker 통합, 기본 클라이언트 구현
- **Week 2**: 프롬프트 엔지니어링, 분석 파이프라인
- **Week 3**: BestCase 자동 생성, 우수 코드 추출
- **Week 4**: 성능 최적화, 테스트, 문서화

## 다음 단계

어떤 방향으로 진행할까요?

1. **Ollama 로컬 LLM** - 무료, 보안, 무제한
2. **Claude API** - 빠르고 정확, 비용 발생
3. **하이브리드** - 기본 분석은 Ollama, 정밀 분석은 Claude

추천: **Ollama로 시작 → 나중에 Claude 추가**

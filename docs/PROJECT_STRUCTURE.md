# Project Structure

```
mcp-code-mode-starter/
├── .github/                        # GitHub workflows and templates
│   ├── instructions/               # ⭐ AI 코딩 에이전트 지침 (Dynamic Loading)
│   │   ├── guides/                 # 동적 로드 가능한 지침 파일들
│   │   │   ├── api/                # API 연동 지침
│   │   │   │   ├── grpc-connection.md
│   │   │   │   ├── grpc-integration.md
│   │   │   │   ├── openapi-connection.md
│   │   │   │   ├── openapi-integration.md
│   │   │   │   └── api-validation.md
│   │   │   ├── ui/                 # UI 컴포넌트 지침
│   │   │   │   ├── openerd-nuxt3-components.md
│   │   │   │   ├── formatting-utilities.md
│   │   │   │   ├── pagination-pattern.md
│   │   │   │   └── routing-navigation.md
│   │   │   ├── workflow/           # 워크플로우 지침
│   │   │   │   └── core-workflow.md
│   │   │   ├── error/              # 에러 처리 (향후 추가)
│   │   │   └── high-risk.md        # 리스크 ≥40 전용 (스캐폴딩)
│   │   ├── main.instructions.md    # 내부 프로젝트용 메인 지침
│   │   ├── main-ultra-compact.md   # ⭐ 외부 프로젝트용 (77% 토큰 절감)
│   │   ├── default.instructions.md # 기본 지침
│   │   ├── bestcase-usage.md       # BestCase 활용 가이드
│   │   └── 00-bestcase-priority.md # 우선순위 규칙
│   ├── ISSUE_TEMPLATE/             # Issue templates
│   ├── workflows/                  # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md
├── apps/
│   └── web/                        # Nuxt3 web application
├── docs/                           # Documentation
│   ├── AI_*.md                     # AI-related documentation
│   ├── *_GUIDE.md                  # Setup guides
│   └── *_SUMMARY.md                # Implementation summaries
├── mcp-servers/                    # MCP server implementations
│   ├── bestcase/                   # BestCase management
│   │   ├── index.ts
│   │   ├── saveBestCase.ts
│   │   ├── loadBestCase.ts
│   │   ├── listBestCases.ts
│   │   └── scoreCalculator.ts
│   ├── guides/                     # ⭐ Guides MCP 서버 (동적 지침 로딩)
│   │   ├── index.ts                # searchGuides, loadGuide, combineGuides
│   │   └── preflight.ts            # 프리플라이트 체크 로직
│   └── filesystem/                 # File system operations
│       ├── index.ts
│       ├── readFile.ts
│       ├── writeFile.ts
│       └── searchFiles.ts
├── packages/                       # Shared packages
│   ├── ai-bindings/                # API bindings
│   ├── ai-runner/                  # Sandbox executor
│   ├── bestcase-db/                # BestCase storage
│   └── llm-analyzer/               # LLM code analyzer
├── scripts/                        # Utility scripts
│   ├── scan/                       # Scanning scripts
│   └── tests/                      # Test scripts
├── .dockerignore
├── .env.example                    # Environment variables template
├── .gitignore
├── CONTRIBUTING.md                 # Contributing guidelines
├── docker-compose.yml              # Docker Compose configuration
├── Dockerfile                      # Docker image definition
├── LICENSE                         # MIT License
├── package.json                    # Project dependencies
├── README.md                       # Main documentation
└── tsconfig.base.json              # TypeScript configuration
```

## Key Directories

### ⭐ 새로 추가된 핵심 구조 (2025.11.10)

- **.github/instructions/guides/**: 동적 로드 가능한 AI 지침 파일들
  - `api/`: API 연동 관련 지침 (gRPC, OpenAPI)
  - `ui/`: UI 컴포넌트 사용 지침
  - `workflow/`: 전체 워크플로우 상세 지침
  - `high-risk.md`: 고위험 작업 전용 (스캐폴딩만)
  
- **mcp-servers/guides/**: Guides MCP 서버 (Anthropic Code Mode 방식)
  - `searchGuides()`: 키워드 기반 지침 검색
  - `loadGuide()`: 특정 지침 동적 로드
  - `combineGuides()`: 우선순위 기반 지침 병합
  - **토큰 절감**: 필요한 지침만 런타임에 로드 (98% 절감)

### 기존 디렉토리

- **apps/web**: Nuxt3 web interface for the MCP server
- **docs/**: All documentation files
- **mcp-servers/**: MCP server implementations (bestcase, filesystem, guides)
- **packages/**: Shared TypeScript packages
- **scripts/**: Utility scripts for scanning and testing

## 동적 지침 로딩 시스템

### 워크플로우

```text
1. BestCase 로드 → API 타입 확인
2. 리스크 분석 (≥40 → high-risk.md만)
3. guides.searchGuides() → 상위 3개 ID만 반환
4. guides.loadGuide() → 필요한 시점에만 파일 읽기
5. 코드 적용 → 토큰 77% 절감 (1500 → 350)
```

### 지침 메타데이터 (YAML Front Matter)

```yaml
---
id: grpc.api.connection
scope: global  # project > repo > org > global
apiType: grpc  # grpc | openapi | any
tags: [grpc, api, connection]
priority: 100  # 0-100 (높을수록 우선)
version: 2025.11.10
requires: []   # 필수 지침 ID
excludes: []   # 제외 지침 ID
summary: "gRPC API 연결 및 클라이언트 생성 지침"
---
```

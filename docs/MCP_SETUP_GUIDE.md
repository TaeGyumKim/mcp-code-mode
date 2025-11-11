# MCP 서버 설정 가이드

## Docker로 MCP 서버 실행

### 1. Docker 컨테이너 시작

```bash
# 프로젝트 루트에서 실행
docker-compose up -d

# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f mcp-code-mode
```

### 2. VS Code MCP 설정

#### 방법 1: Global MCP 설정 (권장)

**Windows 경로:** `C:\Users\[USERNAME]\AppData\Roaming\Code\User\mcp.json`

기존 `mcp.json`에 다음 서버 추가:

```json
{
  "servers": {
    "mcp-code-mode": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-code-mode-server",
        "node",
        "/app/mcp-stdio-server.js"
      ],
      "description": "MCP Code Mode Server - BestCase management and project scanning"
    }
  }
}
```

#### 방법 2: Workspace MCP 설정

프로젝트 루트에 `.vscode/mcp.json` 파일 생성:

```bash
# .vscode 디렉토리 생성
mkdir -p .vscode

# mcp.json.example을 mcp.json으로 복사
cp .vscode/mcp.json.example .vscode/mcp.json
```

### 3. VS Code 재시작

MCP 설정을 적용하려면 VS Code를 재시작하세요.

```
1. VS Code 닫기
2. Docker 컨테이너가 실행 중인지 확인: docker ps
3. VS Code 다시 열기
```

### 4. MCP 서버 사용

VS Code에서 Claude 또는 Copilot과 대화할 때:

```
User: "50.dktechin/frontend 프로젝트의 BestCase를 로드해서 분석해줘"

AI: [MCP 서버에 요청]
{
  "method": "load_bestcase",
  "params": {
    "projectName": "50.dktechin/frontend",
    "category": "advanced-scan"
  }
}

[결과 반환]
프로젝트 분석:
- Vue 파일: 91개
- TypeScript 파일: 20,647개
- OpenAPI 사용: ✓
```

### 5. 사용 가능한 MCP 서버들

#### 🆕 guides - 동적 지침 로딩 (2025.11.10)

**토큰 절감**: 필요한 지침만 런타임에 로드하여 77% 토큰 절감

```json
{
  "method": "guides.searchGuides",
  "params": {
    "keywords": ["grpc", "pagination", "error"],
    "apiType": "grpc",
    "limit": 3
  }
}
```

**반환**: 상위 3개 지침 ID만 반환 (내용은 로드 안함)

```json
{
  "method": "guides.loadGuide",
  "params": {
    "id": "api/grpc-connection"
  }
}
```

**반환**: 특정 지침의 전체 내용 로드

```json
{
  "method": "guides.combineGuides",
  "params": {
    "ids": ["api/grpc-connection", "error/handling", "ui/pagination"],
    "context": {
      "project": "my-app",
      "apiType": "grpc"
    }
  }
}
```

**반환**: 우선순위 기반 병합된 지침 (scope > priority > version)

**지침 구조**:
```text
.github/instructions/guides/
  api/                      # API 연동
    grpc-connection.md
    openapi-validation.md
  ui/                       # UI 컴포넌트
    openerd-components.md
    pagination.md
  workflow/                 # 워크플로우
    core.md
  high-risk.md              # 리스크 ≥40 전용
```

#### execute - 코드 실행

```json
{
  "method": "execute",
  "params": {
    "code": "await filesystem.searchFiles({ path: '/projects', recursive: true })",
    "timeoutMs": 30000
  }
}
```

#### list_bestcases - BestCase 목록

```json
{
  "method": "list_bestcases"
}
```

#### load_bestcase - BestCase 로드

```json
{
  "method": "load_bestcase",
  "params": {
    "projectName": "50.dktechin/frontend",
    "category": "advanced-scan"
  }
}
```

### 6. 트러블슈팅

#### 서버 연결 안됨

```bash
# Docker 컨테이너 확인
docker ps | grep mcp-code-mode

# 컨테이너 없으면 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f mcp-code-mode
```

#### 권한 문제

```bash
# Windows에서 Docker Desktop이 실행 중인지 확인
# WSL2가 활성화되어 있는지 확인
```

#### MCP 서버가 목록에 없음

```bash
# VS Code 완전히 재시작
# mcp.json 파일 경로 확인
# JSON 문법 오류 확인
```

### 7. 전체 mcp.json 예시

기존 MCP 서버들과 함께 사용하는 예시:

```json
{
  "servers": {
    "openerd-nuxt3-lib": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "D:/01.Work/01.Projects/00.common/openerd-nuxt3"
      ]
    },
    "openerd-nuxt3-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ripgrep"],
      "cwd": "D:/01.Work/01.Projects/00.common/openerd-nuxt3"
    },
    "reference-tailwind-nuxt3": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "D:/01.Work/01.Projects/50.dktechin/frontend"
      ]
    },
    "reference-tailwind-nuxt3-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ripgrep"],
      "cwd": "D:/01.Work/01.Projects/50.dktechin/frontend"
    },
    "reference-nuxt-projects-all": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ripgrep"],
      "cwd": "D:/01.Work/01.Projects"
    },
    "mcp-code-mode": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-code-mode-server",
        "node",
        "/app/mcp-stdio-server.js"
      ],
      "description": "MCP Code Mode Server - BestCase management and project scanning"
    }
  }
}
```

### 8. 다음 단계

MCP 서버가 정상 동작하면:

1. **프로젝트 스캔**
   ```bash
   # scan-advanced.js에서 PROJECT_NAME 수정 후
   yarn scan:advanced
   ```

2. **BestCase 확인**
   ```bash
   # BestCase 저장 위치 확인
   ls D:/01.Work/01.Projects/.bestcases/
   ```

3. **AI와 대화**
   ```
   "저장된 BestCase 목록을 보여줘"
   "03.nuxt3_starter 프로젝트 분석해줘"
   ```

### 9. 개발 모드

개발 중에는 로컬에서 직접 실행할 수도 있습니다:

```bash
# 로컬에서 STDIO 서버 실행
node mcp-stdio-server.js
```

로컬 실행 시 mcp.json 설정:

```json
{
  "servers": {
    "mcp-code-mode-local": {
      "type": "stdio",
      "command": "node",
      "args": [
        "D:/01.Work/08.rf/mcp-code-mode-starter/mcp-stdio-server.js"
      ],
      "cwd": "D:/01.Work/08.rf/mcp-code-mode-starter"
    }
  }
}
```

# VS Code MCP 연동 가이드

이 가이드는 MCP Code Mode Server를 VS Code와 연동하는 방법을 설명합니다.

## 1. Docker 서버 실행

```bash
# 프로젝트 루트에서 실행
docker-compose up -d

# 서버 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f mcp-code-mode
```

## 2. VS Code MCP 설정

### 방법 A: Claude Code Editor Extension 사용

1. **Extension 설치**
   - VS Code에서 "Claude Code Editor" 검색 후 설치

2. **MCP 서버 설정**
   
   `.vscode/mcp.json` 생성:
   
   ```json
   {
     "mcpServers": {
       "code-mode": {
         "type": "stdio",
         "command": "docker",
         "args": [
           "exec",
           "-i",
           "mcp-code-mode-server",
           "node",
           "/app/mcp-stdio-server.js"
         ],
         "description": "Code Mode Server for BestCase management"
       }
     }
   }
   ```

3. **사용 예시**
   
   Claude에게 요청:
   ```
   "50.dktechin/frontend 프로젝트의 BestCase를 로드해서 gRPC 사용 여부를 알려줘"
   ```

### 방법 B: HTTP API 직접 호출

1. **VS Code Tasks 설정**
   
   `.vscode/tasks.json`:
   
   ```json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "label": "Scan Current Project",
         "type": "shell",
         "command": "curl",
         "args": [
           "-X", "POST",
           "http://localhost:3000/api/agent/execute",
           "-H", "Content-Type: application/json",
           "-d", "{\"code\":\"await filesystem.searchFiles({path:'/projects/${workspaceFolderBasename}',recursive:true})\"}"
         ],
         "problemMatcher": []
       },
       {
         "label": "Load BestCase",
         "type": "shell",
         "command": "curl",
         "args": [
           "-X", "POST",
           "http://localhost:3000/api/agent/execute",
           "-H", "Content-Type: application/json",
           "-d", "{\"code\":\"await bestcase.loadBestCase({projectName:'${input:projectName}'})\"}"
         ],
         "problemMatcher": []
       }
     ],
     "inputs": [
       {
         "id": "projectName",
         "type": "promptString",
         "description": "프로젝트 이름을 입력하세요"
       }
     ]
   }
   ```

2. **사용 방법**
   - `Ctrl+Shift+P` → "Tasks: Run Task"
   - "Scan Current Project" 또는 "Load BestCase" 선택

### 방법 C: Copilot Chat에서 사용

1. **Copilot Chat Extension 설치**

2. **Custom Instructions 설정**
   
   `.vscode/copilot-instructions.md`:
   
   ```markdown
   # MCP Code Mode Integration
   
   When analyzing projects or answering questions about project structure:
   
   1. First, load the BestCase from the MCP server:
      ```
      curl -X POST http://localhost:3000/api/agent/execute \
        -H "Content-Type: application/json" \
        -d '{"code":"await bestcase.loadBestCase({projectName:\"PROJECT_NAME\"})"}'
      ```
   
   2. Use the loaded patterns and file information to provide context-aware answers
   
   3. For scanning new projects:
      ```
      curl -X POST http://localhost:3000/api/agent/execute \
        -H "Content-Type: application/json" \
        -d '{"code":"... scanning code ..."}'
      ```
   ```

## 3. 프로젝트별 BestCase 로드 자동화

### Workspace 설정

`.vscode/settings.json`:

```json
{
  "mcp.autoLoad": true,
  "mcp.projectName": "${workspaceFolderBasename}",
  "mcp.serverUrl": "http://localhost:3000",
  "editor.quickSuggestions": {
    "comments": true
  }
}
```

### Extension 만들기 (선택적)

간단한 VS Code Extension을 만들어 자동으로 BestCase를 로드할 수 있습니다:

`extension.js`:

```javascript
const vscode = require('vscode');
const axios = require('axios');

async function loadBestCase(projectName) {
  const code = `
    const result = await bestcase.loadBestCase({
      projectName: '${projectName}',
      category: 'advanced-scan'
    });
    console.log(JSON.stringify(result, null, 2));
  `;
  
  const response = await axios.post('http://localhost:3000/api/agent/execute', {
    code,
    timeoutMs: 10000
  });
  
  return response.data;
}

function activate(context) {
  // 워크스페이스 열 때 자동 로드
  const workspaceName = vscode.workspace.name;
  if (workspaceName) {
    loadBestCase(workspaceName).then(data => {
      vscode.window.showInformationMessage(
        `BestCase loaded for ${workspaceName}`
      );
      // data를 컨텍스트에 저장하여 Copilot이 사용할 수 있게 함
    });
  }
  
  // 수동 로드 커맨드
  context.subscriptions.push(
    vscode.commands.registerCommand('mcp.loadBestCase', async () => {
      const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name'
      });
      if (projectName) {
        const data = await loadBestCase(projectName);
        vscode.window.showInformationMessage('BestCase loaded!');
      }
    })
  );
}

module.exports = { activate };
```

## 4. MCP STDIO 서버 구현

Docker 컨테이너 내부에서 stdio 프로토콜로 통신하려면:

`mcp-stdio-server.js`:

```javascript
#!/usr/bin/env node
import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    if (request.method === 'execute') {
      const result = await runAgentScript({
        code: request.params.code,
        timeoutMs: request.params.timeoutMs || 30000
      });
      
      console.log(JSON.stringify({
        id: request.id,
        result: result
      }));
    }
  } catch (error) {
    console.log(JSON.stringify({
      id: request?.id,
      error: error.message
    }));
  }
});
```

Dockerfile에 추가:

```dockerfile
# MCP STDIO 서버 스크립트 복사
COPY mcp-stdio-server.js /app/

# 실행 권한 부여
RUN chmod +x /app/mcp-stdio-server.js
```

## 5. 사용 예시

### Claude Code Editor에서

```
User: "이 프로젝트에서 gRPC를 사용하는지 알려줘"

Claude: [MCP 서버에 요청]
{
  "tool": "execute",
  "code": "await bestcase.loadBestCase({projectName:'current-project'})"
}

[결과 분석]
이 프로젝트는 gRPC를 사용하지 않습니다. 
대신 @dktechin/openapi 패키지를 통해 OpenAPI를 사용합니다.
```

### Copilot Chat에서

```
You: "@workspace 이 프로젝트의 컴포넌트 구조를 분석해줘"

Copilot: [BestCase 로드]
프로젝트에는 91개의 Vue 컴포넌트가 있으며,
주로 pages/, components/ 디렉토리에 위치합니다.
샘플 컴포넌트를 보여드릴까요?
```

## 6. 트러블슈팅

### 서버 연결 안됨

```bash
# Docker 컨테이너 상태 확인
docker-compose ps

# 네트워크 확인
curl http://localhost:3000/api/health

# 로그 확인
docker-compose logs -f
```

### BestCase 로드 실패

```bash
# BestCase 디렉토리 확인
ls -la D:/01.Work/01.Projects/.bestcases/

# 수동으로 BestCase 로드 테스트
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"await bestcase.list()"}'
```

### 권한 문제

```bash
# Windows에서 Docker 볼륨 권한 설정
# docker-compose.yml에서 volumes 확인
# :ro (read-only) vs :rw (read-write)
```

## 7. 다음 단계

- [ ] VS Code Extension 퍼블리시
- [ ] Claude Desktop MCP 설정 추가
- [ ] 자동 BestCase 업데이트 스케줄러
- [ ] 프로젝트 변경 감지 및 재스캔
- [ ] 웹 대시보드에서 BestCase 관리

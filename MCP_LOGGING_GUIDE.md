# 🔍 MCP 서버 로깅 가이드

## Docker 로그 확인 방법

### 1. 실시간 로그 보기

```bash
docker logs -f mcp-code-mode-server
```

### 2. 최근 N개 로그만 보기

```bash
docker logs mcp-code-mode-server --tail 50
```

### 3. 특정 시간 이후 로그

```bash
docker logs mcp-code-mode-server --since 10m
```

---

## 로그 내용 설명

### 로그 포맷

```
[2025-01-10T12:34:56.789Z] 메시지: {"상세내용"}
```

### 주요 로그 이벤트

#### 1. 서버 시작
```
MCP STDIO Server started
```

#### 2. 요청 수신
```
[timestamp] Received request: {"method":"tools/call","id":1}
```

#### 3. 도구 호출
```
[timestamp] Tool call: {"tool":"execute","args":{...}}
[timestamp] Executing code: {"codeLength":150}
```

#### 4. BestCase 작업
```
[timestamp] Listing BestCases
[timestamp] BestCases listed: {"count":5}

[timestamp] Loading BestCase: {"projectName":"frontend-airspace","category":"auto-scan-ai"}
[timestamp] BestCase loaded: {"success":true}
```

#### 5. Guides 작업
```
[timestamp] Tool call: {"tool":"execute","args":{"code":"await guides.loadGuide(...)"}}
[timestamp] Execution result: {"success":true}
```

#### 6. 응답 전송
```
[timestamp] Sending response: {"id":1,"method":"success"}
```

---

## 파일 접근 추적

### Docker 볼륨 마운트

`docker-compose.yml`:
```yaml
volumes:
  - D:/01.Work/01.Projects:/projects
```

### 로그에서 파일 접근 확인

guides 함수 호출 시:
```typescript
await guides.loadGuide({ id: "core.workflow" })
```

**실제 파일 경로:**
```
컨테이너 내부: /app/.github/instructions/guidelines/core-workflow.md
호스트 경로: D:/01.Work/08.rf/mcp-code-mode-starter/.github/instructions/guidelines/core-workflow.md
```

bestcase 함수 호출 시:
```typescript
await bestcase.loadBestCase({ projectName: "frontend-airspace", category: "auto-scan-ai" })
```

**실제 파일 경로:**
```
컨테이너 내부: /projects/.bestcases/frontend-airspace_auto-scan-ai.json
호스트 경로: D:/01.Work/01.Projects/.bestcases/frontend-airspace_auto-scan-ai.json
```

---

## 로그 레벨 추가 (향후 개선)

### 현재 구현

```typescript
function log(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = data 
    ? `[${timestamp}] ${message}: ${JSON.stringify(data)}`
    : `[${timestamp}] ${message}`;
  process.stderr.write(logMessage + '\n');
}
```

### 향후 개선 (레벨별 로깅)

```typescript
enum LogLevel { DEBUG, INFO, WARN, ERROR }

function log(level: LogLevel, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const levelStr = LogLevel[level];
  const logMessage = `[${timestamp}] [${levelStr}] ${message}`;
  
  if (data) {
    process.stderr.write(logMessage + ': ' + JSON.stringify(data) + '\n');
  } else {
    process.stderr.write(logMessage + '\n');
  }
}
```

---

## 실전 예시

### VS Code에서 Copilot Chat 사용 시

**사용자:**
```
상품 목록 페이지 만들어줘
```

**Docker 로그:**
```
[2025-01-10T12:30:00.123Z] Received request: {"method":"tools/call","id":1}
[2025-01-10T12:30:00.125Z] Tool call: {"tool":"execute","args":{...}}
[2025-01-10T12:30:00.130Z] Executing code: {"codeLength":250}
[2025-01-10T12:30:00.135Z] Loading BestCase: {"projectName":"frontend-airspace","category":"auto-scan-ai"}
[2025-01-10T12:30:00.200Z] BestCase loaded: {"success":true}
[2025-01-10T12:30:00.210Z] Tool call: {"tool":"execute","args":{"code":"await guides.searchGuides(...)"}}
[2025-01-10T12:30:00.250Z] Execution result: {"success":true}
[2025-01-10T12:30:00.255Z] Sending response: {"id":1,"method":"success"}
```

**해석:**
1. VS Code가 MCP 서버에 요청 전송
2. `execute` 도구 호출
3. BestCase 로드 (frontend-airspace 프로젝트 패턴)
4. guides 검색 (관련 가이드라인 찾기)
5. 결과 반환

---

## 로그 파일로 저장

### 영구 로그 저장

```bash
# 로그를 파일로 저장
docker logs mcp-code-mode-server > mcp-logs.txt 2>&1

# 실시간 로그를 파일에 추가
docker logs -f mcp-code-mode-server >> mcp-logs-realtime.txt 2>&1
```

### docker-compose.yml에 로깅 설정 추가 (선택)

```yaml
services:
  mcp-code-mode:
    # ... 기존 설정
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 디버깅 팁

### 1. 요청/응답 추적

모든 JSON-RPC 통신이 로그에 기록됩니다:
- `Received request` → 들어온 요청
- `Tool call` → 실행된 도구
- `Sending response` → 반환된 응답

### 2. 에러 추적

에러 발생 시:
```
[timestamp] Error: {"code":-32603,"message":"Internal error","data":"..."}
```

### 3. 성능 측정

타임스탬프로 각 작업 소요 시간 계산 가능

---

## 요약

### 로그 확인 명령어

```bash
# 실시간 로그
docker logs -f mcp-code-mode-server

# 최근 50줄
docker logs mcp-code-mode-server --tail 50

# 저장
docker logs mcp-code-mode-server > logs.txt 2>&1
```

### 로그에서 확인 가능한 것

- ✅ MCP 요청/응답 전체 흐름
- ✅ 도구 호출 (execute, list_bestcases, load_bestcase)
- ✅ BestCase 파일 접근
- ✅ Guides 함수 실행
- ✅ 에러 메시지
- ✅ 타임스탬프별 성능

**이제 Docker 재시작 후 로그를 확인해보세요!** 🔍

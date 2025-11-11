# 🤖 BestCase AI 분석 실행 가이드

## 📋 개요

BestCase AI 분석은 이제 다음 두 가지 방법으로만 실행됩니다:

1. **크론잡 (자동)**: 매주 일요일 새벽 2시
2. **수동 실행**: 사용자가 직접 스크립트 실행

**Docker 시작 시 자동 분석은 제거되었습니다!**

---

## 🕐 자동 실행 (크론잡)

### 스케줄

```
매주 일요일 새벽 2:00 AM
```

### 크론 표현식

```bash
0 2 * * 0  # 일요일 02:00
```

### 설정 위치

`docker-compose.ai.yml` → `cron-scheduler` 서비스

```yaml
command: >
  -c "
  echo '0 2 * * 0 /app/cron-scan.sh >> /var/log/cron.log 2>&1' | crontab -
  "
```

### 로그 확인

```bash
# 크론 로그 실시간 보기
docker logs -f bestcase-cron-scheduler

# 마지막 분석 결과
docker exec bestcase-cron-scheduler tail -n 100 /var/log/cron.log
```

---

## 🖱️ 수동 실행

### Windows (PowerShell)

```powershell
.\run-manual-scan.ps1
```

### Linux/Mac (Bash)

```bash
./run-manual-scan.sh
```

### 직접 Docker 명령어

```bash
docker exec bestcase-cron-scheduler /app/cron-scan.sh
```

---

## 🔍 분석 프로세스

### 실행되는 스크립트: `cron-scan.sh`

```bash
1. 🧹 오래된 BestCase 파일 정리
2. 🔍 AI 기반 프로젝트 스캔 (auto-scan-projects-ai.js)
3. 🧹 최종 정리 (중복 제거)
```

### AI 분석 내용

- **코드 패턴 분석**: 프레임워크, 라이브러리, API 타입
- **품질 평가**: 복잡도, 테스트 커버리지, 문서화
- **티어 분류**: BRONZE → SILVER → GOLD → PLATINUM
- **추천 사항**: 개선 포인트, 베스트 프랙티스

### 결과 저장 위치

```
D:/01.Work/01.Projects/.bestcases/
  ├── {projectName}_auto-scan-ai.json
  ├── {projectName}_auto-scan-ai.json
  └── ...
```

---

## 🚀 사용 예시

### 1. 매주 자동 분석 (크론잡)

```bash
# docker-compose.ai.yml로 시작
docker-compose -f docker-compose.ai.yml up -d

# 크론 스케줄 확인
docker exec bestcase-cron-scheduler crontab -l

# 출력:
# 0 2 * * 0 /app/cron-scan.sh >> /var/log/cron.log 2>&1
```

**→ 매주 일요일 새벽 2시에 자동 실행됨**

### 2. 즉시 수동 분석

```powershell
# PowerShell에서
.\run-manual-scan.ps1

# 출력:
# 🤖 Manual BestCase AI Analysis
# ================================
# ✅ All containers running
# 🔍 Starting AI analysis...
# ✨ Analysis completed!
```

### 3. 특정 프로젝트만 분석

```bash
# Docker 컨테이너 접속
docker exec -it bestcase-cron-scheduler /bin/sh

# 특정 프로젝트 스캔
cd /app
node auto-scan-projects-ai.js --project=frontend-airspace
```

---

## 📊 분석 결과 확인

### BestCase 파일 구조

```json
{
  "projectName": "frontend-airspace",
  "category": "auto-scan-ai",
  "timestamp": "2025-01-10T02:00:00.000Z",
  "scores": {
    "overall": 85,
    "tier": "GOLD",
    "readability": 90,
    "maintainability": 80
  },
  "patterns": {
    "codePatterns": {
      "framework": "Nuxt3",
      "apiType": "openapi"
    },
    "componentStats": {
      "total": 45,
      "avgComplexity": 2.3
    }
  },
  "recommendations": [
    "Add more unit tests",
    "Improve API error handling"
  ]
}
```

### MCP 서버에서 로드

```typescript
// Copilot Chat이 자동으로 실행
const bc = await bestcase.loadBestCase({
  projectName: "frontend-airspace",
  category: "auto-scan-ai"
});

console.log(bc.scores.tier); // "GOLD"
```

---

## ⚙️ 설정 변경

### 크론 스케줄 변경

`docker-compose.ai.yml` 수정:

```yaml
# 예: 매일 새벽 3시
echo '0 3 * * * /app/cron-scan.sh >> /var/log/cron.log 2>&1' | crontab -

# 예: 매주 토요일, 일요일 새벽 2시
echo '0 2 * * 0,6 /app/cron-scan.sh >> /var/log/cron.log 2>&1' | crontab -
```

### AI 모델 변경

`docker-compose.ai.yml`:

```yaml
environment:
  - LLM_MODEL=qwen2.5-coder:14b  # 더 큰 모델
  - CONCURRENCY=1  # 동시 실행 수 조정
```

### 분석 범위 제한

`auto-scan-projects-ai.js` 수정 또는 환경 변수 추가:

```yaml
environment:
  - SCAN_PATTERN=**/frontend*  # frontend 프로젝트만
  - SKIP_PATTERNS=**/node_modules/**,**/.git/**
```

---

## 🔧 문제 해결

### 크론이 실행되지 않음

```bash
# 크론 프로세스 확인
docker exec bestcase-cron-scheduler ps aux | grep cron

# 크론 로그 확인
docker exec bestcase-cron-scheduler tail -f /var/log/cron.log

# 크론 재시작
docker restart bestcase-cron-scheduler
```

### Ollama 연결 실패

```bash
# Ollama 상태 확인
docker exec ollama-code-analyzer ollama list

# 모델 다운로드 확인
docker exec ollama-code-analyzer ollama pull qwen2.5-coder:7b
```

### 수동 실행 권한 오류

```bash
# Linux/Mac
chmod +x run-manual-scan.sh

# Windows PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📝 요약

### 자동 분석 (크론잡)

- ⏰ **스케줄**: 매주 일요일 새벽 2시
- 🤖 **방법**: `cron-scheduler` 컨테이너 자동 실행
- 📊 **로그**: `docker logs bestcase-cron-scheduler`

### 수동 분석

- 🖱️ **Windows**: `.\run-manual-scan.ps1`
- 🐧 **Linux/Mac**: `./run-manual-scan.sh`
- 🐳 **Docker**: `docker exec bestcase-cron-scheduler /app/cron-scan.sh`

### 결과 확인

- 📁 **위치**: `D:/01.Work/01.Projects/.bestcases/`
- 🔍 **MCP**: `bestcase.loadBestCase({ projectName, category: "auto-scan-ai" })`

**이제 Docker 시작 시 자동 분석이 제거되어 리소스 절약!** 🎉

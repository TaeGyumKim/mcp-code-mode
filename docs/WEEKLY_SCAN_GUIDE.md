# 주간 BestCase 스캔 가이드

## 📅 스케줄링 개요

BestCase AI 분석은 **매주 일요일 오전 2시**에 자동으로 실행됩니다.

### Cron 설정
```
0 2 * * 0 /app/cron-scan.sh
```
- `0 2`: 오전 2시
- `* *`: 매일/매월
- `0`: 일요일 (0=일요일, 6=토요일)

## 🔄 스캔 프로세스

### 1단계: 오래된 파일 정리
```bash
node cleanup-old-bestcases.js
```
- 각 프로젝트별로 최신 BestCase만 유지
- 타임스탬프 기준 정렬
- 오래된 중복 파일 삭제

**예시:**
```
14.dream2m-frontend-admin-auto-scan-ai-1762527767113.json ✅ 유지
14.dream2m-frontend-admin-auto-scan-ai-1762525198788.json 🗑️ 삭제
```

### 2단계: AI 기반 스캔
```bash
node auto-scan-projects-ai.js
```
- 모든 Nuxt 프로젝트 검색
- AI 코드 품질 분석 (qwen2.5-coder:7b)
- 패턴 분석 (API, 컴포넌트, Composable)
- BestCase 저장

### 3단계: 최종 정리
```bash
node cleanup-old-bestcases.js
```
- 스캔 중 생성된 중복 파일 재정리
- 최종적으로 프로젝트당 1개 파일만 유지

## 📊 저장 결과

### 파일 구조
```
/projects/.bestcases/
├── 00.common-frontend_work-dir-auto-scan-ai-1762524673559.json
├── 01.GCCare-GCCareGit-auto-scan-ai-1762525536676.json
├── 50.dktechin-frontend-auto-scan-ai-1762537863463.json
└── ... (프로젝트당 1개씩, 총 66개)
```

### JSON 구조
```json
{
  "id": "50.dktechin-frontend-auto-scan-ai-1762537863463",
  "projectName": "50.dktechin/frontend",
  "category": "auto-scan-ai",
  "description": "50.dktechin/frontend AI-Enhanced Scan (Tier A, Score: 52/100)",
  "patterns": {
    "scores": {
      "final": 52,
      "api": 40,
      "component": 20,
      "tier": "A"
    },
    "apiInfo": {
      "hasGrpc": false,
      "hasOpenApi": true,
      "apiType": "OpenAPI"
    },
    "aiAnalysis": {
      "averageScore": 66.3,
      "excellentSnippets": [...]
    }
  }
}
```

## 🐳 Docker 설정

### 컨테이너 시작
```bash
docker-compose -f docker-compose.ai.yml up -d
```

### 로그 확인
```bash
# Cron 스케줄러 로그
docker logs -f bestcase-cron-scheduler

# 수동 실행 (테스트)
docker exec -it bestcase-cron-scheduler /app/cron-scan.sh
```

### 예상 출력
```
=========================================
🤖 Weekly BestCase AI Scan
📅 Sun Nov 10 02:00:01 UTC 2025
=========================================
✅ Ollama available, starting weekly scan process
🧠 LLM Model: qwen2.5-coder:7b
⚡ Concurrency: 2

🧹 Step 1: Cleaning up old BestCase files...
📊 Total BestCase files: 116
📁 Unique projects: 66
📊 Summary:
  - Files kept: 66
  - Files deleted: 50

🔍 Step 2: Running AI-enhanced scan...
Found 66 Nuxt project(s)
[프로젝트 스캔 진행...]

🧹 Step 3: Final cleanup...
📊 Summary:
  - Files kept: 66
  - Files deleted: 0

✨ Weekly AI scan completed at Sun Nov 10 04:30:15 UTC 2025
```

## 🛠️ 수동 실행

### 즉시 스캔 (Docker 외부)
```bash
# 1. 정리
node cleanup-old-bestcases.js

# 2. 스캔
node auto-scan-projects-ai.js

# 3. 재정리
node cleanup-old-bestcases.js
```

### 즉시 스캔 (Docker 내부)
```bash
docker exec -it mcp-code-mode-server sh -c "
  node cleanup-old-bestcases.js &&
  node auto-scan-projects-ai.js &&
  node cleanup-old-bestcases.js
"
```

## 📈 성능 최적화

### 처리 시간
- **프로젝트당**: 2-6분
- **전체 66개**: 약 2-4시간
- **스케줄**: 일요일 오전 2시 시작 → 오전 4-6시 완료

### 리소스 사용
- **GPU**: NVIDIA GTX 1060 6GB (device_id: 1)
- **메모리**: MCP 서버 8GB, Cron 4GB
- **동시 처리**: 2파일 (7B 모델용)

## 🔍 트러블슈팅

### 스캔이 실행되지 않음
```bash
# Cron 확인
docker exec bestcase-cron-scheduler crontab -l

# 로그 확인
docker exec bestcase-cron-scheduler cat /var/log/cron.log

# Ollama 상태 확인
docker exec bestcase-cron-scheduler curl -f http://ollama:11434/api/tags
```

### 중복 파일 발견
```bash
# 정리 스크립트 실행
docker exec bestcase-cron-scheduler node /app/cleanup-old-bestcases.js
```

### 수동으로 스케줄 변경
```bash
# Docker 컨테이너 재시작
docker-compose -f docker-compose.ai.yml restart cron-scheduler

# 또는 docker-compose.ai.yml 수정 후
docker-compose -f docker-compose.ai.yml up -d --build cron-scheduler
```

## 📊 BestCase 활용

### MCP를 통한 조회
```javascript
// VS Code Copilot Chat
"50.dktechin 프로젝트의 API 구조를 알려줘"
```

### 직접 조회
```bash
# 최신 BestCase 확인
ls -lt /projects/.bestcases/*.json | head -10

# 특정 프로젝트 조회
cat /projects/.bestcases/50.dktechin-frontend-auto-scan-ai-*.json | jq .
```

## 🎯 다음 스캔 예정 시간

현재 시간을 기준으로 다음 일요일 오전 2시에 자동 실행됩니다.

```bash
# 다음 실행 시간 확인 (Docker 내부)
docker exec bestcase-cron-scheduler sh -c "date && echo 'Next Sunday 02:00'"
```

## 📚 관련 문서

- [BestCase 활용 가이드](./.github/instructions/bestcase-usage.md)
- [AI 분석 가이드](./AI_AUTO_SCAN_GUIDE.md)
- [MCP 연동 가이드](./VSCODE_MCP_GUIDE.md)

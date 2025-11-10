# 🚀 AI-Enhanced Auto Scan 가이드

## 개요

이 시스템은 **기존 패턴 분석 + AI 코드 품질 분석**을 통합하여 모든 Nuxt 프로젝트를 자동으로 스캔하고 BestCase를 생성합니다.

## 주요 기능

### 1. 자동 프로젝트 탐색
- `D:/01.Work/01.Projects` 하위 모든 Nuxt 프로젝트 자동 감지
- 2단계 깊이까지 탐색 (예: `50.dktechin/frontend`)
- package.json에서 Nuxt 의존성 확인

### 2. AI 코드 품질 분석
- **LLM 모델:** qwen2.5-coder:1.5b (GPU 가속)
- **병렬 처리:** 3개 파일 동시 분석
- **분석 대상:** composables + pages (최대 20파일)
- **분석 항목:**
  - Type Safety (0-30점)
  - Error Handling (0-30점)
  - Best Practices (0-40점)

### 3. 패턴 분석 (기존)
- **API 감지:** OpenAPI, gRPC
- **컴포넌트 사용량:** CommonTable, CommonButton 등
- **Composable 사용량:** usePaging, useBackendClient 등
- **Tailwind 분석:** 설정 파일, 유틸리티 클래스

### 4. 통합 점수 계산
```
최종 점수 = AI 점수 (60%) + 패턴 점수 (40%)

Tier 등급:
- S: 80점 이상
- A: 60-79점
- B: 40-59점
- C: 20-39점
- D: 20점 미만
```

## 사용법

### 수동 실행

```bash
# 전체 프로젝트 AI 분석 (권장)
yarn scan:auto-ai

# 기존 방식 (AI 없음)
yarn scan:auto

# 단일 프로젝트 AI 테스트
yarn test:ai
```

### 자동 실행 (크론 스케줄러)

Docker 컨테이너가 **6시간마다** 자동으로 스캔:

```bash
# Docker Compose로 시작
docker-compose -f docker-compose.ai.yml up -d

# 크론 로그 확인
docker logs bestcase-cron-scheduler -f

# 수동으로 크론 스크립트 실행
docker exec bestcase-cron-scheduler /app/cron-scan.sh
```

**크론 스케줄:** `0 */6 * * *` (매 6시간)

## 시스템 구성

### 1. Ollama LLM 서버
- **GPU:** NVIDIA GTX 1060 6GB (전체 활용)
- **메모리:** 24GB RAM 할당
- **모델:** qwen2.5-coder:1.5b (1.0GB)
- **포트:** 11434

### 2. MCP 서버
- **메모리:** 8GB RAM 할당
- **역할:** filesystem, bestcase API 제공
- **볼륨:** D:/01.Work/01.Projects (읽기 전용)

### 3. 크론 스케줄러
- **메모리:** 4GB RAM 할당
- **스케줄:** 6시간마다 자동 실행
- **볼륨:** D:/01.Work/01.Projects (읽기/쓰기)

## 환경 변수

```bash
# Ollama 설정
OLLAMA_URL=http://ollama:11434
LLM_MODEL=qwen2.5-coder:1.5b  # 또는 qwen2.5-coder:7b

# 병렬 처리
CONCURRENCY=3  # 1~5 (GPU 메모리에 따라 조절)

# 경로 설정
PROJECTS_PATH=/projects
BESTCASE_STORAGE_PATH=/projects/.bestcases
```

## 성능

### AI 분석 속도 (1.5B 모델, 3개 병렬)
- **10파일:** 약 35초 (3.5초/파일)
- **20파일:** 약 70초
- **처리량:** 0.29 파일/초

### 전체 스캔 예상 시간
- **66개 프로젝트 (평균 15파일):** 약 60분
- **크론 주기:** 6시간마다 (충분한 간격)

## BestCase 저장 형식

```json
{
  "id": "project-name-auto-scan-ai-1699334400000",
  "projectName": "50.dktechin/frontend",
  "category": "auto-scan-ai",
  "description": "프로젝트명 AI-Enhanced Scan (Tier A, Score: 72/100)",
  "patterns": {
    "scores": {
      "final": 72,
      "pattern": 65,
      "api": 40,
      "component": 90,
      "tier": "A"
    },
    "aiAnalysis": {
      "averageScore": 75.0,
      "totalFiles": 10,
      "topFiles": [...],
      "excellentSnippets": [...],
      "detailedResults": [...]
    },
    "stats": { ... },
    "apiInfo": { ... },
    "componentUsage": { ... }
  },
  "tags": ["auto-scan", "ai-analysis", "A", "nuxt 3", "2025-11-07"]
}
```

## 우수 코드 발견

AI가 **85점 이상 스니펫**을 자동으로 추출:

```json
{
  "excellentSnippets": [
    {
      "filePath": "composables/grpc.ts",
      "score": 95,
      "reason": "Perfect error interceptor implementation",
      "category": "error-handling"
    }
  ]
}
```

## 트러블슈팅

### Ollama 서버 응답 없음
```bash
# Ollama 재시작
docker restart ollama-code-analyzer

# 모델 확인
docker exec ollama-code-analyzer ollama list

# 모델 다운로드
docker exec ollama-code-analyzer ollama pull qwen2.5-coder:1.5b
```

### GPU 미사용
```bash
# GPU 확인
docker exec ollama-code-analyzer nvidia-smi

# Docker Compose 재시작
docker-compose -f docker-compose.ai.yml down
docker-compose -f docker-compose.ai.yml up -d
```

### 메모리 부족
```bash
# WSL2 메모리 확인
wsl -e sh -c "free -h"

# .wslconfig 수정 (C:\Users\사용자명\.wslconfig)
[wsl2]
memory=32GB
processors=8
```

### 크론 작동 안함
```bash
# 크론 로그 확인
docker logs bestcase-cron-scheduler

# crontab 확인
docker exec bestcase-cron-scheduler crontab -l

# 수동 실행
docker exec bestcase-cron-scheduler /app/cron-scan.sh
```

## 성능 최적화

### GPU 사용 시 (권장)
- **모델:** qwen2.5-coder:7b
- **병렬:** 1 (Ollama 동시성 제한)
- **속도:** 느리지만 정확도 높음

### CPU 사용 시
- **모델:** qwen2.5-coder:1.5b
- **병렬:** 3~5
- **속도:** 빠르고 안정적

### 대량 스캔
- **분석 파일 수 제한:** composables 전체 + pages 5개
- **타임아웃:** 60초 (프로젝트당)
- **배치 처리:** 3개씩 병렬

## 로그 확인

```bash
# 전체 로그
yarn scan:auto-ai 2>&1 | tee scan-log.txt

# Ollama 로그
docker logs ollama-code-analyzer --tail 50

# 크론 로그
docker exec bestcase-cron-scheduler tail -f /var/log/cron.log
```

## 다음 단계

1. **BestCase 목록 조회:** `yarn test:scores`
2. **우수 코드 추출:** 85점 이상 스니펫 자동 수집
3. **대시보드:** 프로젝트별 Tier 시각화
4. **알림:** Slack/Discord 통합 (Tier S 프로젝트 알림)

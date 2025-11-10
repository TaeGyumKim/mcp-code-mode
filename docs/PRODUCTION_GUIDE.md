# 프로덕션 배포 가이드

## 목차
1. [시스템 아키텍처](#시스템-아키텍처)
2. [배포 프로세스](#배포-프로세스)
3. [일일 운영](#일일-운영)
4. [모니터링 & 유지보수](#모니터링--유지보수)
5. [트러블슈팅](#트러블슈팅)

---

## 시스템 아키텍처

### 컨테이너 구성

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                            │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Ollama           │  │ MCP Server       │  │ Cron      │ │
│  │ (GPU Accelerated)│◄─┤ (Code Analysis)  │◄─┤ Scheduler │ │
│  │                  │  │                  │  │           │ │
│  │ qwen2.5-coder    │  │ BestCase Storage │  │ Auto Scan │ │
│  │ 1.5B / 7B        │  │                  │  │ (6시간마다)│ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│         ▲                      ▲                            │
│         │ CUDA                 │ Read/Write                 │
│         ▼                      ▼                            │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ NVIDIA GPU       │  │ Projects Dir     │               │
│  │ GTX 1060 6GB     │  │ .bestcases/      │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
1. Cron Scheduler (6시간마다)
   └─► 프로젝트 스캔 (66개 Nuxt 프로젝트)
       └─► AI 분석 (Ollama + GPU)
           └─► BestCase 저장 (.bestcases/*.json)
               └─► 우수 코드 추출 (85점 이상)

2. MCP Server (VS Code 요청 시)
   └─► list_bestcases → BestCase 목록 반환
   └─► load_bestcase → 특정 BestCase 로드
   └─► save_bestcase → 새 BestCase 저장
```

---

## 배포 프로세스

### 1단계: 사전 준비

#### GPU 확인
```bash
# GPU 인식 확인
nvidia-smi -L
# 출력: GPU 0: NVIDIA GeForce GTX 1060 6GB

# Docker GPU 지원 확인
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```

#### 프로젝트 디렉토리 구조
```
D:/01.Work/01.Projects/
├── .bestcases/                    # BestCase 저장소 (자동 생성)
│   ├── 00.common-openerd-nuxt3-components-1730000000000.json
│   ├── 50.dktechin-frontend-api-1730000000001.json
│   └── ...
├── 00.common/
│   └── openerd-nuxt3/
├── 50.dktechin/
│   └── frontend/
└── ... (66개 프로젝트)
```

### 2단계: 빌드

```bash
# 워크스페이스 루트에서
cd D:/01.Work/08.rf/mcp-code-mode-starter

# 1. 모든 패키지 빌드
yarn build:all

# 빌드 결과 확인
# - packages/bestcase-db/dist/
# - packages/ai-bindings/dist/
# - packages/ai-runner/dist/
# - packages/llm-analyzer/dist/
```

### 3단계: Docker 컨테이너 시작

```bash
# AI 서비스 시작 (Ollama + MCP + Cron)
docker-compose -f docker-compose.ai.yml up -d

# 컨테이너 상태 확인
docker ps
# 출력:
# - ollama-code-analyzer (Ollama LLM)
# - mcp-code-mode-server (MCP Server)
# - bestcase-cron-scheduler (Cron)
```

### 4단계: 모델 다운로드 (첫 실행 시)

```bash
# Ollama 컨테이너 접속
docker exec -it ollama-code-analyzer bash

# 모델 다운로드 (선택)
ollama pull qwen2.5-coder:1.5b  # 빠름, 메모리 효율적 (권장)
# 또는
ollama pull qwen2.5-coder:7b     # 느림, 더 정확함

# 모델 확인
ollama list
```

### 5단계: 초기 스캔 실행

```bash
# 전체 프로젝트 자동 스캔 (첫 실행)
yarn scan:auto-ai

# 진행 상황:
# - 66개 프로젝트 탐색
# - Nuxt 프로젝트 자동 감지
# - AI 분석 (각 프로젝트당 10-50개 파일)
# - BestCase 저장
# - 예상 소요 시간: 3-6시간 (GPU 사용 시)
```

---

## 일일 운영

### 자동 운영 (권장)

**Cron Scheduler가 자동 실행:**
- 실행 주기: **6시간마다** (00:00, 06:00, 12:00, 18:00)
- 작업 내용:
  1. 프로젝트 디렉토리 스캔
  2. 변경된 프로젝트 감지
  3. AI 분석 실행
  4. BestCase 업데이트

**설정 확인:**
```bash
# Cron 로그 확인
docker logs bestcase-cron-scheduler

# Cron 설정 확인
docker exec bestcase-cron-scheduler crontab -l
# 출력: 0 */6 * * * /app/cron-scan.sh
```

### 수동 운영 (필요 시)

#### 특정 프로젝트 스캔
```bash
# 단일 프로젝트 분석
cd D:/01.Work/08.rf/mcp-code-mode-starter
node run-ai-analysis.js

# 환경 변수로 설정 변경
$env:LLM_MODEL="qwen2.5-coder:7b"  # 모델 변경
$env:CONCURRENCY=1                   # 동시성 (1 권장)
node run-ai-analysis.js
```

#### BestCase 조회
```bash
# VS Code MCP를 통해 조회 (권장)
# Claude Desktop에서:
# "list all bestcases"

# 또는 직접 파일 확인
ls D:/01.Work/01.Projects/.bestcases/
```

---

## 모니터링 & 유지보수

### GPU 모니터링

```bash
# 실시간 GPU 사용률 확인
docker exec ollama-code-analyzer nvidia-smi -l 1

# 주요 지표:
# - GPU Util: 80-95% (분석 중)
# - Memory: 1400-1500 MiB (qwen2.5-coder:1.5b)
# - Temp: 50-65°C (정상)
# - Power: 80-110W (작업 중)
```

**경고 기준:**
- Temp > 80°C → 쿨링 확인 필요
- Memory > 5500 MiB → 모델 크기 검토
- GPU Util = 0% (분석 중) → GPU 미사용, 설정 확인

### 컨테이너 로그

```bash
# Ollama 로그 (AI 추론)
docker logs ollama-code-analyzer --tail 50 -f

# MCP Server 로그
docker logs mcp-code-mode-server --tail 50 -f

# Cron Scheduler 로그
docker logs bestcase-cron-scheduler --tail 50 -f
```

### 디스크 사용량

```bash
# BestCase 저장소 크기 확인
Get-ChildItem D:/01.Work/01.Projects/.bestcases/ -Recurse | 
  Measure-Object -Property Length -Sum | 
  Select-Object @{Name="Size(MB)";Expression={$_.Sum/1MB}}

# 예상 크기: 프로젝트당 100-500 KB
# 66개 프로젝트 → 약 10-30 MB
```

### 성능 지표

```bash
# 분석 속도 측정
# - qwen2.5-coder:1.5b + GPU: 3-6초/파일
# - qwen2.5-coder:7b + GPU: 8-15초/파일
# - CPU only (no GPU): 20-40초/파일

# Throughput (CONCURRENCY=1):
# - 1.5B 모델: 0.20-0.30 files/sec
# - 7B 모델: 0.08-0.12 files/sec
```

---

## 설정 최적화

### GPU 메모리 최적화

**docker-compose.ai.yml:**
```yaml
ollama:
  deploy:
    resources:
      limits:
        memory: 24G  # GPU 6GB → RAM 24GB 권장
```

### 분석 품질 vs 속도 조정

#### 빠른 분석 (일일 스캔)
```bash
$env:LLM_MODEL="qwen2.5-coder:1.5b"
$env:CONCURRENCY=1
# 속도: 4-6초/파일
# 품질: 중간 (60-70점 정확도)
```

#### 정확한 분석 (주간 심층 분석)
```bash
$env:LLM_MODEL="qwen2.5-coder:7b"
$env:CONCURRENCY=1
# 속도: 10-15초/파일
# 품질: 높음 (70-85점 정확도)
```

### Temperature 조정

**packages/llm-analyzer/src/codeAnalyzer.ts:**
```typescript
// 더 다양한 점수 (변동성 증가)
temperature: 0.3

// 더 일관된 점수 (변동성 감소)
temperature: 0.1
```

---

## 트러블슈팅

### 문제 1: GPU 사용률 0%

**증상:**
```bash
docker exec ollama-code-analyzer nvidia-smi
# GPU Util: 0%
# Memory: 4 MiB (모델 미로드)
```

**해결:**
```bash
# 1. GPU 인덱스 확인
nvidia-smi -L
# 출력: GPU 0: NVIDIA GeForce GTX 1060

# 2. docker-compose.ai.yml 확인
# CUDA_VISIBLE_DEVICES=0 (0이 맞음!)

# 3. 컨테이너 재시작
docker-compose -f docker-compose.ai.yml down
docker-compose -f docker-compose.ai.yml up -d

# 4. 모델 다운로드 확인
docker exec -it ollama-code-analyzer ollama list
```

### 문제 2: 분석 속도 매우 느림 (20초 이상/파일)

**원인:** CPU 모드로 동작 중

**해결:**
```bash
# Ollama 로그 확인
docker logs ollama-code-analyzer | grep -i cuda

# "CUDA0 KV buffer" 메시지 있어야 함
# 없으면 GPU 미사용

# runtime: nvidia 확인
docker inspect ollama-code-analyzer | grep -i runtime
```

### 문제 3: 동시성 2+ 실행 시 에러

**증상:**
```
Error: 500 Internal Server Error
Command exited with code 1
```

**해결:**
```bash
# CONCURRENCY=1로 고정 (안정성 우선)
$env:CONCURRENCY=1

# 또는 Ollama 병렬 설정 증가 (테스트 필요)
# docker-compose.ai.yml:
# - OLLAMA_NUM_PARALLEL=1  # 기본값
```

### 문제 4: 모든 점수 동일 (예: 75점)

**원인:** AI 모델이 다양성 부족

**해결:**
```bash
# 1. Temperature 증가 (0.1 → 0.3)
# packages/llm-analyzer/src/codeAnalyzer.ts 수정

# 2. 프롬프트 개선 (상세 점수 기준)
# packages/llm-analyzer/src/prompts.ts 확인

# 3. 빌드 & 재시작
yarn workspace llm-analyzer run build
docker-compose -f docker-compose.ai.yml restart
```

### 문제 5: BestCase 파일 생성 안됨

**확인 사항:**
```bash
# 1. 디렉토리 권한
Test-Path D:/01.Work/01.Projects/.bestcases
# False → 생성 필요

# 2. 프로젝트명 sanitization
# 슬래시(/) 제거 확인
# 예: "50.dktechin/frontend" → "50.dktechin-frontend"

# 3. 로그 확인
node run-ai-analysis.js 2>&1 | Select-String "bestcase"
```

---

## 백업 & 복구

### BestCase 백업

```bash
# 전체 BestCase 백업
$backupDate = Get-Date -Format "yyyyMMdd"
Copy-Item D:/01.Work/01.Projects/.bestcases `
  -Destination "D:/Backup/bestcases-$backupDate" -Recurse
```

### 컨테이너 볼륨 백업

```bash
# Ollama 모델 볼륨 백업
docker run --rm -v mcp-code-mode-starter_ollama-models:/data `
  -v D:/Backup:/backup `
  alpine tar czf /backup/ollama-models-backup.tar.gz -C /data .
```

### 복구

```bash
# BestCase 복구
Copy-Item "D:/Backup/bestcases-20251107/*" `
  -Destination D:/01.Work/01.Projects/.bestcases -Recurse

# Ollama 모델 복구
docker run --rm -v mcp-code-mode-starter_ollama-models:/data `
  -v D:/Backup:/backup `
  alpine tar xzf /backup/ollama-models-backup.tar.gz -C /data
```

---

## 성능 벤치마크

### GPU vs CPU 비교

| 모델 | GPU (GTX 1060) | CPU (i7-10700) | 배속 |
|------|----------------|----------------|------|
| qwen2.5-coder:1.5b | 4.7초/파일 | 28초/파일 | 6배 |
| qwen2.5-coder:7b | 12초/파일 | 65초/파일 | 5배 |

### 전체 프로젝트 스캔 시간 추정

```
66개 프로젝트 × 평균 30개 파일 = 1,980개 파일

qwen2.5-coder:1.5b + GPU:
- 1,980 × 4.7초 = 9,306초 ≈ 2.6시간

qwen2.5-coder:7b + GPU:
- 1,980 × 12초 = 23,760초 ≈ 6.6시간

CPU only:
- 1,980 × 28초 = 55,440초 ≈ 15.4시간
```

---

## 보안 고려사항

### 1. 읽기 전용 마운트
```yaml
volumes:
  - D:/01.Work/01.Projects:/projects:ro  # Read-only
```

### 2. 네트워크 격리
```yaml
networks:
  mcp-network:
    driver: bridge
    internal: false  # 외부 인터넷 필요 (Ollama 모델 다운로드)
```

### 3. 리소스 제한
```yaml
deploy:
  resources:
    limits:
      memory: 24G
      cpus: '8'
```

---

## 업데이트 프로세스

### 코드 업데이트

```bash
# 1. Git pull
git pull origin main

# 2. 의존성 설치
yarn install

# 3. 빌드
yarn build:all

# 4. 컨테이너 재빌드
docker-compose -f docker-compose.ai.yml down
docker-compose -f docker-compose.ai.yml up -d --build

# 5. 검증
docker ps
docker logs ollama-code-analyzer --tail 20
```

### 모델 업데이트

```bash
# 새 모델 다운로드
docker exec -it ollama-code-analyzer ollama pull qwen2.5-coder:3b

# 환경 변수 변경
# docker-compose.ai.yml:
# - LLM_MODEL=qwen2.5-coder:3b

# 재시작
docker-compose -f docker-compose.ai.yml restart
```

---

## 부록: 유용한 명령어

### 컨테이너 관리
```bash
# 전체 중지
docker-compose -f docker-compose.ai.yml down

# 전체 시작
docker-compose -f docker-compose.ai.yml up -d

# 재시작
docker-compose -f docker-compose.ai.yml restart

# 로그 실시간 보기
docker-compose -f docker-compose.ai.yml logs -f
```

### 스캔 스크립트
```bash
# 자동 스캔 (66개 프로젝트)
yarn scan:auto-ai

# 특정 프로젝트 분석
node run-ai-analysis.js

# BestCase 목록
node -e "const { BestCaseStorage } = require('./packages/bestcase-db/dist/index.js'); new BestCaseStorage().list().then(console.log)"
```

### GPU 모니터링
```bash
# 1초마다 갱신
watch -n 1 'docker exec ollama-code-analyzer nvidia-smi'

# Windows PowerShell
while($true) { 
  docker exec ollama-code-analyzer nvidia-smi
  Start-Sleep -Seconds 1
  Clear-Host
}
```

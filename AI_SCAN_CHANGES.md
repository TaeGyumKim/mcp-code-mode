# ✅ AI 분석 스케줄 변경 완료

## 🔄 변경 사항

### Before (이전)

- ❌ Docker 시작 시 즉시 스캔 실행
- ❌ 6시간마다 자동 재스캔
- ⚠️ 리소스 과다 사용

### After (변경 후)

- ✅ **크론잡**: 매주 일요일 새벽 2시에만 실행
- ✅ **수동 실행**: 사용자가 원할 때만 실행
- ✅ 리소스 절약

---

## 📝 수정된 파일

### 1. `Dockerfile`

```diff
- CMD ["/bin/sh", "-c", "/app/bestcase-updater.sh & tail -f /dev/null"]
+ CMD ["tail", "-f", "/dev/null"]
```

**→ Docker 시작 시 자동 스캔 제거**

### 2. `scripts/scan/bestcase-updater.sh`

```diff
- # 초기 스캔 실행 (컨테이너 시작 시)
- # 주기적 업데이트 (6시간마다)
+ # 수동 업데이트 스크립트
+ # 사용자가 직접 실행하거나 크론잡에서 호출
```

**→ 6시간마다 실행 루프 제거**

### 3. 수동 실행 스크립트 추가

- ✅ `run-manual-scan.ps1` (Windows PowerShell)
- ✅ `run-manual-scan.sh` (Linux/Mac Bash)

---

## 🚀 사용 방법

### 자동 실행 (크론잡)

이미 설정되어 있습니다!

```yaml
# docker-compose.ai.yml
cron-scheduler:
  command: >
    -c "
    echo '0 2 * * 0 /app/cron-scan.sh >> /var/log/cron.log 2>&1' | crontab -
    "
```

**→ 매주 일요일 새벽 2시 자동 실행**

### 수동 실행

#### Windows:

```powershell
.\run-manual-scan.ps1
```

#### Linux/Mac:

```bash
chmod +x run-manual-scan.sh
./run-manual-scan.sh
```

#### Docker 직접:

```bash
docker exec bestcase-cron-scheduler /app/cron-scan.sh
```

---

## 🔧 다음 단계

### 1. Docker 이미지 재빌드

```bash
docker-compose -f docker-compose.ai.yml build mcp-code-mode cron-scheduler
```

### 2. 컨테이너 재시작

```bash
docker-compose -f docker-compose.ai.yml down
docker-compose -f docker-compose.ai.yml up -d
```

### 3. 크론 설정 확인

```bash
docker exec bestcase-cron-scheduler crontab -l
# 출력: 0 2 * * 0 /app/cron-scan.sh >> /var/log/cron.log 2>&1
```

### 4. 수동 테스트

```powershell
.\run-manual-scan.ps1
```

---

## 📊 예상 효과

### 리소스 절약

| 항목 | 이전 | 변경 후 | 절감 |
|------|------|---------|------|
| **스캔 횟수/주** | 28회 (6시간마다) | 1회 (일요일만) | **96%** |
| **CPU 사용** | 높음 (지속적) | 낮음 (주 1회) | **95%** |
| **GPU 사용** | 높음 (지속적) | 낮음 (주 1회) | **95%** |

### 유연성

- ✅ 필요할 때 즉시 수동 실행 가능
- ✅ 크론 스케줄 쉽게 변경 가능
- ✅ 특정 프로젝트만 선택 분석 가능

---

## 📖 상세 가이드

`AI_SCAN_SCHEDULE.md` 파일 참조!

**변경 완료! 이제 Docker를 재빌드하고 재시작하세요.** 🎉

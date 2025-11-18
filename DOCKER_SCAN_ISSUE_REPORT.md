# 도커 재시작 시 자동 스캔 실행 문제 분석

**날짜**: 2025-11-17
**이슈**: 도커 재시작 시마다 전체 파일 스캔이 자동 실행됨

---

## 근본 원인

### 1. docker-entrypoint.sh의 AUTO_MIGRATE_ON_STARTUP

**위치**: `scripts/scan/docker-entrypoint.sh:16, 36-45`

```bash
# 라인 16: 기본값이 true
export AUTO_MIGRATE_ON_STARTUP="${AUTO_MIGRATE_ON_STARTUP:-true}"

# 라인 36-45: 도커 시작 시 자동 스캔 실행
if [ "$AUTO_MIGRATE_ON_STARTUP" = "true" ]; then
  echo "🔍 Phase 1: Running AI file-based scan (v3.0)..."

  if curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama available, starting scan..."
    node --experimental-specifier-resolution=node /app/scripts/dist/scan/scan-files-ai.js
  fi
fi
```

**문제점**:
- ✅ 기본값이 `true` → 환경 변수를 명시적으로 설정하지 않으면 항상 실행
- ✅ 도커 재시작 = 컨테이너 재시작 = entrypoint 재실행 = 스캔 재실행
- ✅ 조건 없음: 이미 스캔했는지 체크하지 않음

### 2. 파일 워처는 별개 문제

**위치**: `mcp-stdio-server.ts:174-279`

파일 워처(`setupBestCaseWatcher()`)는:
- BestCase 파일의 **외부 변경**을 감지하여 **캐시만 클리어**
- 스캔을 트리거하지 않음
- 도커 재시작과 무관

---

## 해결 방안

### 방안 1: AUTO_MIGRATE_ON_STARTUP 비활성화 (즉시 적용 가능)

#### A. docker-compose.yml 환경 변수 설정

```yaml
# docker-compose.yml
services:
  mcp-code-mode:
    environment:
      - AUTO_MIGRATE_ON_STARTUP=false  # ← 추가
```

**장점**:
- ✅ 즉시 적용 가능
- ✅ 수동 제어 가능 (필요할 때만 스캔)

**단점**:
- ❌ 초기 스캔도 수동으로 실행해야 함

#### B. 수동 스캔 명령

```bash
# 필요할 때만 수동 실행
docker exec mcp-code-mode-server node /app/scripts/dist/scan/scan-files-ai.js
```

---

### 방안 2: 스마트 스캔 조건 추가 (✅ 구현됨)

**docker-entrypoint.sh 개선**:

```bash
# 체크포인트 파일 확인
CHECKPOINT_FILE="$BESTCASE_STORAGE_PATH/.scan-checkpoint.json"
SCAN_COOLDOWN_HOURS=24  # 24시간 내 스캔했으면 스킵

if [ "$AUTO_MIGRATE_ON_STARTUP" = "true" ]; then
  SHOULD_SCAN=true

  # 체크포인트 파일이 존재하면
  if [ -f "$CHECKPOINT_FILE" ]; then
    # 마지막 스캔 시간 확인
    LAST_SCAN=$(stat -c %Y "$CHECKPOINT_FILE" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    HOURS_SINCE_LAST_SCAN=$(( (NOW - LAST_SCAN) / 3600 ))

    if [ "$HOURS_SINCE_LAST_SCAN" -lt "$SCAN_COOLDOWN_HOURS" ]; then
      echo "ℹ️ Scan already ran ${HOURS_SINCE_LAST_SCAN}h ago, skipping (cooldown: ${SCAN_COOLDOWN_HOURS}h)"
      SHOULD_SCAN=false
    fi
  fi

  if [ "$SHOULD_SCAN" = "true" ]; then
    echo "🔍 Running AI file-based scan..."
    node /app/scripts/dist/scan/scan-files-ai.js
  fi
fi
```

**장점**:
- ✅ 자동화 유지
- ✅ 불필요한 재스캔 방지
- ✅ 24시간 쿨다운 (설정 가능)
- ✅ 파일 변경 감지로 필요한 경우만 스캔

**구현 완료** (2025-11-17)

---

### 방안 3: 환경 변수로 쿨다운 제어

**docker-entrypoint.sh 개선**:

```bash
export AUTO_MIGRATE_ON_STARTUP="${AUTO_MIGRATE_ON_STARTUP:-false}"  # 기본값 false로 변경
export SCAN_COOLDOWN_HOURS="${SCAN_COOLDOWN_HOURS:-24}"             # 쿨다운 시간
```

**docker-compose.yml**:

```yaml
environment:
  - AUTO_MIGRATE_ON_STARTUP=true
  - SCAN_COOLDOWN_HOURS=24  # 24시간 내 재스캔 방지
```

---

## 추가 발견 사항

### 1. 파일 워처 개선 필요

**현재 문제**:
```typescript
// mcp-stdio-server.ts:178-193
if (!fs.existsSync(bestCasePath)) {
  fs.mkdirSync(bestCasePath, { recursive: true });
}
```

**문제점**:
- 도커 볼륨이 마운트되기 전에 실행되면 로컬에 디렉토리 생성
- 도커 재시작 시 디렉토리 변경 이벤트 발생 가능

**개선안**:
```typescript
// 디렉토리 생성 전 대기 시간 추가
if (!fs.existsSync(bestCasePath)) {
  // 볼륨 마운트 대기
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!fs.existsSync(bestCasePath)) {
    fs.mkdirSync(bestCasePath, { recursive: true });
  }
}
```

### 2. 워처 디바운스 시간 증가

**현재**: 1초 디바운스
```typescript
// mcp-stdio-server.ts:213
}, 1000);  // 1초
```

**권장**: 3-5초로 증가
```typescript
}, 3000);  // 3초 - 도커 재시작 시 여러 이벤트 방지
```

---

## 권장 구현 순서

### 1단계: 즉시 적용 (1분)

```yaml
# docker-compose.yml에 추가
environment:
  - AUTO_MIGRATE_ON_STARTUP=false
```

```bash
# 도커 재시작
docker-compose restart mcp-code-mode
```

### 2단계: 스마트 스캔 구현 (10분)

1. `docker-entrypoint.sh` 수정:
   - 체크포인트 파일 확인 로직 추가
   - 쿨다운 시간 체크

2. 환경 변수 추가:
   ```yaml
   - AUTO_MIGRATE_ON_STARTUP=true
   - SCAN_COOLDOWN_HOURS=24
   ```

### 3단계: 워처 개선 (5분)

1. `mcp-stdio-server.ts` 수정:
   - 볼륨 마운트 대기 시간 추가
   - 디바운스 시간 3초로 증가

---

## 테스트 시나리오

### 테스트 1: AUTO_MIGRATE_ON_STARTUP=false

```bash
# 1. 환경 변수 설정
export AUTO_MIGRATE_ON_STARTUP=false

# 2. 도커 재시작
docker-compose restart mcp-code-mode

# 3. 로그 확인
docker logs mcp-code-mode-server | grep "Auto-scan"

# 예상 출력:
# ℹ️ Auto-scan disabled (AUTO_MIGRATE_ON_STARTUP=false)
```

### 테스트 2: 쿨다운 로직

```bash
# 1. 첫 번째 스캔 (정상 실행)
docker-compose restart mcp-code-mode
# 예상: 스캔 실행

# 2. 즉시 재시작 (스킵)
docker-compose restart mcp-code-mode
# 예상: "Scan already ran 0h ago, skipping"

# 3. 24시간 후 재시작 (정상 실행)
# 예상: 스캔 실행
```

---

## 결론

**근본 원인**: `AUTO_MIGRATE_ON_STARTUP=true` (기본값)

**즉시 해결책**:
```yaml
# docker-compose.yml
environment:
  - AUTO_MIGRATE_ON_STARTUP=false
```

**장기 해결책**: 쿨다운 로직 구현

**예상 효과**:
- ✅ 도커 재시작 시 불필요한 스캔 제거
- ✅ 수동 제어 가능
- ✅ 서버 리소스 절약

---

**보고서 작성**: Claude Code Assistant
**날짜**: 2025-11-17

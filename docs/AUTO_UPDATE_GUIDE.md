# MCP Code Mode 자동 업데이트 가이드

## 개요

MCP Code Mode 서버는 이제 자동으로 BestCase를 업데이트합니다:
- **초기 스캔**: Docker 컨테이너 시작 시 즉시 실행
- **주기적 스캔**: 6시간마다 자동 실행

## 자동 스캔 대상 프로젝트

현재 자동으로 스캔되는 프로젝트:

1. **03.nuxt3_starter**
   - 경로: `/projects/03.nuxt3_starter`
   - 카테고리: `advanced-scan`

2. **50.dktechin/frontend**
   - 경로: `/projects/50.dktechin/frontend`
   - 카테고리: `advanced-scan`

## 스캔 내용

각 프로젝트에서 수집되는 정보:

### 1. 파일 통계
- Vue 파일 개수
- TypeScript 파일 개수
- 전체 파일 개수

### 2. API 감지
- gRPC 사용 여부
- OpenAPI 사용 여부
- API 타입 분류

### 3. 프레임워크 감지
- Nuxt 3, Next.js, Vue 3, React 등
- TypeScript 사용 여부
- Vue 사용 여부

### 4. 샘플 파일
- 컴포넌트 샘플 (최대 3개)
- 실제 파일 내용 포함

## 로그 확인

### 실시간 로그 보기
```bash
docker logs -f mcp-code-mode-server
```

### 최근 로그만 보기
```bash
docker logs mcp-code-mode-server --tail 50
```

### 예상 출력
```
🔄 Starting BestCase Auto Update Service
📊 Running initial scan...

🚀 Starting Auto BestCase Update
📅 Time: 2025-11-07T07:09:37.619Z
📂 Projects Base: /projects
💾 Storage: /projects/.bestcases

========================================
🔍 Scanning: 03.nuxt3_starter
========================================
📊 Found 4 files (Vue: 1, TS: 3)
✅ BestCase saved: 03.nuxt3_starter-advanced-scan-1762499377644
📁 Location: /projects/.bestcases/03.nuxt3_starter-advanced-scan-1762499377644.json

========================================
🔍 Scanning: 50.dktechin/frontend
========================================
📊 Found 7 files (Vue: 1, TS: 6)
✅ BestCase saved: 50.dktechin-frontend-advanced-scan-1762499377693
📁 Location: /projects/.bestcases/50.dktechin-frontend-advanced-scan-1762499377693.json

✨ Auto BestCase Update Completed

⏰ Next scan in 6 hours...
```

## 스캔 주기 변경

`bestcase-updater.sh` 파일에서 스캔 주기를 변경할 수 있습니다:

```bash
# 현재 설정: 6시간 (21600초)
sleep 21600

# 1시간으로 변경
sleep 3600

# 12시간으로 변경
sleep 43200

# 24시간으로 변경
sleep 86400
```

변경 후 Docker 이미지를 재빌드하세요:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## 스캔 대상 프로젝트 추가/변경

`auto-scan-projects.js` 파일의 `PROJECTS_TO_SCAN` 배열을 수정하세요:

```javascript
const PROJECTS_TO_SCAN = [
  {
    name: '03.nuxt3_starter',
    path: `${PROJECTS_BASE_PATH}/03.nuxt3_starter`,
    category: 'advanced-scan'
  },
  {
    name: '50.dktechin/frontend',
    path: `${PROJECTS_BASE_PATH}/50.dktechin/frontend`,
    category: 'advanced-scan'
  },
  // 새 프로젝트 추가
  {
    name: 'my-new-project',
    path: `${PROJECTS_BASE_PATH}/my-new-project`,
    category: 'custom-scan'
  }
];
```

변경 후 재빌드:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## 수동 스캔 실행

컨테이너 내부에서 수동으로 스캔을 실행할 수 있습니다:

```bash
docker exec -it mcp-code-mode-server node /app/auto-scan-projects.js
```

## 저장된 BestCase 확인

### 로컬에서 확인
```bash
# Windows PowerShell
Get-ChildItem D:\01.Work\01.Projects\.bestcases\

# Windows CMD
dir D:\01.Work\01.Projects\.bestcases\
```

### VS Code MCP에서 확인
VS Code에서 Claude 또는 Copilot Chat을 열고:
```
저장된 BestCase 목록을 보여줘
```

## 트러블슈팅

### 스캔이 실행되지 않는 경우

1. **컨테이너 로그 확인**
   ```bash
   docker logs mcp-code-mode-server
   ```

2. **프로젝트 경로 확인**
   ```bash
   docker exec -it mcp-code-mode-server ls -la /projects
   ```

3. **수동 스캔 테스트**
   ```bash
   docker exec -it mcp-code-mode-server node /app/auto-scan-projects.js
   ```

### BestCase가 저장되지 않는 경우

1. **저장소 디렉토리 확인**
   ```bash
   docker exec -it mcp-code-mode-server ls -la /projects/.bestcases
   ```

2. **권한 문제 확인**
   ```bash
   docker exec -it mcp-code-mode-server touch /projects/.bestcases/test.txt
   ```

3. **볼륨 마운트 확인**
   ```bash
   docker inspect mcp-code-mode-server
   ```

### 스캔 주기가 작동하지 않는 경우

1. **백그라운드 프로세스 확인**
   ```bash
   docker exec -it mcp-code-mode-server ps aux | grep bestcase
   ```

2. **컨테이너 재시작**
   ```bash
   docker-compose restart mcp-code-mode
   ```

## 성능 고려사항

### 스캔 시간
- 작은 프로젝트 (< 10 파일): ~1초
- 중간 프로젝트 (10-100 파일): ~5초
- 큰 프로젝트 (> 100 파일): ~15초

### 리소스 사용
- CPU: 스캔 중 10-20%
- 메모리: ~100MB
- 디스크: BestCase당 ~10KB

### 최적화 팁
- 스캔 주기를 프로젝트 변경 빈도에 맞게 조정
- 불필요한 프로젝트는 목록에서 제거
- 큰 프로젝트는 파일 패턴을 제한

## 참고

- **자동 스캔 스크립트**: `auto-scan-projects.js`
- **업데이트 서비스**: `bestcase-updater.sh`
- **Docker 설정**: `Dockerfile`, `docker-compose.yml`
- **저장 위치**: `D:/01.Work/01.Projects/.bestcases/`

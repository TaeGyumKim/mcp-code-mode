# 환경변수 설정 가이드

프로젝트에서 사용하는 환경변수들을 정리한 문서입니다.

## 🔑 경로 변환 메커니즘

MCP Code Mode는 **호스트 경로**와 **컨테이너 경로**를 자동으로 변환합니다.

### 동작 방식

1. **클라이언트(VSCode Copilot)**가 호스트 경로 전달:
   ```
   D:/01.Work/01.Projects/myapp/src/index.ts
   ```

2. **filesystem API**가 자동으로 컨테이너 경로로 변환:
   ```
   /projects/myapp/src/index.ts
   ```

3. **Docker 볼륨 마운트**로 실제 파일 접근:
   ```yaml
   volumes:
     - D:/01.Work/01.Projects:/projects
   ```

### 경로 변환 규칙

| 입력 경로 | 변환 후 경로 | 설명 |
|----------|------------|------|
| `D:/01.Work/01.Projects/myapp/file.ts` | `/projects/myapp/file.ts` | Windows 호스트 경로 → 컨테이너 경로 |
| `/home/user/projects/myapp/file.ts` | `/projects/myapp/file.ts` | Linux 호스트 경로 → 컨테이너 경로 |
| `/projects/myapp/file.ts` | `/projects/myapp/file.ts` | 이미 컨테이너 경로 (변환 안함) |

---

## 필수 환경변수

### 1. HOST_PROJECTS_PATH

**용도:** 로컬 머신의 프로젝트 디렉토리 경로 (경로 변환의 기준)

**설정 위치:** `.env` 파일

**예시:**
```bash
# Windows
HOST_PROJECTS_PATH=D:/01.Work/01.Projects

# Linux
HOST_PROJECTS_PATH=/home/user/projects

# Mac
HOST_PROJECTS_PATH=/Users/username/projects
```

**설명:**
- Docker 컨테이너에 마운트할 호스트 머신의 프로젝트 경로
- `docker-compose.yml`에서 `${HOST_PROJECTS_PATH}:/projects` 형식으로 마운트됨
- **클라이언트가 전달하는 경로의 기준이 됨**
- filesystem API가 이 값을 사용하여 호스트 경로 → 컨테이너 경로 자동 변환

**중요:**
```bash
# ✅ 올바른 설정
HOST_PROJECTS_PATH=D:/01.Work/01.Projects

# ❌ 잘못된 설정 (백슬래시 사용)
HOST_PROJECTS_PATH=D:\01.Work\01.Projects

# ❌ 잘못된 설정 (경로 끝에 슬래시)
HOST_PROJECTS_PATH=D:/01.Work/01.Projects/
```

---

### 2. PROJECTS_PATH

**용도:** Docker 컨테이너 내부의 프로젝트 경로

**기본값:** `/projects`

**설정 위치:** `.env` 파일 (변경 불필요)

**설명:**
- 컨테이너 내부에서 프로젝트들이 위치하는 경로
- `projectContext.ts`에서 기본 경로로 사용됨
- filesystem API가 경로 변환 시 사용

---

## RAG (Retrieval Augmented Generation) 환경변수

### 3. OLLAMA_URL

**용도:** Ollama 서버 URL

**기본값:** `http://ollama:11434` (Docker) 또는 `http://localhost:11434` (로컬)

**설정 위치:** `.env` 파일, `docker-compose.ai.yml`

**예시:**
```bash
OLLAMA_URL=http://ollama:11434
# 또는
OLLAMA_URL=http://192.168.1.100:11434
```

**설명:**
- 임베딩 생성 및 코드 분석을 위한 LLM 연결
- Docker 환경에서는 서비스명 `ollama` 사용
- 로컬 환경에서는 `localhost` 사용

---

### 4. EMBEDDING_MODEL

**용도:** 벡터 임베딩에 사용할 Ollama 모델

**기본값:** `nomic-embed-text`

**설정 위치:** `.env` 파일, `docker-compose.ai.yml`

**권장 모델:**
- `nomic-embed-text`: 768차원, 균형 잡힌 성능 (권장)
- `mxbai-embed-large`: 1024차원, 더 높은 정확도
- `all-minilm`: 384차원, 빠른 속도

**⚠️ 중요 경고:**
```bash
# 모델 변경 시 기존 임베딩과 호환되지 않습니다!
# 모델 변경 후 반드시 재스캔 필요:
FORCE_REANALYZE=true yarn scan
```

**모델 다운로드:**
```bash
# Docker 컨테이너에서
docker exec -it ollama ollama pull nomic-embed-text

# 로컬에서
ollama pull nomic-embed-text
```

---

### 5. GENERATE_EMBEDDINGS

**용도:** 파일 스캔 시 임베딩 벡터 생성 여부

**기본값:** `true`

**설정 위치:** `.env` 파일

**예시:**
```bash
# RAG 활성화 (기본값)
GENERATE_EMBEDDINGS=true

# RAG 비활성화 (스캔 속도 향상)
GENERATE_EMBEDDINGS=false
```

**설명:**
- `true`: RAG 기반 의미적 검색 활성화
- `false`: 키워드 검색만 사용 (속도 향상)

---

### 6. LLM_MODEL

**용도:** 코드 분석에 사용할 LLM 모델

**기본값:** `qwen2.5-coder:7b`

**설정 위치:** `.env` 파일

**권장 모델:**
- `qwen2.5-coder:7b`: 코드 특화, 균형 잡힌 성능 (권장)
- `codellama:7b`: Meta의 코드 특화 모델
- `deepseek-coder:6.7b`: 가벼운 코드 모델

**설명:**
- 메타데이터 추출, 패턴 분석에 사용
- 코드 품질 점수 계산

---

## 스캔 환경변수

### 7. CONCURRENCY

**용도:** 동시에 분석할 파일 수

**기본값:** `2`

**설정 위치:** `docker-compose.ai.yml`

**예시:**
```bash
# 메모리 여유 시 병렬 처리 증가
CONCURRENCY=4

# 메모리 제한 시
CONCURRENCY=1
```

---

### 8. MAX_FILES_PER_PROJECT

**용도:** 프로젝트당 최대 스캔 파일 수

**기본값:** `50`

**설정 위치:** 환경변수

**예시:**
```bash
# 대규모 프로젝트
MAX_FILES_PER_PROJECT=100

# 빠른 스캔
MAX_FILES_PER_PROJECT=20
```

---

### 9. FORCE_REANALYZE

**용도:** 변경 여부와 관계없이 모든 파일 재분석

**기본값:** `false`

**설정 위치:** 환경변수

**사용 시나리오:**
```bash
# EMBEDDING_MODEL 변경 후
FORCE_REANALYZE=true yarn scan

# scoringVersion 업데이트 후
FORCE_REANALYZE=true yarn scan

# 기존 분석 결과 초기화
FORCE_REANALYZE=true yarn scan
```

---

## 선택적 환경변수

### EXAMPLE_PROJECT_PATH

**용도:** 예제 코드와 문서에서 사용할 프로젝트 경로

**기본값:** `/projects/49.airian/frontend-admin`

**설정 위치:** `.env` 파일

**예시:**
```bash
# Docker 환경에서 실행하는 경우 (컨테이너 경로)
EXAMPLE_PROJECT_PATH=/projects/your-project

# 로컬 환경에서 실행하는 경우 (호스트 경로)
EXAMPLE_PROJECT_PATH=D:/01.Work/01.Projects/your-project
```

---

## 예제: 경로 변환 사용

### 클라이언트에서 호스트 경로 전달

```javascript
// VSCode Copilot이 호스트 경로 전달
const hostPath = 'D:/01.Work/01.Projects/myapp/src/index.ts';

// filesystem API가 자동으로 컨테이너 경로로 변환
const result = await filesystem.readFile({ path: hostPath });
// 내부적으로 '/projects/myapp/src/index.ts'로 변환되어 접근
```

### sandbox 내부에서 컨테이너 경로 사용

```javascript
// sandbox 내부에서는 컨테이너 경로 사용
const containerPath = '/projects/myapp/src/index.ts';

// 그대로 사용 (변환 안함)
const result = await filesystem.readFile({ path: containerPath });
```

---

## 설정 방법

### 1. .env 파일 생성

```bash
cp .env.example .env
```

### 2. HOST_PROJECTS_PATH 설정 (가장 중요!)

```bash
# Windows
HOST_PROJECTS_PATH=D:/01.Work/01.Projects

# Linux
HOST_PROJECTS_PATH=/home/user/projects
```

### 3. Docker 재시작

```bash
docker-compose down
docker-compose up -d
```

---

## 트러블슈팅

### 파일을 찾을 수 없음

**해결:**
```bash
# .env 파일에서 올바른 경로 설정
HOST_PROJECTS_PATH=D:/01.Work/01.Projects
```

### Windows 경로 인식 오류

**해결:**
```bash
# ✅ 올바른 경로 (슬래시 사용)
HOST_PROJECTS_PATH=D:/01.Work/01.Projects
```

---

## 경로 변환 로직 (참고)

경로 변환은 `mcp-servers/filesystem/pathUtils.ts`에 구현되어 있습니다.

filesystem API들은 자동으로 이 변환을 적용합니다:
- `readFile()` - 호스트/컨테이너 경로 자동 변환
- `writeFile()` - 호스트/컨테이너 경로 자동 변환
- `searchFiles()` - 호스트/컨테이너 경로 자동 변환

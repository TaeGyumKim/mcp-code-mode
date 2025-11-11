# MCP 서버 테스트 가이드

## 📋 사전 준비

### 1. Docker 컨테이너 상태 확인

```powershell
# 컨테이너 실행 확인
docker ps | findstr mcp-code-mode-server

# 로그 확인
docker logs mcp-code-mode-server -f
```

### 2. BestCase 파일 확인

```powershell
# BestCase 저장소 확인 (Docker 내부)
docker exec -it mcp-code-mode-server ls -la /projects/.bestcases

# 특정 프로젝트 BestCase 확인
docker exec -it mcp-code-mode-server cat /projects/.bestcases/frontend-admin_auto-scan-ai.json
```

### 3. Guide 파일 확인

```powershell
# Guide 디렉토리 확인
ls .github\instructions\guidelines\

# 예시 Guide 파일 생성 (없는 경우)
# .github/instructions/guidelines/core-workflow.md
```

## 🧪 테스트 시나리오

### 테스트 1: BestCase 로드

#### VS Code Copilot Chat에서 실행:

```
외부 프로젝트에서 BestCase를 로드해주세요.
프로젝트명: 49.airian/frontend-admin
카테고리: auto-scan-ai
```

#### 기대 결과:

1. **성공 케이스:**
   ```json
   {
     "bestCase": {
       "id": "...",
       "projectName": "49.airian/frontend-admin",
       "category": "auto-scan-ai",
       "patterns": { ... }
     },
     "debug": {
       "storagePath": "/projects/.bestcases",
       "searchQuery": { ... },
       "resultsCount": 1
     }
   }
   ```

2. **실패 케이스 (파일 없음):**
   ```
   [loadBestCase] Search results: 0
   bestCase: null
   ```

#### 확인 사항:

- [ ] Storage 경로 로그 출력
- [ ] 검색 쿼리 로그 출력
- [ ] 검색 결과 개수 로그
- [ ] 파일 매칭 상세 로그 (BestCaseStorage)

### 테스트 2: Guide 로드

#### VS Code Copilot Chat에서 실행:

```typescript
await mcp_mcp-code-mode_execute({
  code: `
    const guide = await guides.loadGuide({ id: "core.workflow" });
    console.log('Guide:', guide.guide.summary);
  `
});
```

#### 기대 결과:

1. **성공 케이스:**
   ```
   [indexGuides] Scanning directory: /app/.github/instructions/guidelines
   [indexGuides] Found files: 1
   [indexGuides] Markdown files: 1
   [indexGuides] Loaded guide: {"id":"core.workflow",...}
   [loadGuide] Guide loaded successfully
   ```

2. **실패 케이스 (가이드 없음):**
   ```
   [loadGuide] Guide not found: core.workflow
   [loadGuide] Available guides: []
   Error: Guide not found: core.workflow
   ```

#### 확인 사항:

- [ ] 디렉토리 스캔 로그
- [ ] 발견된 파일 개수
- [ ] 메타데이터 파싱 성공
- [ ] 가이드 ID 목록 출력

### 테스트 3: 프로젝트 타입 감지

#### 준비:

외부 프로젝트 경로를 환경 변수로 설정

```typescript
const workspacePath = "D:/01.Work/01.Projects/49.airian/frontend-admin";
```

#### VS Code Copilot Chat에서 실행:

```
해당 프로젝트의 타입을 감지해주세요:
- Tailwind 사용 여부
- openerd-nuxt3 사용 여부
- Framework 종류
```

#### 기대 결과:

```
[detectProjectType] package.json dependencies: ["nuxt","openerd-nuxt3","tailwindcss"]
[detectProjectType] Tailwind detected
[detectProjectType] openerd-nuxt3 detected
[detectProjectType] Framework: nuxt3
[detectProjectType] Tailwind confirmed in nuxt.config.ts
[detectProjectType] openerd-nuxt3 confirmed in nuxt.config.ts
```

#### 확인 사항:

- [ ] package.json 읽기 성공
- [ ] Tailwind 감지
- [ ] openerd-nuxt3 감지
- [ ] Framework 타입 정확
- [ ] nuxt.config.ts 추가 검증

### 테스트 4: 프리플라이트 체크

#### VS Code Copilot Chat에서 실행:

```
새로운 Inquiry 목록 페이지를 생성해주세요.
- gRPC API 사용
- OTable 컴포넌트 사용
- 페이지네이션 포함
```

#### 기대 결과:

```
[buildRequestMetadata] Workspace path: D:/01.Work/01.Projects/49.airian/frontend-admin
[buildRequestMetadata] Project name: 49.airian/frontend-admin
[buildRequestMetadata] Intent: page-create
[buildRequestMetadata] Entities: ["inquiry"]
[preflightCheck] Starting preflight check
[preflightCheck] API type comparison: {"hinted":"auto","actual":"grpc"}
[checkApiFilesExist] Checking API files: ["composables/useGrpcClient.ts"]
[preflightCheck] All API files exist
[preflightCheck] openerd-nuxt3 detected
[preflightCheck] Tailwind detected
[preflightCheck] Risk score: 0
[searchGuides] Results: [{"id":"grpc-best-practices","score":65}]
```

#### 확인 사항:

- [ ] Intent 정확 감지
- [ ] Entities 추출 정확
- [ ] API 타입 BestCase와 일치
- [ ] API 파일 존재 확인
- [ ] UI 의존성 자동 감지
- [ ] 리스크 점수 계산
- [ ] 가이드 검색 결과

### 테스트 5: 통합 워크플로우

#### VS Code Copilot Chat에서 실행:

```
#file:main-ultra-compact.md

위 지침을 따라 Inquiry 목록 페이지를 생성해주세요.
```

#### 기대 흐름:

1. **1단계: 메타데이터 수집**
   ```
   [buildRequestMetadata] 로그 확인
   [detectProjectType] 로그 확인
   ```

2. **2단계: BestCase 검증**
   ```
   [loadBestCase] 로그 확인
   [BestCaseStorage] 로그 확인
   ```

3. **3단계: 프리플라이트 체크**
   ```
   [preflightCheck] 로그 확인
   [checkApiFilesExist] 로그 확인
   ```

4. **4단계: 가이드 검색/병합**
   ```
   [indexGuides] 로그 확인
   [searchGuides] 로그 확인
   ```

5. **5단계: 코드 생성**
   ```
   생성된 코드 확인
   ```

#### 확인 사항:

- [ ] 모든 단계 순차 실행
- [ ] 각 단계별 로그 출력
- [ ] 에러 없이 완료
- [ ] 생성된 코드 품질

## 🐛 디버깅 팁

### 로그 확인

```powershell
# 실시간 로그 (stderr)
docker logs mcp-code-mode-server -f 2>&1 | Select-String "\[load|\[index|\[search|\[preflight|\[detect|\[check"

# 특정 태그만 필터
docker logs mcp-code-mode-server 2>&1 | Select-String "\[loadBestCase\]"
```

### BestCase 디렉토리 확인

```powershell
# 컨테이너 내부 접속
docker exec -it mcp-code-mode-server /bin/sh

# 저장소 확인
ls -la /projects/.bestcases/

# 파일 내용 확인
cat /projects/.bestcases/*.json | jq '.projectName, .category'
```

### Guide 파일 확인

```powershell
# 가이드 디렉토리 확인
docker exec -it mcp-code-mode-server ls -la /app/.github/instructions/guidelines/

# 가이드 내용 확인
docker exec -it mcp-code-mode-server cat /app/.github/instructions/guidelines/core-workflow.md
```

## 🚨 문제 해결

### 문제 1: BestCase 로드 실패

**증상:**
```
[loadBestCase] Search results: 0
```

**해결:**
1. Storage 경로 확인
2. 파일명 형식 확인: `{projectName}_{category}.json`
3. projectName 일치 여부 확인
4. JSON 파싱 오류 확인

### 문제 2: Guide 로드 실패

**증상:**
```
[loadGuide] Guide not found: core.workflow
[loadGuide] Available guides: []
```

**해결:**
1. `.github/instructions/guidelines/` 디렉토리 존재 확인
2. Markdown 파일 존재 확인
3. YAML front matter 형식 확인
4. `id` 필드 값 일치 확인

### 문제 3: 프로젝트 타입 감지 실패

**증상:**
```
[detectProjectType] Failed to read package.json
```

**해결:**
1. 워크스페이스 경로 정확성 확인
2. filesystem MCP 서버 연결 확인
3. 파일 읽기 권한 확인

### 문제 4: 프리플라이트 실패 (risk >= 40)

**증상:**
```
[preflightCheck] Risk score: 42
mode: 'scaffold-only'
```

**해결:**
1. API 타입 불일치 해결
2. 누락된 의존성 설치
3. 쓰기 범위 조정
4. BestCase 업데이트

## ✅ 체크리스트

### 배포 전 확인

- [ ] Docker 이미지 빌드 성공
- [ ] 컨테이너 정상 실행
- [ ] BestCase 로드 테스트 통과
- [ ] Guide 로드 테스트 통과
- [ ] 프로젝트 타입 감지 테스트 통과
- [ ] 프리플라이트 체크 테스트 통과
- [ ] 통합 워크플로우 테스트 통과

### 외부 프로젝트 연동 확인

- [ ] BestCase 파일 생성 확인
- [ ] Guide 파일 준비 확인
- [ ] filesystem MCP 연결 확인
- [ ] 로그 출력 정상 확인
- [ ] 에러 핸들링 정상 확인

# MCP 서버 개선 사항 (2025-11-10)

## 🎯 문제점 분석

외부 프로젝트에서 MCP 서버 사용 시 발생한 문제:

1. ❌ **BestCase를 로드하지 못함**
   - 에러 로그 없이 실패
   - Storage 경로 확인 불가
   - 검색 쿼리 디버깅 어려움

2. ❌ **Guide 로드 검증 부재**
   - 로드 성공/실패 여부 알 수 없음
   - 어떤 가이드가 적용되는지 불명확

3. ❌ **API 존재 여부 미확인**
   - BestCase에 API 정보만 있고 실제 파일 존재 확인 안 함
   - API 연결 검증 로직 없음

4. ❌ **프로젝트 타입 자동 감지 안 됨**
   - Tailwind + openerd-nuxt3 프로젝트인데 감지 못 함
   - package.json, nuxt.config.ts 확인 로직 부재

5. ❌ **디버깅 정보 부족**
   - 각 단계별 로그 없음
   - 실패 원인 추적 어려움

## ✅ 해결 방안

### 1. BestCase 로드 개선 (`mcp-servers/bestcase/loadBestCase.ts`)

```typescript
// 추가된 기능:
- console.error로 모든 단계 로깅
- Storage 경로 출력
- 검색 쿼리 상세 로깅
- 검색 결과 개수 및 첫 번째 결과 정보
- debug 객체 반환 (storagePath, searchQuery, resultsCount)
```

**변경 내용:**
- Input 파라미터 로깅
- Storage 경로 확인
- 검색 조건 상세 출력
- 결과 개수 및 내용 확인

### 2. BestCase Storage 검증 강화 (`packages/bestcase-db/src/storage.ts`)

```typescript
// 추가된 기능:
- 파일 읽기 실패 시 에러 메시지
- projectName, category 매칭 실패 원인 출력
- 각 파일별 검증 결과 로깅
- 총 매칭 개수 출력
```

**변경 내용:**
- 디렉토리 읽기 실패 핸들링
- 파일별 매칭 검증 로그
- 불일치 원인 상세 출력

### 3. Guide 로드 검증 (`mcp-servers/guides/index.ts`)

#### indexGuides()
```typescript
// 추가된 기능:
- 스캔 디렉토리 경로 출력
- 발견된 파일 개수 로깅
- 메타데이터 없는 파일 스킵 로그
- 로드된 각 가이드 정보 출력
```

#### searchGuides()
```typescript
// 추가된 기능:
- 검색 입력 파라미터 로깅
- 상위 10개 결과 출력 (id, score, summary)
```

#### loadGuide()
```typescript
// 추가된 기능:
- 요청한 가이드 ID 로깅
- 가이드 없을 시 사용 가능한 모든 가이드 ID 출력
- 로드 성공 시 가이드 정보 출력
```

### 4. 프로젝트 타입 자동 감지 (`mcp-servers/guides/preflight.ts`)

#### detectProjectType() (신규 함수)
```typescript
// 기능:
1. package.json 읽기
   - Tailwind 확인 (dependencies, devDependencies)
   - openerd-nuxt3 확인
   - Framework 타입 감지 (Nuxt3, Next.js, Vue, React)

2. nuxt.config.ts 읽기 (추가 검증)
   - Tailwind 모듈 확인
   - openerd-nuxt3 모듈 확인

3. 반환 정보:
   - uiDeps.tailwind: boolean
   - uiDeps.openerdComponents: string[]
   - framework: string
```

#### buildRequestMetadata() 개선
```typescript
// 추가된 기능:
- 워크스페이스 경로 로깅
- 프로젝트명 추출 로그
- Intent 감지 로그
- Entities 추출 로그
- detectProjectType() 호출 및 결과 반영
```

### 5. API 존재 확인 (`mcp-servers/guides/preflight.ts`)

#### checkApiFilesExist() (신규 함수)
```typescript
// 기능:
1. BestCase에서 API 엔드포인트 파일 경로 추출
2. 각 파일 존재 여부 확인 (향후 filesystem API 연동)
3. 존재/누락 파일 목록 반환

// 반환:
{
  allExist: boolean,
  existing: string[],
  missing: string[]
}
```

#### preflightCheck() 개선
```typescript
// 추가된 검증:
1. API 파일 존재 확인
   - checkApiFilesExist() 호출
   - 누락 파일 경고

2. UI 의존성 자동 감지 반영
   - detectProjectType() 결과 사용
   - Tailwind 확인 결과
   - openerd-nuxt3 컴포넌트 목록

3. 상세 로깅
   - 모든 검증 단계 로그
   - API 타입 비교
   - 쓰기 범위 확인
   - 리스크 점수 계산
```

### 6. 지침 문서 업데이트 (`main-ultra-compact.md`)

```markdown
추가된 섹션:
- 📋 실행 순서 (5단계 상세 설명)
- 🔍 디버깅 정보 (로그 태그 설명)
- 🚨 에러 처리 (3가지 실패 시나리오)
- projectName 형식 예시
```

## 📊 로그 출력 예시

### BestCase 로드
```
[loadBestCase] Input: {"projectName":"frontend-admin","category":"auto-scan-ai"}
[loadBestCase] Storage path: /projects/.bestcases
[loadBestCase] Searching: {"projectName":"frontend-admin","category":"auto-scan-ai"}
[BestCaseStorage] Search query: {"projectName":"frontend-admin","category":"auto-scan-ai"}
[BestCaseStorage] Files in storage: 5
[BestCaseStorage] Checking file: frontend-admin_auto-scan-ai.json
[BestCaseStorage] Match found: frontend-admin_auto-scan-ai.json
[loadBestCase] Search results: 1
```

### Guide 로드
```
[indexGuides] Scanning directory: /app/.github/instructions/guidelines
[indexGuides] Found files: 10
[indexGuides] Markdown files: 8
[indexGuides] Loaded guide: {"id":"core.workflow","scope":"global","priority":100}
[loadGuide] Loading guide: core.workflow
[loadGuide] Guide loaded successfully: {"id":"core.workflow","scope":"global","priority":100}
```

### 프로젝트 타입 감지
```
[buildRequestMetadata] Workspace path: D:/01.Work/01.Projects/49.airian/frontend-admin
[buildRequestMetadata] Project name: 49.airian/frontend-admin
[detectProjectType] package.json dependencies: ["nuxt","openerd-nuxt3","tailwindcss"]
[detectProjectType] Tailwind detected
[detectProjectType] openerd-nuxt3 detected
[detectProjectType] Framework: nuxt3
```

### 프리플라이트 체크
```
[preflightCheck] Starting preflight check
[preflightCheck] API type comparison: {"hinted":"auto","actual":"grpc"}
[checkApiFilesExist] Checking API files: ["composables/useGrpcClient.ts"]
[preflightCheck] All API files exist
[preflightCheck] openerd-nuxt3 detected
[preflightCheck] Tailwind detected
[preflightCheck] Risk score: 0
```

## 🚀 사용 방법

### Docker 재빌드 필수

```bash
# 1. 컨테이너 중지
docker-compose down

# 2. 이미지 재빌드 (캐시 없이)
docker-compose build --no-cache

# 3. 컨테이너 시작
docker-compose up -d

# 4. 로그 확인
docker logs mcp-code-mode-server -f
```

### VS Code에서 테스트

```typescript
// MCP Code Mode 도구 사용
await mcp_mcp-code-mode_execute({
  code: `
    const bestCase = await bestcase.loadBestCase({
      projectName: '49.airian/frontend-admin',
      category: 'auto-scan-ai'
    });
    
    console.log('BestCase:', bestCase);
  `
});
```

## ✨ 개선 효과

1. **디버깅 용이성 향상**
   - 모든 단계에서 상세 로그 제공
   - 실패 원인 즉시 파악 가능

2. **자동 감지 기능 추가**
   - 프로젝트 타입 자동 인식
   - API 파일 존재 확인

3. **에러 핸들링 강화**
   - 각 검증 단계별 실패 처리
   - 리스크 점수 기반 안전장치

4. **문서화 개선**
   - 사용 예시 추가
   - 에러 시나리오 가이드

## 🔄 다음 단계

1. **Filesystem API 연동**
   - checkApiFilesExist()에서 실제 파일 존재 확인
   - fs.access() 또는 workspace-fs MCP 사용

2. **TypeScript 검증**
   - tsc --noEmit 실행
   - 타입 에러 사전 감지

3. **Guide 파일 생성**
   - `.github/instructions/guidelines/` 디렉토리에 가이드 추가
   - YAML front matter 형식 예시 제공

4. **BestCase 데이터 확인**
   - 외부 프로젝트 BestCase 생성 여부 확인
   - auto-scan-ai 실행 스케줄 설정

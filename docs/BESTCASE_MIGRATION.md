# BestCase 버전 마이그레이션 가이드

BestCase 데이터 형식이 변경되었을 때, 구버전 BestCase를 새 형식으로 자동 마이그레이션하는 방법을 설명합니다.

## 버전 히스토리

| 버전 | 특징 | 필드 |
|------|------|------|
| **v1.0** | 단일 점수 기반 | `patterns.score` (단일 숫자) |
| **v1.5** | 메타데이터 기반 | `patterns.metadata` (ProjectMetadata) |
| **v2.0** | 다차원 점수 | `scores` (8차원), `totalScore`, `excellentIn` |

## 버전 감지

BestCase의 버전을 다음과 같이 판별합니다:

```typescript
// v2.0 (최신)
{
  scores: { structure: 85, apiConnection: 90, ... },  // 8차원 점수
  totalScore: 85,                                      // 가중 평균
  excellentIn: ['structure', 'apiConnection'],        // 우수 영역
  patterns: {
    metadata: { ... }                                  // ProjectMetadata
  }
}

// v1.5 (메타데이터만)
{
  patterns: {
    metadata: { ... }                                  // ProjectMetadata 있음
  }
  // scores, totalScore, excellentIn 없음
}

// v1.0 (구버전)
{
  patterns: {
    score: 75,                                         // 단일 점수
    apiInfo: { ... },
    componentUsage: { ... }
  }
  // metadata 없음
}
```

## 마이그레이션 스크립트

### 1. 버전 체크 (드라이 런)

```bash
# 현재 상태 확인만 (변경 없음)
yarn scan:migrate:dry
```

**출력 예시**:
```
🔍 Checking 15 BestCases for version compatibility...

📦 sample-project-list-xxx
   Version: 1.5
   Needs Migration: true
   ⚠️ [DRY RUN] Would migrate from 1.5 to 2.0

📊 Migration Summary:
   Total BestCases: 15
   Already v2.0: 10
   Needs Migration: 5
   [DRY RUN] No changes made
```

### 2. 실제 마이그레이션

```bash
# 마이그레이션 실행
yarn scan:migrate

# 상세 로그 보기
yarn scan:migrate --verbose
```

**마이그레이션 작업**:
- v1.0 → v1.5: 기본 메타데이터 생성
- v1.5 → v2.0: 다차원 점수 계산
- 태그 업데이트: `multi-score`, `v2.0`, `score-XX`, `excellent-XXX`

### 3. 자동 스캔 + 마이그레이션

```bash
# 마이그레이션 + 재분석 + 새 프로젝트 스캔
yarn scan:auto-migrate
```

**프로세스**:
1. **Phase 1**: 기존 BestCase 버전 체크 및 마이그레이션
2. **Phase 2**: 구버전 BestCase가 있는 프로젝트 재분석
3. **Phase 3**: 새 프로젝트 스캔

## Docker Cronjob 설정

Docker 환경에서는 매주 일요일 새벽 2시에 자동으로 실행됩니다.

```yaml
# docker-compose.ai.yml
cron-scheduler:
  environment:
    - REANALYZE_OLD_VERSIONS=true        # 구버전 재분석
    - MAX_REANALYZE_COUNT=10             # 최대 재분석 프로젝트 수
    - FORCE_REANALYZE=false              # 강제 재분석
```

**cron-scan.sh 실행 순서**:
1. Ollama 서버 상태 확인
2. BestCase 버전 체크 (드라이 런)
3. 마이그레이션 + 재분석 + 새 스캔 실행

## 수동 마이그레이션

### 특정 BestCase 마이그레이션

```typescript
import {
  checkBestCaseVersion,
  migrateBestCase
} from './scripts/scan/migrate-bestcases.js';

// 버전 체크
const versionInfo = checkBestCaseVersion(bestCase);
console.log('Version:', versionInfo.version);
console.log('Needs Migration:', versionInfo.needsMigration);

// 마이그레이션
if (versionInfo.needsMigration) {
  const result = await migrateBestCase(bestCase);
  console.log('Changes:', result.changes);

  // 저장
  await storage.save(bestCase);
}
```

### 전체 마이그레이션

```typescript
import { migrateAllBestCases } from './scripts/scan/migrate-bestcases.js';

const result = await migrateAllBestCases({
  dryRun: false,    // 실제 실행
  verbose: true     // 상세 로그
});

console.log('Migrated:', result.migrated);
console.log('Failed:', result.failed);
```

## 마이그레이션 후 재분석

마이그레이션은 기존 정보만으로 점수를 계산합니다. 더 정확한 분석을 위해서는 **재분석**이 필요합니다.

```bash
# 환경 변수 설정
export REANALYZE_OLD_VERSIONS=true
export MAX_REANALYZE_COUNT=20

# 실행
yarn scan:auto-migrate
```

**재분석 과정**:
1. 구버전 BestCase 감지
2. 해당 프로젝트의 구버전 BestCase 삭제
3. AI 기반 메타데이터 재분석 (Ollama LLM)
4. 새 다차원 점수 계산
5. 새 BestCase 저장

## 점수 계산 로직

메타데이터에서 다차원 점수를 계산하는 방법:

```typescript
import { calculateScoresFromMetadata } from 'llm-analyzer';

const scores = calculateScoresFromMetadata(metadata, isProjectLevel);

// 결과:
{
  structure: 85,        // 파일 구조
  apiConnection: 90,    // API 연동
  designSystem: 88,     // UI 컴포넌트
  utilityUsage: 75,     // 유틸리티 활용
  errorHandling: 85,    // 에러 처리
  typeUsage: 92,        // TypeScript 타입
  stateManagement: 80,  // 상태 관리
  performance: 78       // 성능 최적화
}
```

**점수 산정 기준**:
- API 타입 감지: +20점
- 프레임워크 사용: +10점
- 패턴 수: 패턴당 +5점
- 에러 처리 품질: 최대 +15점
- 타입 정의 품질: 최대 +15점
- 컴포넌트 사용: 컴포넌트당 +3점
- 메서드 수: 메서드당 +2점

## 문제 해결

### 마이그레이션 실패 시

```bash
# 실패한 BestCase 확인
yarn scan:migrate --verbose

# 수동으로 삭제 후 재분석
rm /projects/.bestcases/problematic-bestcase.json
yarn scan:auto-migrate
```

### Ollama 서버 연결 실패

```bash
# Docker 환경에서 확인
docker logs ollama-code-analyzer

# 수동 마이그레이션 (LLM 없이)
yarn scan:migrate  # 메타데이터 기반 점수만 계산
```

### 태그 중복

마이그레이션 시 자동으로 중복 제거됩니다:

```typescript
bestCase.metadata.tags = [...new Set(bestCase.metadata.tags)];
```

## 모범 사례

1. **정기적 실행**: Cronjob으로 매주 자동 마이그레이션/재분석
2. **백업**: 마이그레이션 전 `.bestcases` 폴더 백업
3. **드라이 런**: 실제 마이그레이션 전 항상 `--dry-run` 먼저 실행
4. **점진적 재분석**: `MAX_REANALYZE_COUNT`로 한 번에 처리할 개수 제한
5. **로그 확인**: Docker 로그로 진행 상황 모니터링

```bash
docker logs -f bestcase-cron-scheduler
```

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `REANALYZE_OLD_VERSIONS` | `true` | 구버전 프로젝트 재분석 여부 |
| `MAX_REANALYZE_COUNT` | `10` | 한 번에 재분석할 최대 프로젝트 수 |
| `FORCE_REANALYZE` | `false` | 모든 프로젝트 강제 재분석 |
| `BESTCASE_STORAGE_PATH` | `/projects/.bestcases` | BestCase 저장 경로 |
| `LLM_MODEL` | `qwen2.5-coder:7b` | 분석용 LLM 모델 |
| `CONCURRENCY` | `2` | 동시 분석 파일 수 |

---

**마지막 업데이트**: 2025-11-17
**버전**: 2.0.0

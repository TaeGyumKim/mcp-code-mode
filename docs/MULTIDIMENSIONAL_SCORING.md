# 🎯 다차원 BestCase 점수 시스템

> **핵심**: 전체 점수가 낮아도 특정 영역에서 우수한 코드를 저장하고 검색할 수 있습니다.

## 📋 목차

1. [개요](#-개요)
2. [왜 다차원 점수인가?](#-왜-다차원-점수인가)
3. [8가지 평가 카테고리](#-8가지-평가-카테고리)
4. [저장 기준](#-저장-기준)
5. [인덱싱 시스템](#-인덱싱-시스템)
6. [검색 API](#-검색-api)
7. [실전 예시](#-실전-예시)
8. [마이그레이션 가이드](#-마이그레이션-가이드)

## 🎯 개요

### 기존 문제점

```
❌ 전체 점수 기반 (단일 차원)
- A 페이지: 구조 100점, API 40점 → 평균 70점 → ❌ 저장 안됨
- B 페이지: 구조 60점, 디자인 100점 → 평균 80점 → ✅ 저장
```

**문제**: A 페이지의 우수한 구조(100점)를 잃어버림!

### 해결책: 다차원 점수 시스템

```
✅ 카테고리별 점수 (8개 차원)
- A 페이지: structure=100, apiConnection=40 → ✅ 저장 (구조 우수)
- B 페이지: structure=60, designSystem=100 → ✅ 저장 (디자인 우수)
- C 페이지: structure=50, utilityUsage=95 → ✅ 저장 (유틸리티 우수)
```

**장점**: 모든 우수 영역을 보존하고 검색 가능!

## 💡 왜 다차원 점수인가?

### 사용 시나리오

**시나리오 1**: "API 연결이 잘 된 코드 찾기"
```typescript
// ✅ 다차원 점수 - 가능!
const apiExcellent = await storage.findExcellentInCategory('apiConnection');
// → apiConnection >= 80점인 모든 BestCase 반환

// ❌ 전체 점수 - 불가능
// 전체 점수로는 API 연결만 검색할 수 없음
```

**시나리오 2**: "구조는 좋은데 API는 부족한 프로젝트 개선"
```typescript
// ✅ 구조 우수 케이스 참고
const structureExamples = await storage.findExcellentInCategory('structure');

// ✅ API 우수 케이스 참고
const apiExamples = await storage.findExcellentInCategory('apiConnection');

// → 두 영역을 모두 학습 가능!
```

**시나리오 3**: "프로젝트별 강점/약점 파악"
```typescript
const bestCase = await storage.load('my-project-123');

console.log(bestCase.scores);
// {
//   structure: 92,        // 🟢 강점!
//   apiConnection: 88,    // 🟢 강점!
//   designSystem: 65,     // 🟡 보통
//   errorHandling: 45,    // 🔴 약점 - 개선 필요!
// }

// → errorHandling 우수 케이스 찾아서 학습
const errorExamples = await storage.findExcellentInCategory('errorHandling');
```

## 🏆 8가지 평가 카테고리

각 카테고리는 0-100점으로 평가되며, 80점 이상이면 "우수"로 판정됩니다.

### 1. structure (구조) - 가중치 15%

**평가 항목**:
- 파일/폴더 구조의 논리성
- 컴포넌트/함수 분리 수준
- 네이밍 일관성
- 폴더 카테고리 다양성

**예시**:
```
✅ 우수 (90점+)
src/
  ├── pages/          # 명확한 분리
  ├── composables/
  ├── api/
  ├── utils/
  └── types/

❌ 부족 (40점-)
src/
  ├── components/     # 모든 파일이 한 곳에
  └── utils/
```

### 2. apiConnection (API 연결) - 가중치 15%

**평가 항목**:
- gRPC/REST API 활용도
- 에러 핸들링
- 로딩 상태 처리
- API 타입 활용

**예시**:
```typescript
// ✅ 우수 (85점+)
const client = useGrpcClient();

try {
  const { data, error } = await client.getUser({ id: 123 });
  if (error) {
    toast.error(getErrorMessage(error));
    return;
  }
  // ... 성공 처리
} catch (err) {
  logger.error('API call failed', err);
}

// ❌ 부족 (40점-)
const data = await fetch('/api/user/123').then(r => r.json());
// 에러 처리 없음, 타입 없음
```

### 3. designSystem (디자인 시스템) - 가중치 12%

**평가 항목**:
- UI 컴포넌트 일관성
- 디자인 시스템 감지
- 컴포넌트 사용 통계
- 테마/스타일 적용

**예시**:
```vue
<!-- ✅ 우수 (85점+) - 일관된 디자인 시스템 사용 -->
<template>
  <CommonLayout>
    <CommonTable :data="users" />
    <CommonButton @click="add">추가</CommonButton>
  </CommonLayout>
</template>

<!-- ❌ 부족 (40점-) - 혼재된 스타일 -->
<template>
  <div>
    <table> <!-- 직접 구현 -->
    <el-button> <!-- element-plus -->
    <v-btn> <!-- vuetify -->
  </div>
</template>
```

### 4. utilityUsage (유틸리티 활용) - 가중치 10%

**평가 항목**:
- lodash, date-fns 등 활용
- 커스텀 유틸 함수
- Composables 재사용성

**예시**:
```typescript
// ✅ 우수 (80점+)
import { debounce, get, chunk } from 'lodash';
import { format, parseISO } from 'date-fns';
import { useLocalStorage, useMouse } from 'vueuse';

// ❌ 부족 (30점-)
// 직접 구현 (lodash 설치되어 있는데도)
function debounce(fn, delay) { ... }
```

### 5. errorHandling (에러 핸들링) - 가중치 15%

**평가 항목**:
- try-catch 적용
- 사용자 친화적 메시지
- Fallback UI
- 에러 로깅

**예시**:
```vue
<script setup>
// ✅ 우수 (90점+)
const { data, error, refresh } = await useAsyncData(async () => {
  try {
    return await api.getUsers();
  } catch (err) {
    logger.error('Failed to fetch users', err);
    toast.error('사용자 목록을 불러올 수 없습니다.');
    throw err;
  }
});
</script>

<template>
  <CommonAsyncBoundary :error="error" :on-retry="refresh">
    <UserList :data="data" />
  </CommonAsyncBoundary>
</template>

<!-- ❌ 부족 (20점-) -->
<script setup>
const data = await api.getUsers(); // 에러 처리 없음
</script>

<template>
  <div v-if="data">{{ data }}</div>
  <!-- 에러 UI 없음 -->
</template>
```

### 6. typeUsage (타입 활용) - 가중치 13%

**평가 항목**:
- 타입 정의 완성도
- 제네릭 활용
- 타입 추론 최적화
- any 사용 최소화

**예시**:
```typescript
// ✅ 우수 (85점+)
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser<T extends User>(id: number): Promise<T> {
  return api.get<T>(`/users/${id}`);
}

// ❌ 부족 (30점-)
function getUser(id: any): any {
  return api.get('/users/' + id);
}
```

### 7. stateManagement (상태 관리) - 가중치 10%

**평가 항목**:
- Pinia/Vuex 활용
- Composable 패턴
- 상태 불변성
- 사이드 이펙트 관리

**예시**:
```typescript
// ✅ 우수 (85점+)
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([]);

  const fetchUsers = async () => {
    const data = await api.getUsers();
    users.value = data;
  };

  return { users: readonly(users), fetchUsers };
});

// ❌ 부족 (35점-)
// 글로벌 변수 사용
let users = [];
```

### 8. performance (성능) - 가중치 10%

**평가 항목**:
- Lazy loading
- Computed 활용
- 불필요한 리렌더링 방지
- 메모이제이션

**예시**:
```vue
<script setup>
// ✅ 우수 (80점+)
const filteredUsers = computed(() => {
  return users.value.filter(u => u.active);
});

const debouncedSearch = useDebounceFn((query) => {
  search(query);
}, 300);
</script>

<template>
  <VirtualScroller :items="filteredUsers" />
</template>

<!-- ❌ 부족 (30점-) -->
<script setup>
const filteredUsers = users.filter(u => u.active); // 매번 재계산
</script>

<template>
  <div v-for="user in users">{{ user }}</div> <!-- 대량 렌더링 -->
</template>
```

## 💾 저장 기준

다음 조건 중 **하나만 만족**하면 BestCase로 저장됩니다:

### 조건 1: 전체 점수 우수 (70점 이상)

```typescript
총점 = structure×15% + apiConnection×15% + designSystem×12% +
       utilityUsage×10% + errorHandling×15% + typeUsage×13% +
       stateManagement×10% + performance×10%

if (총점 >= 70) → ✅ 저장
```

### 조건 2: 하나 이상의 영역 우수 (80점 이상)

```typescript
if (scores.structure >= 80 ||
    scores.apiConnection >= 80 ||
    scores.designSystem >= 80 ||
    // ... 다른 카테고리
) → ✅ 저장
```

**예시**:
- 구조 92점, 나머지 50점 → 총점 낮지만 ✅ 저장 (구조 우수)
- 디자인 88점, 나머지 45점 → 총점 낮지만 ✅ 저장 (디자인 우수)

### 조건 3: 중요 카테고리 특출 (85점 이상)

중요 카테고리: `structure`, `apiConnection`, `errorHandling`

```typescript
if (scores.structure >= 85 ||
    scores.apiConnection >= 85 ||
    scores.errorHandling >= 85
) → ✅ 저장
```

### 조건 4: 최소 기준 충족 (40점 이상)

```typescript
if (총점 >= 40) → ✅ 저장
```

**결과**: 거의 모든 코드가 저장되며, 특정 영역별로 검색 가능!

## 📑 인덱싱 시스템

BestCase 저장 시 자동으로 인덱스가 생성/업데이트됩니다.

### 인덱스 구조

```typescript
interface BestCaseIndex {
  version: string;
  indexedAt: string;
  totalCases: number;

  // 프로젝트별
  byProject: {
    "my-project": ["bc-001", "bc-002"]
  };

  // 우수 카테고리별 (80점 이상)
  byExcellence: {
    structure: ["bc-001", "bc-003"],
    apiConnection: ["bc-002"],
    designSystem: ["bc-004", "bc-005"],
    // ...
  };

  // 태그별
  byTag: {
    vue3: ["bc-001", "bc-002"],
    grpc: ["bc-002", "bc-003"]
  };

  // 점수대별
  byScoreGrade: {
    excellent: ["bc-001"],  // 85점 이상
    good: ["bc-002"],       // 70-84점
    fair: ["bc-003"],       // 50-69점
    poor: []                // 50점 미만
  };

  // 빠른 조회용 요약
  summary: [
    {
      id: "bc-001",
      projectName: "my-project",
      totalScore: 88,
      excellentIn: ["structure", "apiConnection"],
      tags: ["vue3", "grpc"]
    }
  ]
}
```

### 인덱스 위치

```
/projects/.bestcases/
  ├── bc-001.json        # BestCase 파일
  ├── bc-002.json
  ├── bc-003.json
  └── index.json         # ⭐ 자동 생성 인덱스
```

## 🔍 검색 API

### 1. 특정 카테고리 검색

```typescript
// 구조가 우수한 케이스 (structure >= 80)
const structureExcellent = await storage.findExcellentInCategory('structure');

// API 연결이 우수한 케이스
const apiExcellent = await storage.findExcellentInCategory('apiConnection');

// 디자인 시스템이 우수한 케이스
const designExcellent = await storage.findExcellentInCategory('designSystem');
```

### 2. 복수 카테고리 검색 (OR 조건)

```typescript
// 구조 또는 API 연결이 우수한 케이스
const results = await storage.findExcellentInAnyCategory([
  'structure',
  'apiConnection'
]);
```

### 3. 점수대별 검색

```typescript
// 85점 이상 (excellent)
const excellent = await storage.findByScoreGrade('excellent');

// 70-84점 (good)
const good = await storage.findByScoreGrade('good');

// 50-69점 (fair)
const fair = await storage.findByScoreGrade('fair');
```

### 4. 최소 점수 검색

```typescript
// 75점 이상
const highScores = await storage.findByMinScore(75);

// 60점 이상
const mediumScores = await storage.findByMinScore(60);
```

### 5. 복합 조건 검색

```typescript
// 특정 프로젝트의 API 우수 케이스
const results = await storage.searchByIndex({
  projectName: 'my-ecommerce',
  excellentIn: ['apiConnection']
});

// vue3 태그 + 구조 우수 + 70점 이상
const results = await storage.searchByIndex({
  tags: ['vue3'],
  excellentIn: ['structure'],
  minTotalScore: 70
});
```

## 📚 실전 예시

### 시나리오 1: 프로젝트 강점 파악

```typescript
// 1. BestCase 로드
const bestCase = await storage.load('my-project-001');

// 2. 점수 확인
console.log('강점 분석:');
Object.entries(bestCase.scores).forEach(([category, score]) => {
  const grade = score >= 85 ? '🟢 매우 우수' :
                score >= 70 ? '🟡 우수' :
                score >= 50 ? '🟠 보통' : '🔴 개선 필요';
  console.log(`${category}: ${score}점 ${grade}`);
});

// 출력:
// structure: 92점 🟢 매우 우수
// apiConnection: 88점 🟢 매우 우수
// designSystem: 65점 🟠 보통
// errorHandling: 42점 🔴 개선 필요
// ...

// 3. 약점 개선을 위한 참고 케이스 검색
const errorHandlingExamples = await storage.findExcellentInCategory('errorHandling');
console.log(`에러 핸들링 우수 사례 ${errorHandlingExamples.length}개 발견`);
```

### 시나리오 2: 신규 프로젝트 시작 - 참고 코드 검색

```typescript
// 요구사항: Vue3 + gRPC 프로젝트, 구조와 API 패턴 참고 필요

// 1. Vue3 태그 + gRPC 태그 검색
const vue3GrpcProjects = await storage.searchByIndex({
  tags: ['vue3', 'grpc']
});

// 2. 구조가 우수한 케이스 필터링
const structureExamples = vue3GrpcProjects.filter(bc =>
  bc.excellentIn?.includes('structure')
);

// 3. API 연결이 우수한 케이스 필터링
const apiExamples = vue3GrpcProjects.filter(bc =>
  bc.excellentIn?.includes('apiConnection')
);

// 4. 파일 참고
console.log('구조 참고:', structureExamples[0].files);
console.log('API 참고:', apiExamples[0].files);
```

### 시나리오 3: 코드 리뷰 - 개선점 제안

```typescript
// 1. 현재 프로젝트 분석
const analyzer = new MetadataAnalyzer({ ... });
const currentMeta = await analyzer.analyzeProject(projectPath, files);

// 2. 점수 계산
const currentScores = calculateScoresFromMetadata(currentMeta);
// {
//   structure: 65,
//   apiConnection: 88,
//   errorHandling: 35,  // 🔴 약점!
//   ...
// }

// 3. 약점 영역 개선 사례 검색
if (currentScores.errorHandling < 60) {
  const examples = await storage.findExcellentInCategory('errorHandling');

  console.log('개선 제안:');
  console.log(`에러 핸들링이 부족합니다 (${currentScores.errorHandling}점)`);
  console.log(`다음 우수 사례를 참고하세요:`);

  examples.slice(0, 3).forEach(ex => {
    console.log(`- ${ex.projectName}: ${ex.scores.errorHandling}점`);
    console.log(`  파일: ${ex.files[0].path}`);
  });
}
```

## 🔄 마이그레이션 가이드

### 기존 BestCase (단일 점수)

```json
{
  "id": "old-case-001",
  "projectName": "legacy-project",
  "patterns": {
    "score": 75,
    "metadata": { ... }
  }
}
```

### 새 BestCase (다차원 점수)

```json
{
  "id": "new-case-001",
  "projectName": "modern-project",

  "scores": {
    "structure": 92,
    "apiConnection": 88,
    "designSystem": 75,
    "utilityUsage": 82,
    "errorHandling": 70,
    "typeUsage": 85,
    "stateManagement": 68,
    "performance": 78
  },

  "totalScore": 80,
  "excellentIn": ["structure", "apiConnection", "typeUsage"],

  "patterns": {
    "metadata": { ... },
    // ✅ 기존 score 필드 유지 (하위 호환성)
    "score": 80
  }
}
```

### 하위 호환성

- ✅ 기존 BestCase (`patterns.score` 사용) 그대로 작동
- ✅ 새 BestCase (`scores` + `totalScore` 사용) 동시 지원
- ✅ 검색 API는 두 형식 모두 처리

### 기존 코드 수정 불필요

```typescript
// ✅ 기존 코드 - 여전히 작동함
const cases = await storage.search({ projectName: 'my-project' });

// ✅ 새 기능 - 추가 사용 가능
const excellentStructure = await storage.findExcellentInCategory('structure');
```

## 📊 테스트 스크립트

### 기본 테스트

```bash
# 다차원 점수 시스템 테스트
npx tsx scripts/test/test-multidimensional-scoring.ts
```

**출력 예시**:
```
=== 1. 점수 계산 테스트 ===
📊 Project Metadata 점수 계산:
  structure: 87
  apiConnection: 71.5
  designSystem: 75
  ...
총점: 73/100
우수 영역: structure, utilityUsage

=== 2. 인덱싱 및 검색 테스트 ===
📑 인덱스 생성 중...
총 케이스: 3개
🔍 검색 테스트:
1️⃣ 구조가 우수한 케이스 검색: 1개
2️⃣ API 연결이 우수한 케이스 검색: 1개
...
```

### 전체 워크플로우 검증

```bash
# E2E 워크플로우 테스트
npx tsx scripts/test/validate-complete-workflow.ts
```

**출력 예시**:
```
=== Step 1-4: 프로젝트 분석 및 저장 ===
📦 프로젝트: ecommerce-frontend
1️⃣ 메타데이터 분석 완료
2️⃣ 다차원 점수 계산 중...
   점수: structure=86, apiConnection=71.5, ...
   총점: 74/100
3️⃣ 저장 기준 판정 중...
   결과: ✅ 저장
4️⃣ BestCase 저장 중...
   ✅ 저장 완료

=== Step 5: 인덱스 자동 생성 확인 ===
✅ 인덱스 자동 생성 확인
   총 케이스: 3개

=== Step 6: 검색 API 활용 ===
1️⃣ 구조가 우수한 케이스 검색: 1개
...
```

## 📖 관련 문서

- **전체 워크플로우**: [WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md)
- **메타데이터 시스템**: [METADATA_SYSTEM.md](./METADATA_SYSTEM.md)
- **BestCase 규칙**: [BESTCASE_RULES_SUMMARY.md](./BESTCASE_RULES_SUMMARY.md)
- **프로젝트 구조**: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## ❓ FAQ

**Q: 기존 BestCase는 어떻게 되나요?**
A: 그대로 유지됩니다. 기존 `patterns.score` 필드와 새 `scores` 필드를 모두 지원합니다.

**Q: 인덱스는 자동으로 업데이트되나요?**
A: 네, BestCase `save()` 또는 `delete()` 시 자동으로 재구축됩니다.

**Q: 점수는 어떻게 계산되나요?**
A: `calculateScoresFromMetadata()` 함수가 ProjectMetadata/FileMetadata로부터 자동 계산합니다. LLM 호출 불필요.

**Q: 특정 카테고리 점수만 올리려면?**
A: 해당 카테고리에서 우수한 BestCase를 검색하여 패턴을 학습하세요.
```typescript
const examples = await storage.findExcellentInCategory('errorHandling');
```

**Q: 검색 성능은 어떤가요?**
A: 인덱스 기반 검색으로 매우 빠릅니다 (O(1) ~ O(log n)).

## 🎉 결론

다차원 점수 시스템으로:

✅ **모든 우수 영역 보존**: 전체 점수 낮아도 특정 영역 우수하면 저장
✅ **세밀한 검색**: 카테고리별, 점수대별, 태그별 검색
✅ **정확한 분석**: 프로젝트 강점/약점 파악
✅ **효율적 학습**: 필요한 영역만 골라서 참고
✅ **하위 호환성**: 기존 코드 수정 불필요

이제 "A는 구조 100점, B는 디자인 100점" 처럼 각 영역별 우수성을 기록하고 활용할 수 있습니다!

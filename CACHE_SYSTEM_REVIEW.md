# 캐싱 시스템 점검 보고서

**날짜**: 2025-11-17
**검토 대상**: mcp-stdio-server.ts (머지 후 버전)

---

## 요약

머지 후 캐싱 시스템에서 **3가지 주요 이슈**와 **2가지 개선 사항**을 발견했습니다.

| 항목 | 상태 | 심각도 |
|------|------|--------|
| 환경 변수 네이밍 불일치 | ❌ 문제 | 중간 |
| 캐시 통계 함수 누락 | ⚠️ 누락 | 낮음 |
| onFileCaseSaved 미사용 | ⚠️ 주의 | 낮음 |
| LRU 알고리즘 | ✅ 정상 | - |
| 파일 워처 연동 | ✅ 정상 | - |

---

## 1. 환경 변수 네이밍 불일치 ❌

### 문제

**코드**:
```typescript
// mcp-stdio-server.ts:30
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE || '100');
```

**문서** (`docs/ENHANCED_OPTIONS.md`):
```markdown
| CACHE_MAX_ENTRIES | 100 | 최대 캐시 엔트리 수 |
```

**영향**:
- 사용자가 문서를 보고 `CACHE_MAX_ENTRIES`를 설정해도 적용 안됨
- 실제로는 `MAX_CACHE_SIZE`를 설정해야 함

### 해결 방안

**옵션 A**: 코드 수정 (권장)
```typescript
const MAX_CACHE_SIZE = parseInt(process.env.CACHE_MAX_ENTRIES || '100');
```

**옵션 B**: 문서 수정
```markdown
| MAX_CACHE_SIZE | 100 | 최대 캐시 엔트리 수 |
```

**권장**: 옵션 A - 문서가 더 직관적이고 일관성 있음 (`CACHE_TTL_MS`, `CACHE_MAX_ENTRIES`)

---

## 2. 캐시 통계 함수 누락 ⚠️

### 문제

이전 버전에서는 캐시 통계 조회 기능이 있었으나 머지 후 누락:

**누락된 기능**:
```typescript
function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL
  };
}
```

**문서에는 언급됨**:
```markdown
### 응답에 포함된 캐시 통계
{
  "cacheStats": {
    "size": 45,
    "maxSize": 100,
    "ttlMs": 300000
  }
}
```

### 영향

- 캐시 상태를 모니터링할 수 없음
- 문서와 실제 구현 불일치
- 디버깅 및 성능 튜닝 어려움

### 해결 방안

캐시 통계 함수 추가:
```typescript
function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL
  };
}
```

---

## 3. onFileCaseSaved 콜백 미사용 ⚠️

### 문제

**정의만 있고 실제 호출 없음**:
```typescript
// mcp-stdio-server.ts:91-92
let onFileCaseSaved: (() => void) | null = null;
onFileCaseSaved = clearCache;
```

**이 콜백을 호출해야 하는 곳**:
- `FileCaseStorage.save()` 메서드
- `FileCaseStorage.delete()` 메서드

**현재 상황**:
- 파일 워처가 외부 변경을 감지하여 캐시 클리어 ✅
- 하지만 **같은 프로세스 내**에서 FileCaseStorage를 직접 사용하면 캐시 무효화 안됨 ❌

### 영향

현재는 큰 문제 없음:
- `mcp-stdio-server.ts`에서 FileCaseStorage를 직접 save/delete 호출하지 않음
- 모든 저장은 외부 스크립트(`scan-files-ai.ts`)에서 발생
- 파일 워처가 이를 감지하여 캐시 클리어함

### 잠재적 위험

미래에 다음 코드를 추가하면 문제:
```typescript
// 이렇게 직접 저장하면 캐시가 무효화되지 않음
await fileCaseStorage.save({...});
```

### 해결 방안

**옵션 A**: FileCaseStorage 패키지 수정
```typescript
// packages/bestcase-db/src/fileCase.ts
export class FileCaseStorage {
  async save(fileCase: FileCase): Promise<void> {
    // ... 저장 로직 ...

    // 콜백 호출
    if (this.onSaveCallback) {
      this.onSaveCallback();
    }
  }

  setOnSaveCallback(callback: () => void) {
    this.onSaveCallback = callback;
  }
}
```

**옵션 B**: 현재 구조 유지 + 주석 추가
```typescript
// NOTE: 현재는 외부 스크립트만 FileCaseStorage를 사용하므로
// 파일 워처가 모든 변경을 감지합니다.
// 향후 이 파일에서 직접 save()를 호출하면 수동으로 clearCache() 필요
let onFileCaseSaved: (() => void) | null = null;
onFileCaseSaved = clearCache;
```

**권장**: 옵션 B (현재 아키텍처에 맞음)

---

## 4. LRU 알고리즘 검증 ✅

### 구현 확인

**getCached** (라인 34-49):
```typescript
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);  // ✅ TTL 만료 시 삭제
    return null;
  }

  // ✅ LRU: 접근 시간 및 횟수 업데이트
  entry.accessCount++;
  entry.lastAccessed = now;

  return entry.data as T;
}
```

**evictLRU** (라인 66-82):
```typescript
function evictLRU(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  // ✅ O(n) 순회로 가장 오래된 항목 찾기
  for (const [key, entry] of cache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
    log('LRU eviction', { evictedKey: oldestKey, cacheSize: cache.size });
  }
}
```

**평가**:
- ✅ 알고리즘 정확성: 올바름
- ✅ TTL 만료 처리: 올바름
- ✅ 접근 시간 추적: 올바름
- ⚠️ 성능: O(n) 순회 (100개 한정이므로 문제없음)

---

## 5. 파일 워처 연동 ✅

### 구현 확인

**setupBestCaseWatcher** (라인 108-213):
```typescript
const watcher = fs.watch(bestCasePath, { persistent: false }, (eventType, filename) => {
  if (filename && filename.endsWith('.json') && !filename.includes('index')) {
    // 디바운싱: 연속적인 변경을 하나로 처리
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      log('External BestCase change detected, clearing cache', {
        eventType,
        filename
      });
      clearCache();  // ✅ 캐시 무효화
      debounceTimer = null;
    }, 3000);  // ✅ 3초 디바운스
  }
});
```

**평가**:
- ✅ 외부 변경 감지: 정상
- ✅ 캐시 클리어: 정상
- ✅ 디바운싱: 3초 (도커 재시작 대응)
- ✅ 재시도 로직: 지수 백오프 구현
- ✅ 에러 처리: 안전함

---

## 6. 캐시 사용 패턴 분석

### 현재 캐싱되는 데이터

**1. 전체 FileCase 목록**:
```typescript
// 라인 724
setCache('all_file_cases', allCases, CACHE_TTL);
```

**2. 다차원 검색 결과**:
```typescript
// 라인 905
setCache(cacheKey, { examples: results, metadata: searchMetadata }, CACHE_TTL);
```

**캐시 키 형식**:
```typescript
const cacheKey = `bp_search_${dimensions.sort().join('_')}_${role || 'any'}`;
```

### 잠재적 문제

**캐시 키 충돌 가능성**:
```typescript
// 예시
dimensions = ['apiConnection', 'errorHandling']
role = 'page'

// 이 두 경우는 동일한 키 생성:
cacheKey = 'bp_search_apiConnection_errorHandling_page'

// 문제: minScoreThreshold가 다르면 다른 결과가 나와야 하는데 같은 캐시 사용
searchBestPracticeExamples(['apiConnection'], 'page', 3, { minScoreThreshold: 70 })
searchBestPracticeExamples(['apiConnection'], 'page', 3, { minScoreThreshold: 85 })
```

**심각도**: 중간 - 잘못된 결과 반환 가능

### 해결 방안

캐시 키에 임계값 포함:
```typescript
const thresholdKey = typeof options.minScoreThreshold === 'number'
  ? `t${options.minScoreThreshold}`
  : `t${JSON.stringify(options.minScoreThreshold)}`;

const cacheKey = `bp_search_${dimensions.sort().join('_')}_${role || 'any'}_${thresholdKey}`;
```

---

## 최종 권장 사항

### 즉시 수정 필요 (높은 우선순위) 🔴

1. **환경 변수 네이밍 통일**
   ```typescript
   // 수정 전
   const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE || '100');

   // 수정 후
   const MAX_CACHE_SIZE = parseInt(process.env.CACHE_MAX_ENTRIES || '100');
   ```

2. **캐시 키에 임계값 포함**
   ```typescript
   const thresholdKey = typeof options.minScoreThreshold === 'number'
     ? options.minScoreThreshold
     : JSON.stringify(options.minScoreThreshold);
   const cacheKey = `bp_search_${dimensions.sort().join('_')}_${role || 'any'}_${thresholdKey}`;
   ```

### 단기 개선 (중간 우선순위) 🟡

3. **캐시 통계 함수 추가**
   ```typescript
   function getCacheStats() {
     return { size: cache.size, maxSize: MAX_CACHE_SIZE, ttlMs: CACHE_TTL };
   }
   ```

4. **onFileCaseSaved 주석 명확화**
   ```typescript
   // NOTE: 파일 워처가 외부 변경을 자동 감지하므로 현재는 미사용
   ```

### 장기 고려사항 (낮은 우선순위) 🟢

5. **캐시 히트율 모니터링**
   ```typescript
   let cacheHits = 0;
   let cacheMisses = 0;
   ```

6. **캐시 프리워밍** (서버 시작 시)
   ```typescript
   async function warmupCache() {
     // 자주 사용되는 데이터 미리 로드
   }
   ```

---

## 결론

전반적으로 **캐싱 시스템은 견고하게 구현**되었으나, 다음 2가지는 즉시 수정이 필요합니다:

1. ❌ **환경 변수 네이밍 불일치** - 사용자 혼란 야기
2. ❌ **캐시 키 충돌 위험** - 잘못된 검색 결과 반환 가능

나머지 이슈들은 현재 동작에 큰 영향 없으며, 점진적으로 개선 가능합니다.

---

**보고서 작성**: Claude Code Assistant
**검토 완료**: 2025-11-17

# 캐시 설정 가이드 (Cache Configuration Guide)

## 개요

MCP 서버는 고급 LRU 캐싱 시스템을 사용하여 BestPractice 검색 성능을 최적화합니다.

## 환경변수 설정

### 기본 캐시 설정

```bash
# 캐시 TTL (Time To Live) - 밀리초 단위
CACHE_TTL_MS=300000  # 기본값: 5분 (300,000ms)

# 최대 캐시 엔트리 수 (LRU 제거 적용)
CACHE_MAX_ENTRIES=100  # 기본값: 100개

# 캐시 전략
# - aggressive: 적극적 캐싱 (모든 결과 캐시, 동적 임계값 무시)
# - conservative: 보수적 캐싱 (동적 임계값을 캐시 키에 포함)
# - disabled: 캐싱 비활성화
CACHE_STRATEGY=aggressive  # 기본값: aggressive

# 동적 임계값을 캐시 키에 포함할지 여부
CACHE_INCLUDE_DYNAMIC_THRESHOLD=false  # 기본값: false
```

### 파일 시스템 감시자 설정

```bash
# 감시자 재시도 최대 횟수
MAX_WATCHER_RETRIES=5  # 기본값: 5

# 재시도 지연 시간 (지수 백오프)
WATCHER_RETRY_DELAYS=1000,2000,4000,8000,16000  # 기본값 (ms)
```

## 캐시 전략 비교

### Aggressive (공격적)

**장점:**
- 최대 성능 (높은 캐시 히트율)
- 동일 요청에 대해 즉시 응답

**단점:**
- 동적 임계값이 다른 결과도 동일 키로 캐시
- 메모리 사용량 증가 가능

**사용 시나리오:**
- BestCase 데이터가 자주 변경되지 않는 환경
- 메모리 여유가 있는 환경
- 일관된 검색 결과가 중요한 환경

### Conservative (보수적)

**장점:**
- 정확한 결과 보장 (동적 임계값 반영)
- 메모리 효율적

**단점:**
- 캐시 히트율 감소 (더 세분화된 키)
- 약간 느린 응답 시간

**사용 시나리오:**
- 동적 임계값이 중요한 환경
- 메모리 제약이 있는 환경
- 정확성이 성능보다 우선인 환경

### Disabled (비활성화)

**장점:**
- 항상 최신 데이터 반환
- 메모리 사용 없음

**단점:**
- 느린 응답 시간
- DB 부하 증가

**사용 시나리오:**
- 개발/디버깅 환경
- 실시간 데이터가 필수인 환경

## 캐시 키 구조

### Aggressive 전략

```
bestpractice:{dimensions}:{fileRole}:{thresholds}
```

예시:
```
bestpractice:apiConnection,errorHandling:page:apiConnection:75|errorHandling:75
```

### Conservative 전략

```
bestpractice:{dimensions}:{fileRole}:{thresholds}:eff:{effectiveThresholds}
```

예시:
```
bestpractice:apiConnection,errorHandling:page:apiConnection:75|errorHandling:75:eff:apiConnection:65|errorHandling:70
```

## 캐시 무효화

### 자동 무효화

1. **FileCaseStorage 저장 시**: 전체 캐시 자동 클리어
2. **파일 시스템 변경 감지**: BestCase 디렉토리 변경 시 자동 클리어

### 수동 무효화

```typescript
// 전체 클리어
clearCache();

// 패턴 기반 클리어
clearCache('bestpractice:*');  // BestPractice 캐시만
clearCache('bestpractice:*:page:*');  // page 역할만
```

## 캐시 통계 확인

```typescript
const stats = getCacheStats();

console.log(stats.advanced);
// {
//   size: 45,
//   maxSize: 100,
//   hitCount: 150,
//   missCount: 50,
//   evictionCount: 5,
//   hitRate: 75.0,  // 75%
//   memoryUsageBytes: 2048576,
//   memoryUsageMB: 1.95
// }
```

## 권장 설정

### 프로덕션 환경

```bash
CACHE_TTL_MS=600000  # 10분
CACHE_MAX_ENTRIES=200
CACHE_STRATEGY=aggressive
CACHE_INCLUDE_DYNAMIC_THRESHOLD=false
```

### 개발 환경

```bash
CACHE_TTL_MS=60000  # 1분 (빠른 테스트)
CACHE_MAX_ENTRIES=50
CACHE_STRATEGY=conservative
CACHE_INCLUDE_DYNAMIC_THRESHOLD=true
```

### 메모리 제약 환경

```bash
CACHE_TTL_MS=300000  # 5분
CACHE_MAX_ENTRIES=50
CACHE_STRATEGY=conservative
CACHE_INCLUDE_DYNAMIC_THRESHOLD=true
```

## 성능 최적화 팁

1. **캐시 히트율 모니터링**
   - 75% 이상 유지 권장
   - 낮으면 TTL 증가 또는 MAX_ENTRIES 증가 고려

2. **메모리 사용량 모니터링**
   - 100MB 이하 유지 권장
   - 초과 시 MAX_ENTRIES 감소 또는 TTL 감소

3. **동적 임계값 전략**
   - 검색 결과의 일관성이 중요하면 `conservative`
   - 성능이 우선이면 `aggressive`

4. **주기적 캐시 클리어**
   - BestCase 업데이트 후 자동으로 처리됨
   - 수동 스캔 후에는 `clearCache()` 호출 권장

## 트러블슈팅

### 캐시 히트율이 낮음 (< 50%)

**원인:**
- TTL이 너무 짧음
- 요청 패턴이 다양함
- Conservative 전략 사용 중

**해결:**
- `CACHE_TTL_MS` 증가
- `CACHE_STRATEGY=aggressive` 시도

### 메모리 사용량이 높음 (> 200MB)

**원인:**
- MAX_ENTRIES가 너무 큼
- 큰 파일들이 캐시됨
- TTL이 너무 김

**해결:**
- `CACHE_MAX_ENTRIES` 감소
- `CACHE_TTL_MS` 감소
- 주기적 캐시 클리어

### 캐시가 자동으로 무효화되지 않음

**원인:**
- 파일 시스템 감시자 실패
- 권한 문제

**해결:**
- 로그 확인: `[Watcher]` 관련 에러
- `MAX_WATCHER_RETRIES` 증가
- 수동으로 `clearCache()` 호출

## 참고

- 캐시 매니저 구현: `mcp-servers/cache/cacheManager.ts`
- 통합 위치: `mcp-stdio-server.ts`
- BestPractice 검색: `mcp-servers/bestcase/searchBestPractices.ts`

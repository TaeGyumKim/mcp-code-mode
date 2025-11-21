/**
 * Advanced Cache Manager
 *
 * 기능:
 * - 동적 임계값을 고려한 스마트 캐싱
 * - 패턴 기반 무효화
 * - 캐시 통계 및 모니터링
 * - 설정 기반 캐시 전략
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  metadata?: Record<string, any>;  // 추가 메타데이터 (예: 실효 임계값)
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'aggressive' | 'conservative' | 'disabled';
  includeDynamicThreshold: boolean;  // 동적 임계값을 캐시 키에 포함할지 여부
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  memoryUsageBytes: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
    evictionCount: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: parseInt(process.env.CACHE_TTL_MS || '300000'),  // 5분
      maxSize: parseInt(process.env.CACHE_MAX_ENTRIES || '100'),
      strategy: (process.env.CACHE_STRATEGY as any) || 'aggressive',
      includeDynamicThreshold: process.env.CACHE_INCLUDE_DYNAMIC_THRESHOLD === 'true',
      ...config
    };
  }

  /**
   * 캐시 조회
   */
  get<T>(key: string): { data: T; metadata?: Record<string, any> } | null {
    if (this.config.strategy === 'disabled') {
      this.stats.missCount++;
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.missCount++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.missCount++;
      return null;
    }

    // LRU: 접근 시간 및 횟수 업데이트
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hitCount++;

    return {
      data: entry.data as T,
      metadata: entry.metadata
    };
  }

  /**
   * 캐시 저장
   */
  set<T>(key: string, data: T, options?: {
    ttl?: number;
    metadata?: Record<string, any>;
  }): void {
    if (this.config.strategy === 'disabled') {
      return;
    }

    // 캐시 크기 제한 (LRU 제거)
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: options?.ttl ?? this.config.ttl,
      accessCount: 1,
      lastAccessed: now,
      metadata: options?.metadata
    });
  }

  /**
   * 패턴 기반 캐시 무효화
   *
   * @param pattern 정규표현식 패턴 또는 prefix
   * @example
   * invalidate('bestpractice:*')  // bestpractice로 시작하는 모든 키
   * invalidate(/api.*page/)        // 정규표현식
   */
  invalidate(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string'
      ? new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      : pattern;

    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 전체 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 캐시 통계
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;

    // 메모리 사용량 추정 (rough estimation)
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      // JSON.stringify를 사용한 대략적인 크기 추정
      memoryUsage += JSON.stringify(entry.data).length * 2; // UTF-16 인코딩 고려
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      evictionCount: this.stats.evictionCount,
      hitRate: Math.round(hitRate * 10000) / 100, // 백분율
      memoryUsageBytes: memoryUsage
    };
  }

  /**
   * LRU 제거
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictionCount++;
    }
  }

  /**
   * 스마트 캐시 키 생성 (동적 임계값 고려)
   *
   * @param baseKey 기본 키
   * @param dynamicParams 동적 매개변수 (임계값 등)
   * @returns 캐시 키
   */
  generateKey(
    baseKey: string,
    dynamicParams?: {
      enableDynamicThreshold?: boolean;
      effectiveThresholds?: Record<string, number>;
    }
  ): string {
    if (!dynamicParams?.enableDynamicThreshold || !this.config.includeDynamicThreshold) {
      // 동적 임계값 미사용 또는 설정상 무시
      return baseKey;
    }

    // 동적 임계값 사용 시 실효 임계값을 키에 포함
    if (dynamicParams.effectiveThresholds) {
      const thresholdStr = Object.entries(dynamicParams.effectiveThresholds)
        .sort(([a], [b]) => a.localeCompare(b))  // 정렬로 일관성 보장
        .map(([dim, val]) => `${dim}:${Math.round(val)}`)
        .join(',');

      return `${baseKey}:dyn:${thresholdStr}`;
    }

    return baseKey;
  }

  /**
   * 캐시 검증 (메타데이터 기반)
   *
   * @param cached 캐시된 데이터
   * @param expectedMetadata 예상 메타데이터
   * @returns 유효 여부
   */
  validateCache(
    cached: { data: any; metadata?: Record<string, any> } | null,
    expectedMetadata?: Record<string, any>
  ): boolean {
    if (!cached) return false;
    if (!expectedMetadata || !cached.metadata) return true;

    // 메타데이터 비교
    for (const [key, expectedValue] of Object.entries(expectedMetadata)) {
      const actualValue = cached.metadata[key];

      if (typeof expectedValue === 'object') {
        // 객체 비교 (얕은 비교)
        if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
          return false;
        }
      } else if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }
}

/**
 * 전역 캐시 매니저 인스턴스
 */
export const globalCacheManager = new CacheManager();

/**
 * BestPractice 검색용 특화 캐시 키 생성
 */
export function generateBestPracticeCacheKey(params: {
  dimensions: string[];
  fileRole?: string;
  thresholds: Record<string, number>;
  enableDynamicThreshold?: boolean;
  effectiveThresholds?: Record<string, number>;
}): {
  key: string;
  metadata: Record<string, any>;
} {
  const {
    dimensions,
    fileRole,
    thresholds,
    enableDynamicThreshold,
    effectiveThresholds
  } = params;

  // 기본 키 생성
  const dimStr = dimensions.sort().join(',');
  const thresholdStr = Object.entries(thresholds)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dim, val]) => `${dim}:${val}`)
    .join('|');

  const baseKey = `bestpractice:${dimStr}:${fileRole || 'any'}:${thresholdStr}`;

  // 메타데이터 생성
  const metadata: Record<string, any> = {
    dimensions,
    fileRole,
    originalThresholds: thresholds,
    enableDynamicThreshold
  };

  if (enableDynamicThreshold && effectiveThresholds) {
    metadata.effectiveThresholds = effectiveThresholds;

    // Conservative 전략: 실효 임계값을 키에 포함
    if (globalCacheManager['config'].includeDynamicThreshold) {
      const effectiveStr = Object.entries(effectiveThresholds)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dim, val]) => `${dim}:${Math.round(val)}`)
        .join('|');

      return {
        key: `${baseKey}:eff:${effectiveStr}`,
        metadata
      };
    }
  }

  return { key: baseKey, metadata };
}

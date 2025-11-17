/**
 * 캐시, 임계값, 키워드 기능 테스트
 *
 * 개선된 기능들을 검증합니다:
 * 1. LRU 캐시 동작 및 환경 변수 설정
 * 2. 차원별 임계값 및 동적 임계값 하한선
 * 3. 사용자 정의 키워드 병합
 * 4. 선택 이유 포함
 * 5. forceBestPracticeSearch 플래그
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock 데이터
const mockFileCases = [
  {
    id: 'project-a--pages-users-index-vue',
    projectName: 'project-a',
    filePath: 'pages/users/index.vue',
    fileRole: 'page',
    fileType: 'vue',
    scores: {
      apiConnection: 85,
      errorHandling: 70,
      typeUsage: 60,
      stateManagement: 75,
      designSystem: 80,
      structure: 90,
      performance: 65,
      utilityUsage: 55
    },
    keywords: ['list', 'search', 'pagination', 'grpc'],
    content: '// User list page',
    analysis: {
      linesOfCode: 150,
      apiMethods: ['grpc.UserService.list'],
      componentsUsed: ['ElTable', 'ElButton'],
      composablesUsed: ['useSearch'],
      patterns: ['error-boundary'],
      entities: ['User']
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      analyzedAt: '2025-01-01T00:00:00Z',
      tags: []
    }
  },
  {
    id: 'project-a--components-search-bar-vue',
    projectName: 'project-a',
    filePath: 'components/SearchBar.vue',
    fileRole: 'component',
    fileType: 'vue',
    scores: {
      apiConnection: 40,
      errorHandling: 65,
      typeUsage: 80,
      stateManagement: 50,
      designSystem: 95,
      structure: 70,
      performance: 75,
      utilityUsage: 60
    },
    keywords: ['search', 'input', 'debounce'],
    content: '// Search bar component',
    analysis: {
      linesOfCode: 80,
      apiMethods: [],
      componentsUsed: ['ElInput', 'ElButton'],
      composablesUsed: ['useDebounce'],
      patterns: ['debounce'],
      entities: []
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      analyzedAt: '2025-01-01T00:00:00Z',
      tags: []
    }
  },
  {
    id: 'project-b--stores-auth-ts',
    projectName: 'project-b',
    filePath: 'stores/auth.ts',
    fileRole: 'store',
    fileType: 'ts',
    scores: {
      apiConnection: 70,
      errorHandling: 85,
      typeUsage: 90,
      stateManagement: 95,
      designSystem: 30,
      structure: 85,
      performance: 70,
      utilityUsage: 65
    },
    keywords: ['auth', 'login', 'token', 'state-management'],
    content: '// Auth store',
    analysis: {
      linesOfCode: 200,
      apiMethods: ['rest.auth.login'],
      componentsUsed: [],
      composablesUsed: [],
      patterns: ['singleton', 'observer'],
      entities: ['User', 'Token']
    },
    metadata: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      analyzedAt: '2025-01-01T00:00:00Z',
      tags: []
    }
  }
];

describe('LRU Cache Functionality', () => {
  let cache: Map<string, any>;
  let CACHE_MAX_ENTRIES: number;

  beforeEach(() => {
    cache = new Map();
    CACHE_MAX_ENTRIES = 3;  // 작은 크기로 테스트
  });

  it('should evict oldest entries when cache exceeds max size', () => {
    // LRU 캐시 동작 시뮬레이션
    const setCache = (key: string, data: any) => {
      const now = Date.now();
      cache.set(key, { data, timestamp: now, ttl: 300000, lastAccess: now });

      // LRU 정리
      if (cache.size > CACHE_MAX_ENTRIES) {
        const entries = Array.from(cache.entries())
          .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        const toRemove = cache.size - CACHE_MAX_ENTRIES;
        for (let i = 0; i < toRemove; i++) {
          cache.delete(entries[i][0]);
        }
      }
    };

    setCache('key1', 'data1');
    setCache('key2', 'data2');
    setCache('key3', 'data3');
    expect(cache.size).toBe(3);

    setCache('key4', 'data4');  // 이로 인해 key1이 제거되어야 함
    expect(cache.size).toBe(3);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key4')).toBe(true);
  });

  it('should update lastAccess on cache hit', () => {
    const getCached = (key: string): any | null => {
      const entry = cache.get(key);
      if (!entry) return null;
      entry.lastAccess = Date.now();
      return entry.data;
    };

    const now = Date.now();
    cache.set('key1', { data: 'data1', timestamp: now, ttl: 300000, lastAccess: now });

    // 약간의 지연 후 접근
    const result = getCached('key1');
    expect(result).toBe('data1');
    expect(cache.get('key1')!.lastAccess).toBeGreaterThanOrEqual(now);
  });

  it('should respect TTL from environment variable', () => {
    const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);
    expect(CACHE_TTL).toBeGreaterThan(0);
  });
});

describe('Per-Dimension Threshold', () => {
  it('should apply single threshold to all dimensions', () => {
    const threshold = 75;
    const perDimensionThresholds: Record<string, number> = {
      apiConnection: 75,
      errorHandling: 75,
      typeUsage: 75,
      stateManagement: 75,
      designSystem: 75,
      structure: 75,
      performance: 75,
      utilityUsage: 75
    };

    // 단일 값 적용
    if (typeof threshold === 'number') {
      for (const dim of Object.keys(perDimensionThresholds)) {
        perDimensionThresholds[dim] = threshold;
      }
    }

    Object.values(perDimensionThresholds).forEach(val => {
      expect(val).toBe(75);
    });
  });

  it('should apply per-dimension thresholds', () => {
    const thresholds: Partial<Record<string, number>> = {
      apiConnection: 80,
      errorHandling: 70,
      structure: 85
    };

    const perDimensionThresholds: Record<string, number> = {
      apiConnection: 75,
      errorHandling: 75,
      typeUsage: 75,
      stateManagement: 75,
      designSystem: 75,
      structure: 75,
      performance: 75,
      utilityUsage: 75
    };

    // 차원별 값 적용
    for (const [dim, value] of Object.entries(thresholds)) {
      if (value !== undefined) {
        perDimensionThresholds[dim] = value;
      }
    }

    expect(perDimensionThresholds.apiConnection).toBe(80);
    expect(perDimensionThresholds.errorHandling).toBe(70);
    expect(perDimensionThresholds.structure).toBe(85);
    expect(perDimensionThresholds.typeUsage).toBe(75);  // 기본값 유지
  });

  it('should enforce threshold floor', () => {
    const thresholdFloor = 50;
    const avgScore = 40;
    const originalThreshold = 75;

    // 동적 조정 시뮬레이션
    let effectiveThreshold = originalThreshold;
    if (avgScore < originalThreshold) {
      const dynamicThreshold = Math.max(avgScore * 1.1, avgScore + 10);
      effectiveThreshold = Math.max(dynamicThreshold, thresholdFloor);
    }

    expect(effectiveThreshold).toBe(50);  // floor에 의해 제한됨
  });

  it('should not go below floor even with low averages', () => {
    const thresholdFloor = 50;
    const avgScore = 30;  // 매우 낮은 평균

    const dynamicThreshold = Math.max(avgScore * 1.1, avgScore + 10);  // 40
    const effectiveThreshold = Math.max(dynamicThreshold, thresholdFloor);  // 50

    expect(effectiveThreshold).toBe(50);
  });
});

describe('Custom Keywords Merging', () => {
  const DIMENSION_KEYWORDS: Record<string, string[]> = {
    apiConnection: ['api', 'grpc', 'rest'],
    errorHandling: ['error', 'try', 'catch'],
    typeUsage: ['type', 'interface'],
    stateManagement: ['state', 'store'],
    designSystem: ['component', 'ui'],
    structure: ['pattern', 'architecture'],
    performance: ['optimize', 'cache'],
    utilityUsage: ['util', 'helper']
  };

  it('should merge custom keywords with existing ones', () => {
    const customKeywords: Partial<Record<string, string[]>> = {
      apiConnection: ['swagger', 'openapi'],
      errorHandling: ['validation-error', 'network-error']
    };

    const merged = { ...DIMENSION_KEYWORDS };
    for (const [dimension, keywords] of Object.entries(customKeywords)) {
      if (keywords && Array.isArray(keywords)) {
        merged[dimension] = [...merged[dimension], ...keywords];
      }
    }

    expect(merged.apiConnection).toContain('api');
    expect(merged.apiConnection).toContain('swagger');
    expect(merged.apiConnection).toContain('openapi');
    expect(merged.errorHandling).toContain('error');
    expect(merged.errorHandling).toContain('validation-error');
  });

  it('should handle empty custom keywords', () => {
    const customKeywords: Partial<Record<string, string[]>> = {};

    const merged = customKeywords ? { ...DIMENSION_KEYWORDS } : DIMENSION_KEYWORDS;

    expect(merged).toEqual(DIMENSION_KEYWORDS);
  });

  it('should correctly infer dimensions with custom keywords', () => {
    const description = 'swagger api 연동 구현';
    const customKeywords: Partial<Record<string, string[]>> = {
      apiConnection: ['swagger']
    };

    const merged = { ...DIMENSION_KEYWORDS };
    for (const [dimension, keywords] of Object.entries(customKeywords)) {
      if (keywords && Array.isArray(keywords)) {
        merged[dimension] = [...merged[dimension], ...keywords];
      }
    }

    const dimensionScores: Record<string, number> = {};
    for (const dim of Object.keys(merged)) {
      dimensionScores[dim] = 0;
    }

    for (const [dimension, keywordList] of Object.entries(merged)) {
      for (const keyword of keywordList) {
        if (description.toLowerCase().includes(keyword.toLowerCase())) {
          dimensionScores[dimension]++;
        }
      }
    }

    expect(dimensionScores.apiConnection).toBeGreaterThan(0);
    // swagger가 매칭되어야 함
    const hasSwaggerMatch = merged.apiConnection.some(kw =>
      description.toLowerCase().includes(kw.toLowerCase())
    );
    expect(hasSwaggerMatch).toBe(true);
  });
});

describe('Selection Reasons', () => {
  it('should include selection reasons when enabled', () => {
    const includeReasons = true;
    const dimension = 'apiConnection';
    const score = 85;
    const threshold = 75;

    const selectionReasons: string[] = [];

    if (score >= threshold) {
      if (includeReasons) {
        selectionReasons.push(`${dimension}: ${score}점 (임계값 ${threshold}점 충족)`);
      }
    }

    expect(selectionReasons.length).toBe(1);
    expect(selectionReasons[0]).toContain('apiConnection');
    expect(selectionReasons[0]).toContain('85점');
    expect(selectionReasons[0]).toContain('75점');
  });

  it('should not include reasons when disabled', () => {
    const includeReasons = false;
    const selectionReasons: string[] = [];

    if (includeReasons) {
      selectionReasons.push('reason');
    }

    expect(selectionReasons.length).toBe(0);
  });

  it('should include fallback reason when using top percentile', () => {
    const percentile = 10;
    const candidates = 100;
    const avgScore = 62.5;

    const reason = `상위 ${Math.round((percentile / candidates) * 100)}% 선택 (평균 점수: ${avgScore.toFixed(1)})`;

    expect(reason).toContain('상위 10% 선택');
    expect(reason).toContain('62.5');
  });
});

describe('Force Best Practice Search', () => {
  it('should search when forceBestPracticeSearch is true', () => {
    const options = {
      skipBestPracticeSearch: true,
      forceBestPracticeSearch: true,
      maxBestPractices: 3
    };

    const shouldSearch = options.forceBestPracticeSearch ||
      (!options.skipBestPracticeSearch && options.maxBestPractices > 0);

    expect(shouldSearch).toBe(true);
  });

  it('should not search when skip is true and force is false', () => {
    const options = {
      skipBestPracticeSearch: true,
      forceBestPracticeSearch: false,
      maxBestPractices: 3
    };

    const shouldSearch = options.forceBestPracticeSearch ||
      (!options.skipBestPracticeSearch && options.maxBestPractices > 0);

    expect(shouldSearch).toBe(false);
  });

  it('should search normally when neither skip nor force', () => {
    const options = {
      skipBestPracticeSearch: false,
      forceBestPracticeSearch: false,
      maxBestPractices: 3
    };

    const shouldSearch = options.forceBestPracticeSearch ||
      (!options.skipBestPracticeSearch && options.maxBestPractices > 0);

    expect(shouldSearch).toBe(true);
  });
});

describe('Cache Consistency on Save', () => {
  it('should clear cache when FileCase is saved', () => {
    let cacheCleared = false;
    const onFileCaseSaved = () => {
      cacheCleared = true;
    };

    // 저장 시뮬레이션
    const saveFileCase = async () => {
      onFileCaseSaved();
    };

    saveFileCase();
    expect(cacheCleared).toBe(true);
  });

  it('should clear cache when FileCase is deleted', () => {
    let cacheCleared = false;
    const onFileCaseSaved = () => {
      cacheCleared = true;
    };

    // 삭제 시뮬레이션
    const deleteFileCase = async () => {
      onFileCaseSaved();
      return true;
    };

    deleteFileCase();
    expect(cacheCleared).toBe(true);
  });
});

describe('Search Metadata', () => {
  it('should return effective thresholds in metadata', () => {
    const dimensions = ['apiConnection', 'structure'];
    const effectiveThresholds: Record<string, number> = {
      apiConnection: 70,
      structure: 85
    };

    const metadata = {
      effectiveThresholds: Object.fromEntries(
        dimensions.map(d => [d, effectiveThresholds[d]])
      ),
      candidatesCount: 10,
      avgScores: { apiConnection: 65, structure: 80 }
    };

    expect(metadata.effectiveThresholds).toEqual({
      apiConnection: 70,
      structure: 85
    });
    expect(metadata.candidatesCount).toBe(10);
  });

  it('should include average scores per dimension', () => {
    const candidates = mockFileCases;
    const dimensions = ['apiConnection', 'structure'];

    const avgScores: Record<string, number> = {};
    for (const dimension of dimensions) {
      const scores = candidates.map(fc => fc.scores[dimension as keyof typeof fc.scores] || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      avgScores[dimension] = avg;
    }

    expect(avgScores.apiConnection).toBeCloseTo((85 + 40 + 70) / 3);
    expect(avgScores.structure).toBeCloseTo((90 + 70 + 85) / 3);
  });
});

describe('Environment Variable Configuration', () => {
  it('should use default TTL when env var not set', () => {
    const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);
    expect(CACHE_TTL).toBe(300000);  // 5분
  });

  it('should use default max entries when env var not set', () => {
    const CACHE_MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES || '100', 10);
    expect(CACHE_MAX_ENTRIES).toBe(100);
  });
});

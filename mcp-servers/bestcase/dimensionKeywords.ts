/**
 * Dimension Keywords with Weights (v2.0)
 *
 * 키워드 기반 차원 추론 시스템 고도화:
 * - 가중치 시스템 (핵심/중요/일반)
 * - TF-IDF 스타일 점수 계산
 * - 정규표현식 패턴 지원
 */

import type { BestCaseScores } from '../../packages/bestcase-db/dist/index.js';

export interface WeightedKeyword {
  /**
   * 키워드 또는 패턴 문자열
   * 정규표현식을 사용하려면 pattern 필드 사용
   */
  keyword: string;

  /**
   * 가중치
   * - 3.0: 핵심 키워드 (해당 차원의 직접적 표현)
   * - 2.0: 중요 키워드 (높은 관련성)
   * - 1.0: 일반 키워드 (간접적 관련성)
   */
  weight: number;

  /**
   * 정규표현식 패턴 (선택 사항)
   * 예: /\bapi[_-]?call/ -> "api_call", "api-call", "apicall" 매칭
   */
  pattern?: RegExp;
}

/**
 * 차원별 가중치 기반 키워드 사전
 *
 * 유지보수 가이드:
 * - 핵심 키워드(3.0): 해당 차원을 직접 표현하는 용어
 * - 중요 키워드(2.0): 해당 차원과 높은 관련성
 * - 일반 키워드(1.0): 간접적으로 관련된 용어
 */
export const WEIGHTED_DIMENSION_KEYWORDS: Record<keyof BestCaseScores, WeightedKeyword[]> = {
  apiConnection: [
    // 핵심 키워드 (3.0)
    { keyword: 'api', weight: 3.0 },
    { keyword: 'grpc', weight: 3.0 },
    { keyword: 'rest', weight: 3.0 },
    { keyword: 'graphql', weight: 3.0 },
    { keyword: 'endpoint', weight: 3.0 },
    { keyword: '엔드포인트', weight: 3.0 },
    { keyword: '통신', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'fetch', weight: 2.0 },
    { keyword: 'axios', weight: 2.0 },
    { keyword: 'client', weight: 2.0 },
    { keyword: 'server', weight: 2.0 },
    { keyword: 'backend', weight: 2.0 },
    { keyword: 'websocket', weight: 2.0 },
    { keyword: 'service', weight: 2.0 },
    { keyword: '서버', weight: 2.0 },
    { keyword: '클라이언트', weight: 2.0 },
    { keyword: '백엔드', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'request', weight: 1.0 },
    { keyword: 'response', weight: 1.0 },
    { keyword: 'http', weight: 1.0 },
    { keyword: 'call', weight: 1.0 },
    { keyword: 'invoke', weight: 1.0 },
    { keyword: '요청', weight: 1.0 },
    { keyword: '응답', weight: 1.0 },
    { keyword: '호출', weight: 1.0 },
    { keyword: '연결', weight: 1.0 }
  ],

  errorHandling: [
    // 핵심 키워드 (3.0)
    { keyword: 'error', weight: 3.0 },
    { keyword: 'exception', weight: 3.0 },
    { keyword: 'validation', weight: 3.0 },
    { keyword: 'validate', weight: 3.0 },
    { keyword: '에러', weight: 3.0 },
    { keyword: '오류', weight: 3.0 },
    { keyword: '예외', weight: 3.0 },
    { keyword: '검증', weight: 3.0 },
    { keyword: '유효성', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'try', weight: 2.0 },
    { keyword: 'catch', weight: 2.0 },
    { keyword: 'throw', weight: 2.0 },
    { keyword: 'handle', weight: 2.0 },
    { keyword: 'handler', weight: 2.0 },
    { keyword: 'guard', weight: 2.0 },
    { keyword: '처리', weight: 2.0 },
    { keyword: '핸들러', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'check', weight: 1.0 },
    { keyword: 'fallback', weight: 1.0 },
    { keyword: 'retry', weight: 1.0 },
    { keyword: 'recover', weight: 1.0 },
    { keyword: 'fail', weight: 1.0 },
    { keyword: 'success', weight: 1.0 },
    { keyword: '실패', weight: 1.0 },
    { keyword: '성공', weight: 1.0 },
    { keyword: '재시도', weight: 1.0 }
  ],

  typeUsage: [
    // 핵심 키워드 (3.0)
    { keyword: 'type', weight: 3.0 },
    { keyword: 'interface', weight: 3.0 },
    { keyword: 'typescript', weight: 3.0 },
    { keyword: 'generic', weight: 3.0 },
    { keyword: 'schema', weight: 3.0 },
    { keyword: '타입', weight: 3.0 },
    { keyword: '인터페이스', weight: 3.0 },
    { keyword: '타입스크립트', weight: 3.0 },
    { keyword: '스키마', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'typing', weight: 2.0 },
    { keyword: 'typed', weight: 2.0 },
    { keyword: 'model', weight: 2.0 },
    { keyword: 'dto', weight: 2.0 },
    { keyword: 'class', weight: 2.0 },
    { keyword: 'enum', weight: 2.0 },
    { keyword: '모델', weight: 2.0 },
    { keyword: '제네릭', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'union', weight: 1.0 },
    { keyword: 'intersection', weight: 1.0 },
    { keyword: 'extends', weight: 1.0 },
    { keyword: 'implements', weight: 1.0 },
    { keyword: '정의', weight: 1.0 }
  ],

  stateManagement: [
    // 핵심 키워드 (3.0)
    { keyword: 'state', weight: 3.0 },
    { keyword: 'store', weight: 3.0 },
    { keyword: 'pinia', weight: 3.0 },
    { keyword: 'vuex', weight: 3.0 },
    { keyword: '상태', weight: 3.0 },
    { keyword: '스토어', weight: 3.0 },
    { keyword: '상태관리', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'reactive', weight: 2.0 },
    { keyword: 'ref', weight: 2.0 },
    { keyword: 'computed', weight: 2.0 },
    { keyword: 'watch', weight: 2.0 },
    { keyword: 'action', weight: 2.0 },
    { keyword: 'mutation', weight: 2.0 },
    { keyword: '반응형', weight: 2.0 },
    { keyword: '액션', weight: 2.0 },
    { keyword: '뮤테이션', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'getter', weight: 1.0 },
    { keyword: 'setter', weight: 1.0 },
    { keyword: 'persist', weight: 1.0 },
    { keyword: 'hydrate', weight: 1.0 },
    { keyword: 'subscribe', weight: 1.0 },
    { keyword: 'dispatch', weight: 1.0 },
    { keyword: '구독', weight: 1.0 },
    { keyword: '저장', weight: 1.0 },
    { keyword: '관리', weight: 1.0 }
  ],

  designSystem: [
    // 핵심 키워드 (3.0)
    { keyword: 'element', weight: 3.0 },
    { keyword: 'el-', weight: 3.0 },
    { keyword: 'ui', weight: 3.0 },
    { keyword: 'component', weight: 3.0 },
    { keyword: 'design', weight: 3.0 },
    { keyword: '컴포넌트', weight: 3.0 },
    { keyword: '디자인', weight: 3.0 },
    { keyword: 'UI', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'button', weight: 2.0 },
    { keyword: 'input', weight: 2.0 },
    { keyword: 'form', weight: 2.0 },
    { keyword: 'table', weight: 2.0 },
    { keyword: 'dialog', weight: 2.0 },
    { keyword: 'modal', weight: 2.0 },
    { keyword: 'layout', weight: 2.0 },
    { keyword: 'theme', weight: 2.0 },
    { keyword: '레이아웃', weight: 2.0 },
    { keyword: '테마', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'style', weight: 1.0 },
    { keyword: 'css', weight: 1.0 },
    { keyword: 'scss', weight: 1.0 },
    { keyword: 'tailwind', weight: 1.0 },
    { keyword: 'icon', weight: 1.0 },
    { keyword: 'card', weight: 1.0 },
    { keyword: 'menu', weight: 1.0 },
    { keyword: 'nav', weight: 1.0 },
    { keyword: '스타일', weight: 1.0 },
    { keyword: '아이콘', weight: 1.0 },
    { keyword: '화면', weight: 1.0 }
  ],

  structure: [
    // 핵심 키워드 (3.0)
    { keyword: 'structure', weight: 3.0 },
    { keyword: 'architecture', weight: 3.0 },
    { keyword: 'pattern', weight: 3.0 },
    { keyword: 'composable', weight: 3.0 },
    { keyword: '구조', weight: 3.0 },
    { keyword: '아키텍처', weight: 3.0 },
    { keyword: '패턴', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'hook', weight: 2.0 },
    { keyword: 'mixin', weight: 2.0 },
    { keyword: 'plugin', weight: 2.0 },
    { keyword: 'module', weight: 2.0 },
    { keyword: 'organize', weight: 2.0 },
    { keyword: 'hierarchy', weight: 2.0 },
    { keyword: '컴포저블', weight: 2.0 },
    { keyword: '훅', weight: 2.0 },
    { keyword: '모듈', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'dependency', weight: 1.0 },
    { keyword: 'inject', weight: 1.0 },
    { keyword: 'provide', weight: 1.0 },
    { keyword: 'factory', weight: 1.0 },
    { keyword: 'singleton', weight: 1.0 },
    { keyword: '구성', weight: 1.0 },
    { keyword: '조직', weight: 1.0 },
    { keyword: '계층', weight: 1.0 }
  ],

  performance: [
    // 핵심 키워드 (3.0)
    { keyword: 'performance', weight: 3.0 },
    { keyword: 'optimize', weight: 3.0 },
    { keyword: 'optimization', weight: 3.0 },
    { keyword: 'lazy', weight: 3.0 },
    { keyword: 'cache', weight: 3.0 },
    { keyword: '성능', weight: 3.0 },
    { keyword: '최적화', weight: 3.0 },
    { keyword: '캐시', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'memo', weight: 2.0 },
    { keyword: 'memoization', weight: 2.0 },
    { keyword: 'virtual', weight: 2.0 },
    { keyword: 'debounce', weight: 2.0 },
    { keyword: 'throttle', weight: 2.0 },
    { keyword: 'async', weight: 2.0 },
    { keyword: '메모이제이션', weight: 2.0 },
    { keyword: '가상화', weight: 2.0 },
    { keyword: '비동기', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'await', weight: 1.0 },
    { keyword: 'promise', weight: 1.0 },
    { keyword: 'concurrent', weight: 1.0 },
    { keyword: 'parallel', weight: 1.0 },
    { keyword: 'batch', weight: 1.0 },
    { keyword: 'chunk', weight: 1.0 },
    { keyword: 'stream', weight: 1.0 },
    { keyword: '지연', weight: 1.0 },
    { keyword: '병렬', weight: 1.0 }
  ],

  utilityUsage: [
    // 핵심 키워드 (3.0)
    { keyword: 'utility', weight: 3.0 },
    { keyword: 'helper', weight: 3.0 },
    { keyword: 'util', weight: 3.0 },
    { keyword: '유틸', weight: 3.0 },
    { keyword: '헬퍼', weight: 3.0 },
    { keyword: '도우미', weight: 3.0 },

    // 중요 키워드 (2.0)
    { keyword: 'common', weight: 2.0 },
    { keyword: 'shared', weight: 2.0 },
    { keyword: 'lib', weight: 2.0 },
    { keyword: 'tool', weight: 2.0 },
    { keyword: 'format', weight: 2.0 },
    { keyword: 'parse', weight: 2.0 },
    { keyword: '공통', weight: 2.0 },
    { keyword: '변환', weight: 2.0 },

    // 일반 키워드 (1.0)
    { keyword: 'convert', weight: 1.0 },
    { keyword: 'transform', weight: 1.0 },
    { keyword: 'sanitize', weight: 1.0 },
    { keyword: 'escape', weight: 1.0 },
    { keyword: 'encode', weight: 1.0 },
    { keyword: 'decode', weight: 1.0 },
    { keyword: 'serialize', weight: 1.0 },
    { keyword: 'deserialize', weight: 1.0 },
    { keyword: '포맷', weight: 1.0 },
    { keyword: '파싱', weight: 1.0 },
    { keyword: '직렬화', weight: 1.0 }
  ]
};

/**
 * TF-IDF 스타일 점수 계산
 *
 * @param text 분석할 텍스트
 * @param weightedKeywords 가중치 기반 키워드 목록
 * @returns 정규화된 점수
 */
export function calculateDimensionScore(
  text: string,
  weightedKeywords: WeightedKeyword[]
): number {
  if (!text || text.trim().length === 0) return 0;

  const textLower = text.toLowerCase();
  const words = textLower.split(/\s+/);
  const docLength = words.length;

  let totalScore = 0;

  for (const { keyword, weight, pattern } of weightedKeywords) {
    let termFrequency = 0;

    if (pattern) {
      // 정규표현식 패턴 사용
      const matches = textLower.match(pattern);
      termFrequency = matches ? matches.length : 0;
    } else {
      // 단순 키워드 매칭
      const keywordLower = keyword.toLowerCase();

      // 단어 경계를 고려한 정확한 매칭
      const wordBoundaryPattern = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'g');
      const exactMatches = textLower.match(wordBoundaryPattern);

      // 부분 매칭도 카운트 (낮은 가중치)
      const partialMatches = textLower.split(keywordLower).length - 1;

      termFrequency = (exactMatches ? exactMatches.length : 0) * 1.0 +
                      (partialMatches - (exactMatches ? exactMatches.length : 0)) * 0.3;
    }

    if (termFrequency > 0) {
      // TF-IDF 스타일 점수
      // TF: 출현 빈도 (로그 스케일로 정규화)
      const tf = Math.log(1 + termFrequency);

      // Weight: 키워드 가중치 (핵심/중요/일반)
      // IDF 개념은 키워드 가중치에 반영됨 (핵심 키워드 = 희귀하고 중요)

      totalScore += tf * weight;
    }
  }

  // 문서 길이로 정규화 (긴 텍스트가 유리하지 않도록)
  // 최소 길이 10으로 설정하여 극단적인 정규화 방지
  const normalizedLength = Math.max(docLength, 10);
  const normalizedScore = (totalScore / Math.log(normalizedLength + 1)) * 10;

  return normalizedScore;
}

/**
 * 정규표현식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 고급 차원 추론 (TF-IDF 스타일 + 가중치)
 *
 * @param description 요청 설명
 * @param keywords 추출된 키워드
 * @param customKeywords 사용자 정의 키워드
 * @param maxDimensions 최대 차원 수 (기본값: 3)
 * @returns 중요도 순으로 정렬된 차원 배열
 */
export function inferImportantDimensionsV2(
  description: string | undefined,
  keywords: string[],
  customKeywords?: Partial<Record<keyof BestCaseScores, WeightedKeyword[]>>,
  maxDimensions: number = 3
): {
  dimensions: Array<keyof BestCaseScores>;
  scores: Record<keyof BestCaseScores, number>;
  details: Array<{
    dimension: keyof BestCaseScores;
    score: number;
    matchedKeywords: string[];
  }>;
} {
  const descLower = (description || '').toLowerCase();
  const allKeywords = keywords.map(k => k.toLowerCase());
  const combined = descLower + ' ' + allKeywords.join(' ');

  // 키워드 사전 병합 (기본 + 사용자 정의)
  const mergedKeywords: Record<keyof BestCaseScores, WeightedKeyword[]> =
    { ...WEIGHTED_DIMENSION_KEYWORDS };

  if (customKeywords) {
    for (const [dimension, customList] of Object.entries(customKeywords)) {
      const dim = dimension as keyof BestCaseScores;
      if (customList && customList.length > 0) {
        mergedKeywords[dim] = [...mergedKeywords[dim], ...customList];
      }
    }
  }

  // 각 차원별 점수 계산
  const dimensionScores: Record<keyof BestCaseScores, number> = {
    apiConnection: 0,
    errorHandling: 0,
    typeUsage: 0,
    stateManagement: 0,
    designSystem: 0,
    structure: 0,
    performance: 0,
    utilityUsage: 0
  };

  const matchDetails: Record<keyof BestCaseScores, string[]> = {
    apiConnection: [],
    errorHandling: [],
    typeUsage: [],
    stateManagement: [],
    designSystem: [],
    structure: [],
    performance: [],
    utilityUsage: []
  };

  for (const [dimension, weightedKeywords] of Object.entries(mergedKeywords)) {
    const dim = dimension as keyof BestCaseScores;
    dimensionScores[dim] = calculateDimensionScore(combined, weightedKeywords);

    // 매칭된 키워드 수집 (디버깅/로깅용)
    for (const { keyword } of weightedKeywords) {
      if (combined.includes(keyword.toLowerCase())) {
        matchDetails[dim].push(keyword);
      }
    }
  }

  // 점수 순으로 정렬
  const sortedDimensions = Object.entries(dimensionScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([dim]) => dim as keyof BestCaseScores);

  // 상위 N개 차원 선택
  const selectedDimensions = sortedDimensions.length > 0
    ? sortedDimensions.slice(0, maxDimensions)
    : ['structure', 'apiConnection'] as Array<keyof BestCaseScores>; // 기본값

  // 상세 정보 생성
  const details = selectedDimensions.map(dim => ({
    dimension: dim,
    score: dimensionScores[dim],
    matchedKeywords: matchDetails[dim].slice(0, 5) // 상위 5개만
  }));

  return {
    dimensions: selectedDimensions,
    scores: dimensionScores,
    details
  };
}

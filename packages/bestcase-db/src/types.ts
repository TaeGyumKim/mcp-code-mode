/**
 * BestCase 다차원 점수 시스템
 *
 * 각 코드를 8가지 항목으로 평가하여 특정 영역에서 우수한 코드도 활용할 수 있도록 합니다.
 */

/**
 * 개별 품질 점수 (0-100)
 */
export interface BestCaseScores {
  /**
   * 파일 구조 및 컴포넌트 분리 품질
   * - 폴더 구조의 논리성
   * - 컴포넌트/함수 분리 수준
   * - 네이밍 일관성
   */
  structure: number;

  /**
   * API 연결 품질
   * - gRPC/REST API 활용도
   * - 에러 핸들링
   * - 로딩 상태 처리
   * - API 타입 활용
   */
  apiConnection: number;

  /**
   * 디자인 시스템 활용도
   * - UI 컴포넌트 일관성
   * - 테마/스타일 적용
   * - 반응형 디자인
   */
  designSystem: number;

  /**
   * 유틸리티 라이브러리 활용
   * - lodash, date-fns 등 활용
   * - 커스텀 유틸 함수
   * - 헬퍼 함수 재사용성
   */
  utilityUsage: number;

  /**
   * 에러 핸들링
   * - try-catch 적용
   * - 사용자 친화적 에러 메시지
   * - fallback UI
   * - 에러 로깅
   */
  errorHandling: number;

  /**
   * TypeScript 타입 활용
   * - 타입 정의 완성도
   * - 제네릭 활용
   * - 타입 추론 최적화
   * - any 사용 최소화
   */
  typeUsage: number;

  /**
   * 상태 관리
   * - Pinia/Vuex 활용
   * - 컴포저블 패턴
   * - 상태 불변성
   * - 사이드 이펙트 관리
   */
  stateManagement: number;

  /**
   * 성능 최적화
   * - lazy loading
   * - computed 활용
   * - 불필요한 리렌더링 방지
   * - 메모이제이션
   */
  performance: number;
}

/**
 * 점수 등급
 */
export type ScoreGrade = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * 점수별 등급 기준
 */
export const SCORE_THRESHOLDS = {
  excellent: 85,  // 85점 이상
  good: 70,       // 70-84점
  fair: 50,       // 50-69점
  poor: 0         // 50점 미만
} as const;

/**
 * 저장 기준
 */
export const SAVE_CRITERIA = {
  minTotalScore: 40,           // 전체 평균 최소 40점
  minExcellentScore: 80,       // "우수" 판정 최소 점수
  minExcellentCount: 1,        // 최소 1개 영역은 우수해야 함
  criticalCategories: [        // 특히 중요한 카테고리
    'structure',
    'apiConnection',
    'errorHandling'
  ],
  minCriticalScore: 85         // 중요 카테고리에서 85점 이상이면 무조건 저장
} as const;

/**
 * 점수 카테고리 메타데이터
 */
export interface ScoreCategoryMeta {
  name: string;
  description: string;
  weight: number;  // 전체 점수 계산 시 가중치 (합계 1.0)
}

/**
 * 카테고리별 메타데이터
 */
export const SCORE_CATEGORIES: Record<keyof BestCaseScores, ScoreCategoryMeta> = {
  structure: {
    name: '구조',
    description: '파일/컴포넌트 구조 및 네이밍',
    weight: 0.15
  },
  apiConnection: {
    name: 'API 연결',
    description: 'API 활용 및 에러 처리',
    weight: 0.15
  },
  designSystem: {
    name: '디자인 시스템',
    description: 'UI 컴포넌트 일관성',
    weight: 0.12
  },
  utilityUsage: {
    name: '유틸리티',
    description: '라이브러리 및 헬퍼 활용',
    weight: 0.10
  },
  errorHandling: {
    name: '에러 핸들링',
    description: '예외 처리 및 사용자 경험',
    weight: 0.15
  },
  typeUsage: {
    name: '타입 활용',
    description: 'TypeScript 타입 정의 품질',
    weight: 0.13
  },
  stateManagement: {
    name: '상태 관리',
    description: '전역/로컬 상태 관리',
    weight: 0.10
  },
  performance: {
    name: '성능',
    description: '최적화 및 리소스 관리',
    weight: 0.10
  }
};

/**
 * 점수 등급 계산
 */
export function getScoreGrade(score: number): ScoreGrade {
  if (score >= SCORE_THRESHOLDS.excellent) return 'excellent';
  if (score >= SCORE_THRESHOLDS.good) return 'good';
  if (score >= SCORE_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

/**
 * 가중 평균 점수 계산
 */
export function calculateWeightedScore(scores: BestCaseScores): number {
  let total = 0;
  for (const [category, score] of Object.entries(scores)) {
    const meta = SCORE_CATEGORIES[category as keyof BestCaseScores];
    total += score * meta.weight;
  }
  return Math.round(total);
}

/**
 * 우수 카테고리 추출 (80점 이상)
 */
export function getExcellentCategories(scores: BestCaseScores): Array<keyof BestCaseScores> {
  return Object.entries(scores)
    .filter(([_, score]) => score >= SAVE_CRITERIA.minExcellentScore)
    .map(([category]) => category as keyof BestCaseScores);
}

/**
 * 저장 가치 판정
 */
export function shouldSaveBestCase(scores: BestCaseScores): {
  shouldSave: boolean;
  reason: string;
  totalScore: number;
  excellentIn: Array<keyof BestCaseScores>;
} {
  const totalScore = calculateWeightedScore(scores);
  const excellentIn = getExcellentCategories(scores);

  // 조건 1: 전체 점수가 높음
  if (totalScore >= SCORE_THRESHOLDS.good) {
    return {
      shouldSave: true,
      reason: `총점 ${totalScore}점으로 우수`,
      totalScore,
      excellentIn
    };
  }

  // 조건 2: 하나 이상의 영역에서 우수
  if (excellentIn.length >= SAVE_CRITERIA.minExcellentCount) {
    return {
      shouldSave: true,
      reason: `${excellentIn.join(', ')} 영역에서 우수 (${excellentIn.length}개)`,
      totalScore,
      excellentIn
    };
  }

  // 조건 3: 중요 카테고리에서 매우 우수
  for (const category of SAVE_CRITERIA.criticalCategories) {
    const score = scores[category as keyof BestCaseScores];
    if (score >= SAVE_CRITERIA.minCriticalScore) {
      return {
        shouldSave: true,
        reason: `${SCORE_CATEGORIES[category as keyof BestCaseScores].name} 영역 특히 우수 (${score}점)`,
        totalScore,
        excellentIn
      };
    }
  }

  // 조건 4: 최소 기준 충족
  if (totalScore >= SAVE_CRITERIA.minTotalScore) {
    return {
      shouldSave: true,
      reason: `최소 기준 충족 (${totalScore}점)`,
      totalScore,
      excellentIn
    };
  }

  return {
    shouldSave: false,
    reason: `저장 기준 미달 (${totalScore}점)`,
    totalScore,
    excellentIn
  };
}

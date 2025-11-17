import { BestCaseStorage, type BestCase } from '../../packages/bestcase-db/dist/index.js';
import type { BestCaseScores } from '../../packages/bestcase-db/dist/types.js';

const storage = new BestCaseStorage();

interface SearchBestCasesInput {
  /** 우수 영역 필터 (OR 조건) */
  excellentIn?: Array<keyof BestCaseScores>;
  /** 최소 총점 */
  minTotalScore?: number;
  /** 프로젝트 이름 */
  projectName?: string;
  /** 태그 (OR 조건) */
  tags?: string[];
  /** 점수대 필터 */
  scoreGrade?: 'excellent' | 'good' | 'fair' | 'poor';
  /** 카테고리별 점수 범위 필터 */
  scores?: {
    [K in keyof BestCaseScores]?: {
      min?: number;
      max?: number;
    };
  };
}

interface SearchBestCasesOutput {
  /** 매칭된 BestCase ID 목록 */
  ids: string[];
  /** 점수 요약 정보 */
  summary: Array<{
    id: string;
    projectName: string;
    category: string;
    description: string;
    totalScore?: number;
    excellentIn?: Array<keyof BestCaseScores>;
    scores?: BestCaseScores;
    tags: string[];
  }>;
  /** 총 매칭 개수 */
  total: number;
}

/**
 * BestCase 고급 검색
 *
 * 다양한 필터 조건으로 BestCase를 검색합니다.
 *
 * @example
 * // 구조가 우수한 케이스 검색
 * const result = await bestcase.searchBestCases({
 *   excellentIn: ['structure']
 * });
 *
 * @example
 * // 75점 이상의 우수 케이스 검색
 * const result = await bestcase.searchBestCases({
 *   minTotalScore: 75
 * });
 *
 * @example
 * // 복합 조건: 구조 또는 API 연결이 우수하고, 80점 이상
 * const result = await bestcase.searchBestCases({
 *   excellentIn: ['structure', 'apiConnection'],
 *   minTotalScore: 80
 * });
 *
 * @example
 * // 카테고리별 점수 범위: 구조 80점 이상, 에러 핸들링 70점 이상
 * const result = await bestcase.searchBestCases({
 *   scores: {
 *     structure: { min: 80 },
 *     errorHandling: { min: 70 }
 *   }
 * });
 *
 * @example
 * // 프로젝트별 검색
 * const result = await bestcase.searchBestCases({
 *   projectName: 'ecommerce-frontend',
 *   minTotalScore: 70
 * });
 *
 * @example
 * // 태그 기반 검색
 * const result = await bestcase.searchBestCases({
 *   tags: ['vue3', 'grpc']
 * });
 */
export async function searchBestCases(input: SearchBestCasesInput = {}): Promise<SearchBestCasesOutput> {
  console.error('[searchBestCases] Input:', JSON.stringify(input, null, 2));

  // 1. 인덱스 기반 검색 (excellentIn, minTotalScore, projectName, tags, scoreGrade)
  const indexQuery: any = {};

  if (input.excellentIn) {
    indexQuery.excellentIn = input.excellentIn;
  }
  if (input.minTotalScore !== undefined) {
    indexQuery.minTotalScore = input.minTotalScore;
  }
  if (input.projectName) {
    indexQuery.projectName = input.projectName;
  }
  if (input.tags) {
    indexQuery.tags = input.tags;
  }
  if (input.scoreGrade) {
    indexQuery.scoreGrade = input.scoreGrade;
  }

  let results: BestCase[] = [];

  // 인덱스 검색이 가능한 경우
  if (Object.keys(indexQuery).length > 0) {
    console.error('[searchBestCases] Using index search:', indexQuery);
    results = await storage.searchByIndex(indexQuery);
  } else {
    // 필터 없이 전체 목록
    console.error('[searchBestCases] No index filters, loading all cases');
    results = await storage.list();
  }

  console.error('[searchBestCases] Index search results:', results.length);

  // 2. 카테고리별 점수 범위 필터 (후처리)
  if (input.scores) {
    console.error('[searchBestCases] Applying score range filters:', input.scores);

    results = results.filter(bc => {
      if (!bc.scores) return false;

      for (const [category, range] of Object.entries(input.scores!)) {
        const score = bc.scores[category as keyof BestCaseScores];

        if (score === undefined) {
          return false;
        }

        if (range.min !== undefined && score < range.min) {
          return false;
        }

        if (range.max !== undefined && score > range.max) {
          return false;
        }
      }

      return true;
    });

    console.error('[searchBestCases] After score range filter:', results.length);
  }

  // 3. 결과 생성
  const ids = results.map(bc => bc.id);
  const summary = results.map(bc => ({
    id: bc.id,
    projectName: bc.projectName,
    category: bc.category,
    description: bc.description,
    totalScore: bc.totalScore,
    excellentIn: bc.excellentIn,
    scores: bc.scores,
    tags: bc.metadata.tags
  }));

  console.error('[searchBestCases] Final results:', results.length);

  return {
    ids,
    summary,
    total: results.length
  };
}

/**
 * BestCase 인덱싱 시스템
 *
 * local-packages.json과 유사하게 BestCase를 효율적으로 검색할 수 있도록 인덱싱합니다.
 */

import type { BestCase } from './storage.js';
import type { BestCaseScores } from './types.js';

/**
 * BestCase 인덱스 구조
 */
export interface BestCaseIndex {
  version: string;
  indexedAt: string;
  totalCases: number;

  /**
   * 프로젝트별 인덱스
   * 예: { "my-project": ["bc-001", "bc-002"] }
   */
  byProject: Record<string, string[]>;

  /**
   * 카테고리별 인덱스
   * 예: { "structure": ["bc-001"], "apiConnection": ["bc-002"] }
   */
  byExcellence: Record<keyof BestCaseScores, string[]>;

  /**
   * 태그별 인덱스
   * 예: { "vue3": ["bc-001", "bc-002"], "grpc": ["bc-003"] }
   */
  byTag: Record<string, string[]>;

  /**
   * 점수대별 인덱스 (총점 기준)
   * 예: { "excellent": ["bc-001"], "good": ["bc-002"], "fair": ["bc-003"] }
   */
  byScoreGrade: {
    excellent: string[];  // 85점 이상
    good: string[];       // 70-84점
    fair: string[];       // 50-69점
    poor: string[];       // 50점 미만
  };

  /**
   * 빠른 조회용 요약 정보
   */
  summary: Array<{
    id: string;
    projectName: string;
    category: string;
    description: string;
    totalScore?: number;
    excellentIn?: Array<keyof BestCaseScores>;
    tags: string[];
    createdAt: string;
  }>;
}

/**
 * BestCase 목록으로부터 인덱스 생성
 */
export function buildIndex(bestCases: BestCase[]): BestCaseIndex {
  const index: BestCaseIndex = {
    version: '1.0.0',
    indexedAt: new Date().toISOString(),
    totalCases: bestCases.length,
    byProject: {},
    byExcellence: {
      structure: [],
      apiConnection: [],
      designSystem: [],
      utilityUsage: [],
      errorHandling: [],
      typeUsage: [],
      stateManagement: [],
      performance: []
    },
    byTag: {},
    byScoreGrade: {
      excellent: [],
      good: [],
      fair: [],
      poor: []
    },
    summary: []
  };

  for (const bestCase of bestCases) {
    const id = bestCase.id;

    // 프로젝트별 인덱싱
    if (!index.byProject[bestCase.projectName]) {
      index.byProject[bestCase.projectName] = [];
    }
    index.byProject[bestCase.projectName].push(id);

    // 우수 카테고리별 인덱싱
    if (bestCase.excellentIn && bestCase.excellentIn.length > 0) {
      for (const category of bestCase.excellentIn) {
        index.byExcellence[category].push(id);
      }
    }

    // 태그별 인덱싱
    for (const tag of bestCase.metadata.tags) {
      if (!index.byTag[tag]) {
        index.byTag[tag] = [];
      }
      index.byTag[tag].push(id);
    }

    // 점수대별 인덱싱
    const totalScore = bestCase.totalScore || 0;
    if (totalScore >= 85) {
      index.byScoreGrade.excellent.push(id);
    } else if (totalScore >= 70) {
      index.byScoreGrade.good.push(id);
    } else if (totalScore >= 50) {
      index.byScoreGrade.fair.push(id);
    } else {
      index.byScoreGrade.poor.push(id);
    }

    // 요약 정보
    index.summary.push({
      id: bestCase.id,
      projectName: bestCase.projectName,
      category: bestCase.category,
      description: bestCase.description,
      totalScore: bestCase.totalScore,
      excellentIn: bestCase.excellentIn,
      tags: bestCase.metadata.tags,
      createdAt: bestCase.metadata.createdAt
    });
  }

  return index;
}

/**
 * 인덱스를 사용한 빠른 검색
 */
export interface IndexSearchQuery {
  projectName?: string;
  excellentIn?: Array<keyof BestCaseScores>;  // OR 조건
  tags?: string[];  // OR 조건
  minTotalScore?: number;
  scoreGrade?: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * 인덱스 기반 검색 (ID 목록 반환)
 */
export function searchIndex(
  index: BestCaseIndex,
  query: IndexSearchQuery
): string[] {
  let candidateIds: Set<string> | null = null;

  // 1. 프로젝트 필터
  if (query.projectName) {
    const projectIds = index.byProject[query.projectName] || [];
    candidateIds = new Set(projectIds);
  }

  // 2. 우수 카테고리 필터 (OR 조건)
  if (query.excellentIn && query.excellentIn.length > 0) {
    const excellenceIds = new Set<string>();
    for (const category of query.excellentIn) {
      for (const id of index.byExcellence[category]) {
        excellenceIds.add(id);
      }
    }

    if (candidateIds) {
      candidateIds = new Set([...candidateIds].filter(id => excellenceIds.has(id)));
    } else {
      candidateIds = excellenceIds;
    }
  }

  // 3. 태그 필터 (OR 조건)
  if (query.tags && query.tags.length > 0) {
    const tagIds = new Set<string>();
    for (const tag of query.tags) {
      const ids = index.byTag[tag] || [];
      for (const id of ids) {
        tagIds.add(id);
      }
    }

    if (candidateIds) {
      candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)));
    } else {
      candidateIds = tagIds;
    }
  }

  // 4. 점수 등급 필터
  if (query.scoreGrade) {
    const gradeIds = new Set(index.byScoreGrade[query.scoreGrade]);

    if (candidateIds) {
      candidateIds = new Set([...candidateIds].filter(id => gradeIds.has(id)));
    } else {
      candidateIds = gradeIds;
    }
  }

  // 5. 최소 점수 필터
  if (query.minTotalScore !== undefined) {
    const scoreFilteredIds = index.summary
      .filter(s => (s.totalScore || 0) >= query.minTotalScore!)
      .map(s => s.id);

    if (candidateIds) {
      candidateIds = new Set([...candidateIds].filter(id => scoreFilteredIds.includes(id)));
    } else {
      candidateIds = new Set(scoreFilteredIds);
    }
  }

  // 결과 반환
  if (candidateIds === null) {
    return index.summary.map(s => s.id);
  }

  return Array.from(candidateIds);
}

/**
 * 인덱스 통계 정보
 */
export function getIndexStats(index: BestCaseIndex): {
  totalCases: number;
  projectCount: number;
  tagCount: number;
  excellenceDistribution: Record<keyof BestCaseScores, number>;
  scoreGradeDistribution: Record<'excellent' | 'good' | 'fair' | 'poor', number>;
} {
  return {
    totalCases: index.totalCases,
    projectCount: Object.keys(index.byProject).length,
    tagCount: Object.keys(index.byTag).length,
    excellenceDistribution: {
      structure: index.byExcellence.structure.length,
      apiConnection: index.byExcellence.apiConnection.length,
      designSystem: index.byExcellence.designSystem.length,
      utilityUsage: index.byExcellence.utilityUsage.length,
      errorHandling: index.byExcellence.errorHandling.length,
      typeUsage: index.byExcellence.typeUsage.length,
      stateManagement: index.byExcellence.stateManagement.length,
      performance: index.byExcellence.performance.length
    },
    scoreGradeDistribution: {
      excellent: index.byScoreGrade.excellent.length,
      good: index.byScoreGrade.good.length,
      fair: index.byScoreGrade.fair.length,
      poor: index.byScoreGrade.poor.length
    }
  };
}

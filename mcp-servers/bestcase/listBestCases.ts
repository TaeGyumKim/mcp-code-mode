import { BestCaseStorage } from '../../packages/bestcase-db/dist/index.js';

export interface ListBestCasesOutput {
  bestcases: Array<{
    id: string;
    projectName: string;
    category: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    /** 다차원 점수 (v2.0+) */
    scores?: {
      structure: number;
      apiConnection: number;
      designSystem: number;
      utilityUsage: number;
      errorHandling: number;
      typeUsage: number;
      stateManagement: number;
      performance: number;
    };
    /** 가중 평균 총점 */
    totalScore?: number;
    /** 우수 영역 (80점 이상) */
    excellentIn?: string[];
    /** 하위 호환: 기존 점수 (deprecated) */
    legacyScores?: {
      total: number;
      api: number;
      component: number;
      tier: string;
    };
  }>;
  total: number;
}

/**
 * 모든 BestCase 목록 조회 (다차원 점수 정보 포함)
 * @example
 * const list = await bestcase.listBestCases();
 * console.log(`Total: ${list.total}`);
 * list.bestcases.forEach(bc => {
 *   console.log(`${bc.projectName}: ${bc.totalScore}/100`);
 *   if (bc.excellentIn && bc.excellentIn.length > 0) {
 *     console.log(`  Excellent in: ${bc.excellentIn.join(', ')}`);
 *   }
 *   if (bc.scores) {
 *     console.log(`  Structure: ${bc.scores.structure}, API: ${bc.scores.apiConnection}`);
 *   }
 * });
 */
export async function listBestCases(): Promise<ListBestCasesOutput> {
  const storage = new BestCaseStorage();
  const allCases = await storage.list();

  const bestcases = allCases.map(bc => {
    const item: any = {
      id: bc.id,
      projectName: bc.projectName,
      category: bc.category,
      description: bc.description,
      createdAt: bc.metadata.createdAt,
      updatedAt: bc.metadata.updatedAt,
      tags: bc.metadata.tags
    };

    // 다차원 점수 정보 (v2.0+)
    if (bc.scores) {
      item.scores = bc.scores;
    }

    if (bc.totalScore !== undefined) {
      item.totalScore = bc.totalScore;
    }

    if (bc.excellentIn && bc.excellentIn.length > 0) {
      item.excellentIn = bc.excellentIn;
    }

    // 하위 호환: 기존 점수 (deprecated)
    if (bc.patterns && bc.patterns.scores) {
      item.legacyScores = bc.patterns.scores;
    }

    return item;
  });

  // 점수 기반 정렬: totalScore → excellentIn 개수 → 이름순
  bestcases.sort((a, b) => {
    // totalScore가 있으면 우선 비교
    if (a.totalScore !== undefined && b.totalScore !== undefined) {
      const scoreDiff = b.totalScore - a.totalScore;
      if (scoreDiff !== 0) return scoreDiff;

      // 같은 총점이면 우수 영역 개수로 비교
      const aExcellent = a.excellentIn?.length || 0;
      const bExcellent = b.excellentIn?.length || 0;
      const excellentDiff = bExcellent - aExcellent;
      if (excellentDiff !== 0) return excellentDiff;
    }

    // 점수 있는 항목이 앞으로
    if (a.totalScore !== undefined && b.totalScore === undefined) return -1;
    if (a.totalScore === undefined && b.totalScore !== undefined) return 1;

    // 하위 호환: 기존 tier 비교
    if (a.legacyScores && b.legacyScores) {
      const tierOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
      const tierDiff = (tierOrder[b.legacyScores.tier] || 0) - (tierOrder[a.legacyScores.tier] || 0);
      if (tierDiff !== 0) return tierDiff;
    }

    // 둘 다 점수 없으면 이름순
    return a.projectName.localeCompare(b.projectName);
  });

  return {
    bestcases,
    total: bestcases.length
  };
}

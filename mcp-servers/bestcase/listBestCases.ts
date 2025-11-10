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
    scores?: {
      total: number;
      api: number;
      component: number;
      tier: string;
    };
  }>;
  total: number;
}

/**
 * 모든 BestCase 목록 조회 (점수 정보 포함)
 * @example
 * const list = await bestcase.listBestCases();
 * console.log(`Total: ${list.total}`);
 * list.bestcases.forEach(bc => {
 *   if (bc.scores) {
 *     console.log(`${bc.projectName}: Tier ${bc.scores.tier} (${bc.scores.total}/100)`);
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
    
    // 점수 정보가 있으면 포함
    if (bc.patterns && bc.patterns.scores) {
      item.scores = bc.patterns.scores;
    }
    
    return item;
  });
  
  // 점수 기반 정렬: tier → total → api → component
  bestcases.sort((a, b) => {
    const tierOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
    
    if (a.scores && b.scores) {
      // Tier 비교
      const tierDiff = (tierOrder[b.scores.tier] || 0) - (tierOrder[a.scores.tier] || 0);
      if (tierDiff !== 0) return tierDiff;
      
      // Total 점수 비교
      const totalDiff = b.scores.total - a.scores.total;
      if (totalDiff !== 0) return totalDiff;
      
      // API 점수 비교
      const apiDiff = b.scores.api - a.scores.api;
      if (apiDiff !== 0) return apiDiff;
      
      // Component 점수 비교
      return b.scores.component - a.scores.component;
    }
    
    // 점수 없는 항목은 뒤로
    if (a.scores && !b.scores) return -1;
    if (!a.scores && b.scores) return 1;
    
    // 둘 다 점수 없으면 이름순
    return a.projectName.localeCompare(b.projectName);
  });
  
  return {
    bestcases,
    total: bestcases.length
  };
}

import { BestCaseStorage, type BestCase } from '../../packages/bestcase-db/dist/index.js';

const storage = new BestCaseStorage();

interface LoadBestCaseInput {
  /** BestCase ID 또는 검색 조건 */
  id?: string;
  projectName?: string;
  category?: string;
}

interface LoadBestCaseOutput {
  bestCase: {
    id: string;
    projectName: string;
    category: string;
    description: string;
    files: Array<{
      path: string;
      content: string;
      category?: string;
    }>;
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
    /** 패턴 정보 */
    patterns?: any;
    /** 하위 호환: 기존 점수 (deprecated) */
    legacyScores?: {
      total: number;
      api: number;
      component: number;
      tier: string;
    };
  } | null;
  debug?: {
    storagePath: string;
    searchQuery: any;
    resultsCount: number;
  };
}

/**
 * 저장된 BestCase를 불러옵니다 (다차원 점수 정보 포함)
 * @example
 * const result = await bestcase.loadBestCase({
 *   projectName: 'myapp',
 *   category: 'typescript-config'
 * });
 *
 * if (result.bestCase) {
 *   console.log(`Total Score: ${result.bestCase.totalScore}/100`);
 *
 *   if (result.bestCase.excellentIn && result.bestCase.excellentIn.length > 0) {
 *     console.log(`Excellent in: ${result.bestCase.excellentIn.join(', ')}`);
 *   }
 *
 *   if (result.bestCase.scores) {
 *     console.log('Category Scores:');
 *     console.log(`  Structure: ${result.bestCase.scores.structure}/100`);
 *     console.log(`  API Connection: ${result.bestCase.scores.apiConnection}/100`);
 *     console.log(`  Design System: ${result.bestCase.scores.designSystem}/100`);
 *   }
 * }
 */
export async function loadBestCase(input: LoadBestCaseInput): Promise<LoadBestCaseOutput> {
  console.error('[loadBestCase] Input:', JSON.stringify(input, null, 2));
  console.error('[loadBestCase] Storage path:', storage['storagePath']);
  
  if (input.id) {
    console.error('[loadBestCase] Loading by ID:', input.id);
    const bc = await storage.load(input.id);
    console.error('[loadBestCase] Result:', bc ? 'Found' : 'Not found');

    const bestCase = bc ? transformBestCase(bc) : null;

    return {
      bestCase,
      debug: {
        storagePath: storage['storagePath'],
        searchQuery: { id: input.id },
        resultsCount: bestCase ? 1 : 0,
      }
    };
  }
  
  const searchQuery = {
    projectName: input.projectName,
    category: input.category
  };
  
  console.error('[loadBestCase] Searching:', JSON.stringify(searchQuery, null, 2));
  
  const results = await storage.search(searchQuery);
  
  console.error('[loadBestCase] Search results:', results.length);
  if (results.length > 0) {
    console.error('[loadBestCase] First result:', {
      id: results[0].id,
      projectName: results[0].projectName,
      category: results[0].category,
    });
  }

  const bestCase = results.length > 0 ? transformBestCase(results[0]) : null;

  return {
    bestCase,
    debug: {
      storagePath: storage['storagePath'],
      searchQuery,
      resultsCount: results.length,
    }
  };
}

/**
 * BestCase를 새 점수 구조로 변환
 */
function transformBestCase(bc: BestCase): LoadBestCaseOutput['bestCase'] {
  const item: any = {
    id: bc.id,
    projectName: bc.projectName,
    category: bc.category,
    description: bc.description,
    files: bc.files,
    createdAt: bc.metadata.createdAt,
    updatedAt: bc.metadata.updatedAt,
    tags: bc.metadata.tags
  };

  // 패턴 정보
  if (bc.patterns) {
    item.patterns = bc.patterns;
  }

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
}
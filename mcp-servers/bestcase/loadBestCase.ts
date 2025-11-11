import { BestCaseStorage, type BestCase } from '../../packages/bestcase-db/dist/index.js';

const storage = new BestCaseStorage();

interface LoadBestCaseInput {
  /** BestCase ID 또는 검색 조건 */
  id?: string;
  projectName?: string;
  category?: string;
}

interface LoadBestCaseOutput {
  bestCase: BestCase | null;
  debug?: {
    storagePath: string;
    searchQuery: any;
    resultsCount: number;
  };
}

/**
 * 저장된 BestCase를 불러옵니다
 * @example
 * const result = await bestcase.loadBestCase({
 *   projectName: 'myapp',
 *   category: 'typescript-config'
 * });
 */
export async function loadBestCase(input: LoadBestCaseInput): Promise<LoadBestCaseOutput> {
  console.error('[loadBestCase] Input:', JSON.stringify(input, null, 2));
  console.error('[loadBestCase] Storage path:', storage['storagePath']);
  
  if (input.id) {
    console.error('[loadBestCase] Loading by ID:', input.id);
    const bestCase = await storage.load(input.id);
    console.error('[loadBestCase] Result:', bestCase ? 'Found' : 'Not found');
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
  
  return {
    bestCase: results.length > 0 ? results[0] : null,
    debug: {
      storagePath: storage['storagePath'],
      searchQuery,
      resultsCount: results.length,
    }
  };
}
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
  if (input.id) {
    const bestCase = await storage.load(input.id);
    return { bestCase };
  }
  
  const results = await storage.search({
    projectName: input.projectName,
    category: input.category
  });
  
  return {
    bestCase: results.length > 0 ? results[0] : null
  };
}
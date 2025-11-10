import { BestCaseStorage, type BestCase } from '../../packages/bestcase-db/dist/index.js';

const storage = new BestCaseStorage();

interface SaveBestCaseInput {
  projectName: string;
  category: string;
  description: string;
  files: Array<{
    path: string;
    content: string;
    purpose: string;
  }>;
  patterns?: { [key: string]: any };
  tags?: string[];
}

interface SaveBestCaseOutput {
  id: string;
  success: boolean;
}

/**
 * 프로젝트의 BestCase를 저장합니다
 * @example
 * const result = await bestcase.saveBestCase({
 *   projectName: 'myapp',
 *   category: 'typescript-config',
 *   description: 'TypeScript 프로젝트 설정',
 *   files: [
 *     {
 *       path: 'tsconfig.json',
 *       content: '{ "compilerOptions": {...} }',
 *       purpose: 'TypeScript 컴파일러 설정'
 *     }
 *   ],
 *   tags: ['typescript', 'config']
 * });
 */
export async function saveBestCase(input: SaveBestCaseInput): Promise<SaveBestCaseOutput> {
  // 프로젝트명에서 슬래시를 대시로 변환
  const sanitizedProjectName = input.projectName.replace(/\//g, '-').replace(/\\/g, '-');
  const id = `${sanitizedProjectName}-${input.category}-${Date.now()}`;
  
  const bestCase: BestCase = {
    id,
    projectName: input.projectName,
    category: input.category,
    description: input.description,
    files: input.files,
    patterns: input.patterns || {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: input.tags || []
    }
  };
  
  await storage.save(bestCase);
  
  return {
    id,
    success: true
  };
}
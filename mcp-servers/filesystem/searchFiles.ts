import { promises as fs } from 'fs';
import { join } from 'path';

interface SearchFilesInput {
  /** 검색할 디렉토리 경로 */
  path: string;
  /** 파일 패턴 (예: *.ts, package.json) */
  pattern?: string;
  /** 재귀 검색 여부 */
  recursive?: boolean;
}

interface SearchFilesOutput {
  files: Array<{
    path: string;
    name: string;
    size: number;
    isDirectory: boolean;
  }>;
}

/**
 * 디렉토리에서 파일을 검색합니다
 * @example
 * const result = await filesystem.searchFiles({
 *   path: 'D:/01.Work/01.Projects/myapp',
 *   pattern: '*.ts',
 *   recursive: true
 * });
 */
export async function searchFiles(input: SearchFilesInput): Promise<SearchFilesOutput> {
  const results: SearchFilesOutput['files'] = [];
  
  async function search(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // 패턴 매칭
      if (input.pattern && !matchPattern(entry.name, input.pattern)) {
        continue;
      }
      
      const stat = await fs.stat(fullPath);
      results.push({
        path: fullPath,
        name: entry.name,
        size: stat.size,
        isDirectory: entry.isDirectory()
      });
      
      // 재귀 검색
      if (input.recursive && entry.isDirectory()) {
        await search(fullPath);
      }
    }
  }
  
  await search(input.path);
  return { files: results };
}

function matchPattern(filename: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return regex.test(filename);
}
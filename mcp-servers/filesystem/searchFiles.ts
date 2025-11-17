import { promises as fs } from 'fs';
import { join } from 'path';
import { convertHostPathToContainer, convertContainerPathToHost } from './pathUtils.js';

interface SearchFilesInput {
  /** 검색할 디렉토리 경로 (호스트 경로 또는 컨테이너 경로) */
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
 * 호스트 경로를 자동으로 컨테이너 경로로 변환합니다.
 *
 * @example
 * // 호스트 경로 (클라이언트가 전달)
 * const result = await filesystem.searchFiles({
 *   path: 'D:/01.Work/01.Projects/myapp',
 *   pattern: '*.ts',
 *   recursive: true
 * });
 *
 * // 또는 컨테이너 경로 (sandbox 내부)
 * const result = await filesystem.searchFiles({
 *   path: '/projects/myapp',
 *   pattern: '*.ts',
 *   recursive: true
 * });
 */
export async function searchFiles(input: SearchFilesInput): Promise<SearchFilesOutput> {
  // 호스트 경로 → 컨테이너 경로 변환
  const containerPath = convertHostPathToContainer(input.path);
  const isHostPath = input.path !== containerPath;  // 호스트 경로였는지 확인

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

      // 결과 경로: 호스트 경로로 전달받았으면 호스트 경로로 반환
      const resultPath = isHostPath ? convertContainerPathToHost(fullPath) : fullPath;

      results.push({
        path: resultPath,
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

  await search(containerPath);
  return { files: results };
}

function matchPattern(filename: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return regex.test(filename);
}
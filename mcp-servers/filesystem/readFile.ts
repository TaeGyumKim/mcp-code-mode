import { promises as fs } from 'fs';
import { convertHostPathToContainer } from './pathUtils.js';

interface ReadFileInput {
  /** 읽을 파일의 절대 경로 (호스트 경로 또는 컨테이너 경로) */
  path: string;
}

interface ReadFileOutput {
  content: string;
  size: number;
}

/**
 * 파일 내용을 읽습니다
 * 호스트 경로를 자동으로 컨테이너 경로로 변환합니다.
 *
 * @example
 * // 호스트 경로 (클라이언트가 전달)
 * const result = await filesystem.readFile({
 *   path: 'D:/01.Work/01.Projects/myapp/src/index.ts'
 * });
 *
 * // 또는 컨테이너 경로 (sandbox 내부)
 * const result = await filesystem.readFile({
 *   path: '/projects/myapp/src/index.ts'
 * });
 */
export async function readFile(input: ReadFileInput): Promise<ReadFileOutput> {
  // 호스트 경로 → 컨테이너 경로 변환
  const containerPath = convertHostPathToContainer(input.path);

  const content = await fs.readFile(containerPath, 'utf-8');
  return {
    content,
    size: content.length
  };
}
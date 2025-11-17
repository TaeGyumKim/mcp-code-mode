import { promises as fs } from 'fs';
import { dirname } from 'path';
import { convertHostPathToContainer } from './pathUtils.js';

interface WriteFileInput {
  /** 생성할 파일의 절대 경로 (호스트 경로 또는 컨테이너 경로) */
  path: string;
  /** 파일 내용 */
  content: string;
}

interface WriteFileOutput {
  success: boolean;
  path: string;
}

/**
 * 파일을 생성하거나 덮어씁니다
 * 호스트 경로를 자동으로 컨테이너 경로로 변환합니다.
 *
 * @example
 * // 호스트 경로 (클라이언트가 전달)
 * await filesystem.writeFile({
 *   path: 'D:/01.Work/01.Projects/myapp/src/newFile.ts',
 *   content: 'export const hello = "world";'
 * });
 *
 * // 또는 컨테이너 경로 (sandbox 내부)
 * await filesystem.writeFile({
 *   path: '/projects/myapp/src/newFile.ts',
 *   content: 'export const hello = "world";'
 * });
 */
export async function writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
  // 호스트 경로 → 컨테이너 경로 변환
  const containerPath = convertHostPathToContainer(input.path);

  await fs.mkdir(dirname(containerPath), { recursive: true });
  await fs.writeFile(containerPath, input.content, 'utf-8');
  return {
    success: true,
    path: input.path  // 원본 경로 반환
  };
}
import { promises as fs } from 'fs';
import { dirname } from 'path';

interface WriteFileInput {
  /** 생성할 파일의 절대 경로 */
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
 * @example
 * await filesystem.writeFile({
 *   path: 'D:/01.Work/01.Projects/myapp/src/newFile.ts',
 *   content: 'export const hello = "world";'
 * });
 */
export async function writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
  await fs.mkdir(dirname(input.path), { recursive: true });
  await fs.writeFile(input.path, input.content, 'utf-8');
  return {
    success: true,
    path: input.path
  };
}
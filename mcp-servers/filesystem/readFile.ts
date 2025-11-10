import { promises as fs } from 'fs';

interface ReadFileInput {
  /** 읽을 파일의 절대 경로 */
  path: string;
}

interface ReadFileOutput {
  content: string;
  size: number;
}

/**
 * 파일 내용을 읽습니다
 * @example
 * const result = await filesystem.readFile({ 
 *   path: 'D:/01.Work/01.Projects/myapp/src/index.ts' 
 * });
 */
export async function readFile(input: ReadFileInput): Promise<ReadFileOutput> {
  const content = await fs.readFile(input.path, 'utf-8');
  return {
    content,
    size: content.length
  };
}
import { VM } from 'vm2';
import * as filesystem from '../../../mcp-servers/filesystem/index.js';
import * as bestcase from '../../../mcp-servers/bestcase/index.js';

export interface SandboxResult {
  ok: boolean;
  output?: any;
  logs?: string[];
  error?: string;
}

/**
 * TypeScript 코드를 안전한 샌드박스에서 실행합니다
 * 
 * 코드는 다음 API에 접근할 수 있습니다:
 * - filesystem: 파일 읽기/쓰기/검색
 * - bestcase: BestCase 저장/로드
 */
export async function runInSandbox(code: string, timeoutMs: number = 30000): Promise<SandboxResult> {
  const logs: string[] = [];
  
  try {
    const vm = new VM({
      timeout: timeoutMs,
      sandbox: {
        filesystem,
        bestcase,
        console: {
          log: (...args: any[]) => {
            logs.push(args.map(a => String(a)).join(' '));
          },
          error: (...args: any[]) => {
            logs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
          }
        }
      }
    });

    const result = await vm.run(`
      (async () => {
        ${code}
      })()
    `);

    return {
      ok: true,
      output: result,
      logs
    };
  } catch (error) {
    return {
      ok: false,
      logs,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
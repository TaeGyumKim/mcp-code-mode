import { VM } from 'vm2';
import * as filesystem from '../../../mcp-servers/filesystem/index.js';
import * as bestcase from '../../../mcp-servers/bestcase/index.js';
import * as guides from '../../../mcp-servers/guides/dist/index.js';
import { MetadataAnalyzer } from '../../llm-analyzer/src/metadataAnalyzer.js';

export interface SandboxResult {
  ok: boolean;
  output?: any;
  logs?: string[];
  error?: string;
}

/**
 * TypeScript 코드를 안전한 샌드박스에서 실행합니다
 *
 * Anthropic MCP Code Mode 방식:
 * - MCP 도구를 최소화 (execute 하나)
 * - Sandbox API로 기능 제공
 * - 클라이언트가 TypeScript 코드 작성
 *
 * 사용 가능한 API:
 * - filesystem: 파일 읽기/쓰기/검색
 * - bestcase: BestCase 저장/로드/검색
 * - guides: 가이드 검색/로드/병합
 * - metadata: 메타데이터 추출 및 분석
 */
export async function runInSandbox(code: string, timeoutMs: number = 30000): Promise<SandboxResult> {
  const logs: string[] = [];
  
  try {
    const vm = new VM({
      timeout: timeoutMs,
      sandbox: {
        // Filesystem API
        filesystem,

        // BestCase API
        bestcase,

        // Guides API (동적 가이드 로딩)
        guides,

        // Metadata API (메타데이터 추출)
        metadata: {
          /**
           * MetadataAnalyzer 인스턴스 생성
           *
           * @example
           * const analyzer = metadata.createAnalyzer({
           *   ollamaUrl: 'http://localhost:11434',
           *   model: 'qwen2.5-coder:7b'
           * });
           *
           * const projectMeta = await analyzer.analyzeProject(path, files, 3);
           */
          createAnalyzer: (config: { ollamaUrl: string; model: string }) => {
            return new MetadataAnalyzer(config);
          }
        },

        // Console API
        console: {
          log: (...args: any[]) => {
            logs.push(args.map(a => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (err) {
                  return String(a);
                }
              }
              return String(a);
            }).join(' '));
          },
          error: (...args: any[]) => {
            logs.push('[ERROR] ' + args.map(a => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (err) {
                  return String(a);
                }
              }
              return String(a);
            }).join(' '));
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
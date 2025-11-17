#!/usr/bin/env node
/**
 * MCP STDIO Server
 *
 * VS Code MCP Extension과 stdio 프로토콜로 통신하는 서버
 * Docker 컨테이너 내부에서 실행됩니다.
 */

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { analyzeAndRecommend } from './mcp-servers/bestcase/autoRecommend.js';
import * as readline from 'readline';

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: Record<string, any>;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface ToolCallParams {
  name: string;
  arguments: Record<string, any>;
}

interface ExecuteParams {
  code: string;
  timeoutMs?: number;
  // 자동 추천 컨텍스트 (선택적)
  autoRecommend?: {
    currentFile: string;
    filePath: string;
    description: string;
  };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function log(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = data 
    ? `[${timestamp}] ${message}: ${JSON.stringify(data)}`
    : `[${timestamp}] ${message}`;
  process.stderr.write(logMessage + '\n');
}

function sendResponse(response: JsonRpcResponse): void {
  log('Sending response', { id: response.id, method: response.result ? 'success' : 'error' });
  process.stdout.write(JSON.stringify(response) + '\n');
}

// 요청 처리
rl.on('line', async (line: string) => {
  try {
    const request = JSON.parse(line) as JsonRpcRequest;
    log('Received request', { method: request.method, id: request.id });
    
    // initialize 메서드: MCP 프로토콜 초기화
    if (request.method === 'initialize') {
      log('Initialize MCP server');
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'mcp-code-mode',
            version: '1.0.0'
          }
        }
      });
    }
    
    // notifications/initialized: 초기화 완료 알림
    else if (request.method === 'notifications/initialized') {
      // 알림은 응답 불필요
    }
    
    // tools/list 메서드: 사용 가능한 도구 목록
    else if (request.method === 'tools/list') {
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'execute',
              description: `Execute TypeScript code in sandbox with automatic RAG-based code recommendations. Anthropic MCP Code Mode approach for 98% token reduction.

When autoRecommend is provided, the server automatically:
1. Analyzes the current file
2. Searches for similar code using RAG (vector similarity + keyword matching)
3. Injects recommended code patterns into the sandbox context
4. Returns recommendations along with code execution result

This enables ONE call to get both recommendations and complete the implementation.

Sandbox APIs:
- context.recommendations - Pre-loaded similar code (when autoRecommend is used)
- filesystem.readFile/writeFile/searchFiles - File operations
- bestcase.searchFileCases({ keywords, fileRole }) - Additional searches if needed
- guides.searchGuides/combineGuides - Load development guides
- metadata.extractProjectContext - Analyze project structure`,
              inputSchema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: `TypeScript code to execute in sandbox.

When autoRecommend is provided, use context.recommendations:
// context.recommendations is auto-injected with similar code
const refs = context.recommendations;
console.log('Reference code:', refs[0].content);
// Complete implementation using the patterns`
                  },
                  timeoutMs: {
                    type: 'number',
                    description: 'Timeout in milliseconds',
                    default: 30000
                  },
                  autoRecommend: {
                    type: 'object',
                    description: 'Auto-fetch similar code recommendations before execution',
                    properties: {
                      currentFile: {
                        type: 'string',
                        description: 'Current file content to analyze'
                      },
                      filePath: {
                        type: 'string',
                        description: 'File path (e.g., pages/users/index.vue)'
                      },
                      description: {
                        type: 'string',
                        description: 'What to implement (e.g., "검색 페이지 완성")'
                      }
                    },
                    required: ['currentFile', 'filePath', 'description']
                  }
                },
                required: ['code']
              }
            }
          ]
        }
      });
    }
    
    // tools/call 메서드: 도구 실행
    else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params as ToolCallParams;
      log('Tool call', { tool: name, args });
      
      // ✅ execute 도구만 제공 (Anthropic Code Mode 방식)
      if (name === 'execute') {
        const execArgs = args as ExecuteParams;
        log('Executing code', { codeLength: execArgs.code?.length, hasAutoRecommend: !!execArgs.autoRecommend });

        // 자동 추천 컨텍스트 생성
        let recommendations: any[] = [];
        if (execArgs.autoRecommend) {
          log('Auto-recommend enabled, fetching similar code...');
          try {
            // Ollama 설정 (환경변수에서 가져옴)
            const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
            const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

            const ragResult = await analyzeAndRecommend({
              currentFile: execArgs.autoRecommend.currentFile,
              filePath: execArgs.autoRecommend.filePath,
              description: execArgs.autoRecommend.description,
              ollamaConfig: {
                url: ollamaUrl,
                embeddingModel: embeddingModel
              }
            });
            recommendations = ragResult.recommendations;
            log('RAG recommendations fetched', { count: recommendations.length });
          } catch (ragError) {
            log('RAG fetch failed', { error: ragError });
          }
        }

        // 추천 코드를 context에 주입하는 래퍼 코드 생성
        const wrappedCode = `
// Auto-injected context with RAG recommendations
const context = {
  recommendations: ${JSON.stringify(recommendations, null, 2)},
  hasRecommendations: ${recommendations.length > 0}
};

// User code starts here
${execArgs.code}
`;

        const result = await runAgentScript({
          code: wrappedCode,
          timeoutMs: execArgs.timeoutMs || 30000
        });
        log('Execution result', { success: !result.error });

        // 실행 결과를 JSON으로 변환 (추천 코드 포함)
        const responseText = JSON.stringify({
          ok: result.ok,
          output: result.output,
          logs: result.logs,
          error: result.error,
          // 추천 코드도 응답에 포함 (LLM이 직접 참고 가능)
          recommendations: recommendations.length > 0 ? recommendations.map(r => ({
            filePath: r.filePath,
            fileRole: r.fileRole,
            keywords: r.keywords,
            similarity: r.similarity,
            content: r.content,
            analysis: r.analysis
          })) : undefined
        }, null, 2);

        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: responseText
              }
            ]
          }
        });
      }
      else {
        log('Unknown tool', { tool: name });
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}. Only 'execute' tool is available. Use Sandbox APIs (filesystem, bestcase, guides, metadata) within execute.`
          }
        });
      }
    }
    
    // 지원하지 않는 메서드
    else {
      log('Unknown method', { method: request.method });
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      });
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 에러 응답
    sendResponse({
      jsonrpc: '2.0',
      id: (error as any)?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: errorMessage
      }
    });
  }
});

// 시작 메시지
process.stderr.write('MCP STDIO Server started\n');

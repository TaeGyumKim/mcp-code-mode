#!/usr/bin/env node
/**
 * MCP STDIO Server
 *
 * VS Code MCP Extension과 stdio 프로토콜로 통신하는 서버
 * Docker 컨테이너 내부에서 실행됩니다.
 */

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
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
              description: 'Execute TypeScript code in sandbox. Access filesystem, bestcase, guides, and metadata APIs within the sandbox. Anthropic MCP Code Mode approach for 98% token reduction.',
              inputSchema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'TypeScript code to execute. Available APIs: filesystem (read/write/search), bestcase (save/load/list), guides (search/load/combine), metadata (createAnalyzer)'
                  },
                  timeoutMs: {
                    type: 'number',
                    description: 'Timeout in milliseconds',
                    default: 30000
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
        log('Executing code', { codeLength: args.code?.length });
        const result = await runAgentScript({
          code: args.code,
          timeoutMs: args.timeoutMs || 30000
        });
        log('Execution result', { success: !result.error });

        // 🎯 프로젝트 컨텍스트를 포함한 응답 생성
        let responseText = '';

        // 프로젝트 컨텍스트 섹션
        if (result.projectContext) {
          responseText += '## 📋 Project Context\n\n';
          responseText += `**Project Path**: ${result.projectContext.projectPath || 'Unknown'}\n\n`;

          // 권장 플랜
          if (result.projectContext.recommendedPlan && result.projectContext.recommendedPlan.length > 0) {
            responseText += '### Recommended Plan\n\n';
            result.projectContext.recommendedPlan.forEach(plan => {
              responseText += `${plan}\n`;
            });
            responseText += '\n';
          }

          responseText += '---\n\n';
        }

        // 실행 결과 섹션
        responseText += '## ✅ Execution Result\n\n';
        responseText += JSON.stringify({
          ok: result.ok,
          output: result.output,
          logs: result.logs,
          error: result.error
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

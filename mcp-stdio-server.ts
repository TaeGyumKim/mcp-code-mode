#!/usr/bin/env node
/**
 * MCP STDIO Server
 *
 * VS Code MCP Extension과 stdio 프로토콜로 통신하는 서버
 * Docker 컨테이너 내부에서 실행됩니다.
 */

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import * as readline from 'readline';

// Guides 서버 함수 import (동적 지침 로딩 시스템)
import {
  searchGuides,
  loadGuide,
  combineGuides,
  executeWorkflow,
  type SearchGuidesInput,
  type LoadGuideInput,
  type CombineGuidesInput,
  type ExecuteWorkflowInput
} from './mcp-servers/guides/index.js';

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
              description: 'Execute code in sandbox with filesystem and bestcase APIs',
              inputSchema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'JavaScript code to execute' },
                  timeoutMs: { type: 'number', description: 'Timeout in milliseconds', default: 30000 }
                },
                required: ['code']
              }
            },
            {
              name: 'list_bestcases',
              description: 'List all saved BestCases with scores and metadata',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'load_bestcase',
              description: 'Load a specific BestCase by project name and category',
              inputSchema: {
                type: 'object',
                properties: {
                  projectName: { type: 'string', description: 'Project name' },
                  category: { type: 'string', description: 'BestCase category' }
                },
                required: ['projectName', 'category']
              }
            },
            {
              name: 'search_guides',
              description: 'Search for guidelines based on keywords, API type, and scope. Returns ranked guides using BM25-like scoring.',
              inputSchema: {
                type: 'object',
                properties: {
                  keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Keywords to search for (e.g., ["grpc", "nuxt3", "asyncData"])'
                  },
                  projectName: { type: 'string', description: 'Optional project name for context' },
                  apiType: {
                    type: 'string',
                    enum: ['grpc', 'openapi', 'any'],
                    description: 'API type filter'
                  },
                  scope: {
                    type: 'string',
                    enum: ['project', 'repo', 'org', 'global'],
                    description: 'Scope filter'
                  },
                  mandatoryIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Mandatory guide IDs to include regardless of keyword matching'
                  }
                },
                required: ['keywords']
              }
            },
            {
              name: 'load_guide',
              description: 'Load a specific guide by ID with full content and metadata',
              inputSchema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Guide ID (e.g., "grpc.api.connection")' }
                },
                required: ['id']
              }
            },
            {
              name: 'combine_guides',
              description: 'Combine multiple guides with priority rules (scope > priority > version). Handles requires/excludes dependencies.',
              inputSchema: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Guide IDs to combine'
                  },
                  context: {
                    type: 'object',
                    properties: {
                      project: { type: 'string', description: 'Project name' },
                      apiType: {
                        type: 'string',
                        enum: ['grpc', 'openapi', 'any'],
                        description: 'API type for context'
                      }
                    },
                    required: ['project', 'apiType']
                  }
                },
                required: ['ids', 'context']
              }
            },
            {
              name: 'execute_workflow',
              description: 'Execute the full dynamic guideline loading workflow: metadata extraction → TODO synthesis → preflight check → keyword extraction → guide search/combine → pattern application',
              inputSchema: {
                type: 'object',
                properties: {
                  userRequest: {
                    type: 'string',
                    description: 'User request text (e.g., "Create inquiry list page with gRPC")'
                  },
                  workspacePath: {
                    type: 'string',
                    description: 'Workspace path for project detection'
                  },
                  projectName: {
                    type: 'string',
                    description: 'Optional project name (extracted from workspace if not provided)'
                  },
                  category: {
                    type: 'string',
                    description: 'BestCase category to load',
                    default: 'auto-scan-ai'
                  }
                },
                required: ['userRequest', 'workspacePath']
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
      
      if (name === 'execute') {
        log('Executing code', { codeLength: args.code?.length });
        const result = await runAgentScript({
          code: args.code,
          timeoutMs: args.timeoutMs || 30000
        });
        log('Execution result', { success: !result.error });
        
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      }
      else if (name === 'list_bestcases') {
        log('Listing BestCases');
        const code = 'await bestcase.listBestCases()';
        const result = await runAgentScript({ code, timeoutMs: 10000 });
        log('BestCases listed', { count: result.output?.bestcases?.length });
        
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      }
      else if (name === 'load_bestcase') {
        const { projectName, category } = args;
        log('Loading BestCase', { projectName, category });
        const code = `await bestcase.loadBestCase({ projectName: '${projectName}', category: '${category}' })`;
        const result = await runAgentScript({ code, timeoutMs: 10000 });
        log('BestCase loaded', { success: !result.error });

        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      }

      // 🔑 동적 지침 로딩 시스템 도구들
      else if (name === 'search_guides') {
        const input: SearchGuidesInput = {
          keywords: args.keywords,
          projectName: args.projectName,
          apiType: args.apiType,
          scope: args.scope,
          mandatoryIds: args.mandatoryIds
        };
        log('Searching guides', { keywords: input.keywords, apiType: input.apiType });

        try {
          const result = await searchGuides(input);
          log('Guides found', { count: result.guides.length });

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          });
        } catch (error: any) {
          log('Search guides error', { message: error.message });
          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Failed to search guides: ' + error.message
            }
          });
        }
      }

      else if (name === 'load_guide') {
        const input: LoadGuideInput = {
          id: args.id
        };
        log('Loading guide', { id: input.id });

        try {
          const result = await loadGuide(input);
          log('Guide loaded', { id: result.guide.id, scope: result.guide.scope });

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          });
        } catch (error: any) {
          log('Load guide error', { message: error.message });
          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Failed to load guide: ' + error.message
            }
          });
        }
      }

      else if (name === 'combine_guides') {
        const input: CombineGuidesInput = {
          ids: args.ids,
          context: args.context
        };
        log('Combining guides', { ids: input.ids, project: input.context.project });

        try {
          const result = await combineGuides(input);
          log('Guides combined', { usedGuides: result.usedGuides.length });

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          });
        } catch (error: any) {
          log('Combine guides error', { message: error.message });
          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Failed to combine guides: ' + error.message
            }
          });
        }
      }

      else if (name === 'execute_workflow') {
        const { userRequest, workspacePath, projectName, category = 'auto-scan-ai' } = args;
        log('Executing workflow', { userRequest: userRequest.substring(0, 50), workspacePath });

        try {
          // BestCase 로드
          const bestCaseCode = `await bestcase.loadBestCase({ projectName: '${projectName || workspacePath.split('/').slice(-2).join('/')}', category: '${category}' })`;
          const bestCaseResult = await runAgentScript({ code: bestCaseCode, timeoutMs: 10000 });

          if (bestCaseResult.error) {
            throw new Error('Failed to load BestCase: ' + bestCaseResult.error);
          }

          const bestCase = bestCaseResult.output?.bestCases?.[0];

          const input: ExecuteWorkflowInput = {
            userRequest,
            workspacePath,
            bestCase,
            workflowGuide: {} as any // Not used in current implementation
          };

          const result = await executeWorkflow(input);
          log('Workflow executed', { success: result.success, risk: result.preflight?.risk });

          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          });
        } catch (error: any) {
          log('Execute workflow error', { message: error.message });
          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Failed to execute workflow: ' + error.message
            }
          });
        }
      }

      else {
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Tool not found: ' + name
          }
        });
      }
    }
    
    // execute 메서드: 코드 실행 (하위 호환성)
    else if (request.method === 'execute') {
      const result = await runAgentScript({
        code: request.params?.code,
        timeoutMs: request.params?.timeoutMs || 30000
      });
      
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: result
      });
    }
    
    // list_bestcases 메서드: BestCase 목록 (하위 호환성)
    else if (request.method === 'list_bestcases') {
      const code = 'await bestcase.listBestCases()';
      const result = await runAgentScript({ code, timeoutMs: 10000 });
      
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: result
      });
    }
    
    // load_bestcase 메서드: BestCase 로드 (하위 호환성)
    else if (request.method === 'load_bestcase') {
      const { projectName, category } = request.params || {};
      const code = `await bestcase.loadBestCase({ projectName: '${projectName}', category: '${category}' })`;
      const result = await runAgentScript({ code, timeoutMs: 10000 });
      
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: result
      });
    }
    
    // 지원하지 않는 메서드
    else {
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: 'Method not found'
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

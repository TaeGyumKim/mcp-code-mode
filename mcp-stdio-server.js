#!/usr/bin/env node
/**
 * MCP STDIO Server
 * 
 * VS Code MCP Extension과 stdio 프로토콜로 통신하는 서버
 * Docker 컨테이너 내부에서 실행됩니다.
 */

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// 요청 처리
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    // initialize 메서드: MCP 프로토콜 초기화
    if (request.method === 'initialize') {
      process.stdout.write(JSON.stringify({
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
      }) + '\n');
    }
    
    // notifications/initialized: 초기화 완료 알림
    else if (request.method === 'notifications/initialized') {
      // 알림은 응답 불필요
    }
    
    // tools/list 메서드: 사용 가능한 도구 목록
    else if (request.method === 'tools/list') {
      process.stdout.write(JSON.stringify({
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
            }
          ]
        }
      }) + '\n');
    }
    
    // tools/call 메서드: 도구 실행
    else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;
      
      if (name === 'execute') {
        const result = await runAgentScript({
          code: args.code,
          timeoutMs: args.timeoutMs || 30000
        });
        
        process.stdout.write(JSON.stringify({
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
        }) + '\n');
      }
      else if (name === 'list_bestcases') {
        const code = 'await bestcase.listBestCases()';
        const result = await runAgentScript({ code, timeoutMs: 10000 });
        
        process.stdout.write(JSON.stringify({
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
        }) + '\n');
      }
      else if (name === 'load_bestcase') {
        const { projectName, category } = args;
        const code = `await bestcase.loadBestCase({ projectName: '${projectName}', category: '${category}' })`;
        const result = await runAgentScript({ code, timeoutMs: 10000 });
        
        process.stdout.write(JSON.stringify({
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
        }) + '\n');
      }
      else {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Tool not found: ' + name
          }
        }) + '\n');
      }
    }
    
    // execute 메서드: 코드 실행 (하위 호환성)
    else if (request.method === 'execute') {
      const result = await runAgentScript({
        code: request.params.code,
        timeoutMs: request.params.timeoutMs || 30000
      });
      
      // 결과 반환 (JSON-RPC 2.0 형식)
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: result
      }) + '\n');
    }
    
    // list_bestcases 메서드: BestCase 목록 (하위 호환성)
    else if (request.method === 'list_bestcases') {
      const code = 'await bestcase.listBestCases()';
      const result = await runAgentScript({ code, timeoutMs: 10000 });
      
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: result
      }) + '\n');
    }
    
    // load_bestcase 메서드: BestCase 로드 (하위 호환성)
    else if (request.method === 'load_bestcase') {
      const { projectName, category } = request.params;
      const code = `await bestcase.loadBestCase({ projectName: '${projectName}', category: '${category}' })`;
      const result = await runAgentScript({ code, timeoutMs: 10000 });
      
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: result
      }) + '\n');
    }
    
    // 지원하지 않는 메서드
    else {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      }) + '\n');
    }
    
  } catch (error) {
    // 에러 응답
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: request?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    }) + '\n');
  }
});

// 시작 메시지
process.stderr.write('MCP STDIO Server started\n');

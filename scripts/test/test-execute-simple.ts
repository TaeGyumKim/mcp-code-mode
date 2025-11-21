/**
 * Simple Execute Test - Local
 *
 * 로컬에서 빌드된 mcp-stdio-server.js를 직접 실행해서 테스트
 */

import { spawn } from 'child_process';

interface TestCase {
  name: string;
  request: any;
}

const testCases: TestCase[] = [
  {
    name: "Execute without filePath (should not crash)",
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "execute",
        arguments: {
          code: "export default 1 + 1;",
          timeoutMs: 5000
        }
      }
    }
  },
  {
    name: "Execute with AutoRecommend but no filePath",
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "execute",
        arguments: {
          code: "export default 'hello';",
          timeoutMs: 5000,
          autoRecommend: {
            enabled: true,
            description: "simple string test",
            keywords: ["string", "basic"]
          }
        }
      }
    }
  },
  {
    name: "Execute with AutoRecommend and filePath",
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "execute",
        arguments: {
          code: "export default { test: true };",
          timeoutMs: 5000,
          autoRecommend: {
            enabled: true,
            filePath: "/projects/test/pages/index.vue",
            description: "test page with search",
            keywords: ["search", "list", "pagination"]
          }
        }
      }
    }
  }
];

async function runTest(testCase: TestCase, proc: any): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${testCase.name}`);
  console.log('='.repeat(60));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout after 15s`));
    }, 15000);

    let responseReceived = false;

    const dataHandler = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);
          if (response.id === testCase.request.id) {
            clearTimeout(timeout);
            responseReceived = true;

            if (response.error) {
              console.error(`❌ Error:`, response.error.message);
              console.error(`   Data:`, response.error.data);
              reject(new Error(response.error.message));
            } else {
              console.log(`✅ Success`);
              console.log(`   Result length: ${JSON.stringify(response.result).length} chars`);
              resolve();
            }
            return;
          }
        } catch (e) {
          // Ignore non-JSON lines (logs)
        }
      }
    };

    proc.stdout.on('data', dataHandler);

    // Send request
    console.log(`📤 Sending request...`);
    proc.stdin.write(JSON.stringify(testCase.request) + '\n');
  });
}

async function main() {
  console.log('🚀 Simple Execute Test (Local)\n');

  // Start local MCP server
  const serverProc = spawn('node', ['dist/mcp-stdio-server.js'], {
    env: {
      ...process.env,
      PROJECTS_PATH: 'D:/01.Work/01.Projects',
      BESTCASE_STORAGE_PATH: 'D:/01.Work/01.Projects/.bestcases',
      AUTO_SCAN_ON_STARTUP: 'false',
      SKIP_VALIDATION: 'true'
    }
  });

  serverProc.stderr.on('data', (data: Buffer) => {
    const msg = data.toString();
    // Only show actual errors
    if (msg.includes('Error:') || msg.includes('ERROR')) {
      console.error('🔴', msg.trim());
    }
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      await runTest(testCase, serverProc);
      passed++;
    } catch (error: any) {
      console.error(`❌ Test failed:`, error.message);
      failed++;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  serverProc.kill();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

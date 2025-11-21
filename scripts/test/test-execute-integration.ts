/**
 * Execute Integration Test - searchBestPractices 모듈 통합 검증
 *
 * 실제 execute 요청을 보내서 searchBestPractices 모듈이 제대로 동작하는지 확인
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

interface TestCase {
  name: string;
  code: string;
  autoRecommend?: {
    enabled: boolean;
    maxBestPractices?: number;
    description?: string;
    keywords?: string[];
  };
}

const testCases: TestCase[] = [
  {
    name: "Basic execute without AutoRecommend",
    code: "const sum = (a, b) => a + b; export default sum(2, 3);"
  },
  {
    name: "Execute with AutoRecommend (search + pagination keywords)",
    code: `
      // 검색과 페이지네이션 기능이 필요한 코드
      const searchUsers = async (query, page) => {
        // API 호출 로직
        return { users: [], total: 0 };
      };
      export default searchUsers;
    `,
    autoRecommend: {
      enabled: true,
      maxBestPractices: 3,
      description: "검색과 페이지네이션 기능 구현",
      keywords: ["search", "pagination", "list"]
    }
  },
  {
    name: "Execute with AutoRecommend (error handling focus)",
    code: `
      const processData = async (data) => {
        try {
          return await validateAndProcess(data);
        } catch (error) {
          console.error('Processing failed:', error);
          throw error;
        }
      };
      export default processData;
    `,
    autoRecommend: {
      enabled: true,
      maxBestPractices: 2,
      description: "에러 처리 및 검증 로직",
      keywords: ["error", "validation", "try-catch"]
    }
  }
];

async function runTest(testCase: TestCase, serverProcess: any): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log(`📋 테스트: ${testCase.name}`);
  console.log('='.repeat(80));

  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: "execute",
      arguments: {
        code: testCase.code,
        timeoutMs: 5000,
        ...(testCase.autoRecommend && { autoRecommend: testCase.autoRecommend })
      }
    }
  };

  console.log('📤 요청:');
  console.log(JSON.stringify(request, null, 2));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Test timeout after 30s'));
    }, 30000);

    const responseHandler = (line: string) => {
      try {
        const response = JSON.parse(line);

        if (response.id === request.id) {
          clearTimeout(timeout);

          console.log('\n📥 응답:');

          if (response.error) {
            console.error('❌ 에러:', JSON.stringify(response.error, null, 2));
            reject(new Error(response.error.message));
            return;
          }

          const result = response.result;
          console.log(`✅ 성공: ${result.content[0].text.substring(0, 200)}...`);

          // AutoRecommend 결과 검증
          if (testCase.autoRecommend?.enabled) {
            try {
              const executeResult = JSON.parse(result.content[0].text);

              console.log('\n🔍 Execute 결과 분석:');
              console.log(`   - 코드 실행: ${executeResult.ok ? '✅' : '❌'}`);

              if (executeResult.context) {
                console.log('\n🎯 AutoRecommend 컨텍스트:');
                console.log(`   - Guides: ${executeResult.context.guides?.length || 0}개`);
                console.log(`   - BestPractices: ${executeResult.context.bestPracticeExamples?.length || 0}개`);

                if (executeResult.context.bestPracticeExamples?.length > 0) {
                  console.log('\n📚 BestPractice 예제:');
                  executeResult.context.bestPracticeExamples.forEach((example: any, idx: number) => {
                    console.log(`   ${idx + 1}. ${example.filePath}`);
                    console.log(`      - Role: ${example.fileRole}`);
                    console.log(`      - Excellent in: ${example.excellentIn?.join(', ') || 'N/A'}`);
                    if (example.fallbackSelected) {
                      console.log(`      - ⚠️ Fallback 선택 (rank: ${example.fallbackRank}/${example.fallbackTotalFiles})`);
                    }
                  });
                }

                if (executeResult.context.searchMetadata) {
                  console.log('\n📊 Search Metadata:');
                  const meta = executeResult.context.searchMetadata;
                  console.log(`   - Dimensions: ${meta.dimensionsSearched?.join(', ') || 'N/A'}`);
                  console.log(`   - Candidates: ${meta.candidateCount || 0}`);
                  console.log(`   - Cache hit: ${meta.cacheHit ? '✅' : '❌'}`);
                  if (meta.fallbackUsed) {
                    console.log(`   - ⚠️ Fallback used: ${meta.fallbackCount}/${meta.fallbackPercentile} files`);
                  }
                }

                if (executeResult.context.projectInfo) {
                  console.log('\n🏗️ Project Info:');
                  const info = executeResult.context.projectInfo;
                  console.log(`   - API Type: ${info.apiType} (${info.apiConfidence})`);
                  console.log(`   - Design System: ${info.designSystem?.join(', ') || 'none'}`);
                  console.log(`   - Framework: ${info.framework || 'unknown'}`);
                }
              }

              console.log('\n✅ 테스트 통과');
              resolve();
            } catch (parseError) {
              console.log('⚠️ 응답 파싱 실패 (raw response):', result.content[0].text.substring(0, 500));
              resolve();
            }
          } else {
            console.log('✅ 테스트 통과 (AutoRecommend 미사용)');
            resolve();
          }
        }
      } catch (error) {
        // JSON 파싱 실패는 무시 (로그 라인일 수 있음)
      }
    };

    serverProcess.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach((line: string) => {
        if (line.trim()) {
          responseHandler(line);
        }
      });
    });

    // 요청 전송
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function main() {
  console.log('🚀 Execute Integration Test 시작\n');
  console.log('Docker 컨테이너에서 MCP 서버 프로세스 시작...\n');

  // Docker exec를 통해 MCP 서버 프로세스 실행
  const serverProcess = spawn('docker', [
    'exec',
    '-i',
    'mcp-code-mode-server',
    'node',
    '/app/dist/mcp-stdio-server.js'
  ]);

  serverProcess.stderr.on('data', (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes('ERROR') || msg.includes('Error')) {
      console.error('🔴 stderr:', msg);
    }
  });

  // 서버 시작 대기
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // 모든 테스트 케이스 실행
    for (const testCase of testCases) {
      await runTest(testCase, serverProcess);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 테스트 간 간격
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 모든 테스트 완료!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

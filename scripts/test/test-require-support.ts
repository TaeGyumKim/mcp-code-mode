/**
 * ✅ require 문 자동 제거 테스트
 */

import { runAgentScript } from '../../packages/ai-runner/dist/agentRunner.js';

async function testRequireRemoval() {
  console.log('📊 require 문 자동 제거 테스트 시작\n');

  // 테스트 1: require 사용 (자동 제거되어야 함)
  const testCode = `
    const fs = require('fs').promises;

    // fs는 자동으로 주입되어 있으므로 사용 가능
    const content = await fs.readFile('/home/user/mcp-code-mode/package.json', 'utf8');
    const pkg = JSON.parse(content);

    return {
      success: true,
      packageName: pkg.name,
      message: 'require 문이 자동으로 제거되었습니다!'
    };
  `;

  try {
    const result = await runAgentScript({
      code: testCode,
      timeoutMs: 10000
    });

    if (result.ok) {
      console.log('✅ 테스트 성공!');
      console.log('\n결과:', JSON.stringify(result.output, null, 2));

      if (result.logs && result.logs.length > 0) {
        console.log('\n로그:');
        result.logs.forEach(log => console.log('  ', log));
      }
    } else {
      console.error('❌ 테스트 실패!');
      console.error('에러:', result.error);
    }

    return result;

  } catch (err) {
    console.error('❌ 테스트 실행 중 에러:', err);
    throw err;
  }
}

// 실행
testRequireRemoval()
  .then((result) => {
    if (result.ok) {
      console.log('\n🎉 require 문 자동 제거가 정상적으로 동작합니다!');
      process.exit(0);
    } else {
      console.error('\n❌ require 문 처리에 문제가 있습니다.');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\n💥 테스트 실행 실패:', err);
    process.exit(1);
  });

/**
 * ✅ import 문 지원 테스트
 *
 * vm2 sandbox가 import 문을 자동으로 제거하고
 * fs, path 모듈을 주입하는지 확인합니다.
 */

import { runAgentScript } from '../../packages/ai-runner/dist/agentRunner.js';

async function testImportSupport() {
  console.log('📊 import 문 지원 테스트 시작\n');

  // 테스트 1: import 문을 사용한 코드
  const testCode = `
    import { promises as fs } from 'fs';
    import path from 'path';

    // fs와 path가 자동으로 주입되어야 함
    const testPath = path.join('/home/user/mcp-code-mode', 'package.json');
    console.log('테스트 경로:', testPath);

    try {
      const content = await fs.readFile(testPath, 'utf8');
      const pkg = JSON.parse(content);

      return {
        success: true,
        packageName: pkg.name,
        version: pkg.version,
        message: 'import 문이 성공적으로 처리되었습니다!'
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
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
testImportSupport()
  .then((result) => {
    if (result.ok) {
      console.log('\n🎉 import 문 지원이 정상적으로 동작합니다!');
      process.exit(0);
    } else {
      console.error('\n❌ import 문 지원에 문제가 있습니다.');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\n💥 테스트 실행 실패:', err);
    process.exit(1);
  });

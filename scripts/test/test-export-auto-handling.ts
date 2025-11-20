/**
 * Export Default 자동 처리 테스트
 *
 * MCP 서버가 export default를 자동으로 처리하는지 테스트합니다
 */

import { runInSandbox } from '../../packages/ai-runner/dist/sandbox.js';

console.log('🧪 Export Default 자동 처리 테스트\n');

// 테스트 케이스
const testCases = [
  {
    name: 'export default async function',
    code: `export default async function run(context) {
  return { ok: true, message: 'async function works' };
}`,
    shouldSucceed: true
  },
  {
    name: 'export default function',
    code: `export default function calculate() {
  return 42;
}`,
    shouldSucceed: true
  },
  {
    name: 'export default 표현식',
    code: `export default { ok: true, value: 123 };`,
    shouldSucceed: true
  },
  {
    name: 'export default class',
    code: `export default class MyClass {
  constructor() {
    this.value = 'test';
  }
}`,
    shouldSucceed: true
  },
  {
    name: 'import 문 자동 제거',
    code: `import { something } from 'module';
const result = { ok: true };
result;`,
    shouldSucceed: true
  },
  {
    name: 'export const 자동 제거',
    code: `export const myFunction = () => {
  return { ok: true };
};
myFunction();`,
    shouldSucceed: true
  },
  {
    name: '실제 사용자 케이스 - autoRecommend',
    code: `export default async function run(context) {
  // autoRecommend를 통해 처리됨
  return { ok: true, note: 'MCP run requested via autoRecommend' };
}`,
    shouldSucceed: true
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    try {
      const result = await runInSandbox(test.code, 5000);

      if (test.shouldSucceed) {
        if (result.ok) {
          console.log(`✅ ${test.name}`);
          console.log(`   결과: ${JSON.stringify(result.output)}`);
          passed++;
        } else {
          console.log(`❌ ${test.name}`);
          console.log(`   예상: 성공`);
          console.log(`   실제: 실패 - ${result.error}`);
          failed++;
        }
      } else {
        if (!result.ok) {
          console.log(`✅ ${test.name} (예상된 실패)`);
          passed++;
        } else {
          console.log(`❌ ${test.name}`);
          console.log(`   예상: 실패`);
          console.log(`   실제: 성공`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   에러: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
    console.log('');
  }

  console.log('========================================');
  console.log(`전체 결과: ${passed}/${testCases.length} 통과`);
  console.log('========================================\n');

  if (failed === 0) {
    console.log('🎉 모든 테스트 통과!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed}개 테스트 실패`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('테스트 실행 중 에러:', error);
  process.exit(1);
});

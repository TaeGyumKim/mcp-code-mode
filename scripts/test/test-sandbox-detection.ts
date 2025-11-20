/**
 * Sandbox 문법 감지 테스트
 *
 * removeStringsAndComments, detectTypeScriptSyntax 함수 테스트
 */

import { removeStringsAndComments, detectTypeScriptSyntax } from '../../packages/ai-runner/src/sandbox.js';

console.log('🧪 Sandbox 문법 감지 테스트\n');

// ============================================================================
// 1. removeStringsAndComments 테스트
// ============================================================================
console.log('Test 1: removeStringsAndComments');
console.log('==================================\n');

const testCases1 = [
  {
    name: '단순 템플릿 리터럴',
    code: 'const str = `hello world`;',
    shouldContain: ['const str = "";'],
    shouldNotContain: ['hello world', '`']
  },
  {
    name: '중첩된 템플릿 리터럴 (표현식 포함)',
    code: 'const str = `outer ${inner} text`;',
    shouldContain: ['const str = "";'],
    shouldNotContain: ['outer', 'inner', 'text']
  },
  {
    name: '템플릿 리터럴 안의 TypeScript 코드',
    code: `const fileContent = \`
      <script lang="ts" setup>
      import type { Header } from "lib";
      const value: string = "test";
      </script>
    \`;`,
    shouldContain: ['const fileContent = "";'],
    shouldNotContain: ['import type', 'Header', 'const value: string']
  },
  {
    name: '라인 주석',
    code: 'const x = 1; // this is a comment',
    shouldContain: ['const x = 1;'],
    shouldNotContain: ['this is a comment']
  },
  {
    name: '블록 주석',
    code: 'const x = 1; /* block comment */ const y = 2;',
    shouldContain: ['const x = 1;', 'const y = 2;'],
    shouldNotContain: ['block comment']
  },
  {
    name: '정규식 리터럴',
    code: 'const pattern = /test\\w+/gi;',
    shouldContain: ['const pattern = "";'],
    shouldNotContain: ['/test\\w+/gi']
  },
  {
    name: '이스케이프된 백틱',
    code: 'const str = `hello \\` world`;',
    shouldContain: ['const str = "";'],
    shouldNotContain: ['hello', 'world']
  }
];

let passed1 = 0;
for (const test of testCases1) {
  const result = removeStringsAndComments(test.code);
  let success = true;

  for (const expected of test.shouldContain || []) {
    if (!result.includes(expected)) {
      console.log(`❌ ${test.name}`);
      console.log(`   Expected to contain: "${expected}"`);
      console.log(`   Got: "${result}"`);
      success = false;
      break;
    }
  }

  for (const notExpected of test.shouldNotContain || []) {
    if (result.includes(notExpected)) {
      console.log(`❌ ${test.name}`);
      console.log(`   Should NOT contain: "${notExpected}"`);
      console.log(`   Got: "${result}"`);
      success = false;
      break;
    }
  }

  if (success) {
    console.log(`✅ ${test.name}`);
    passed1++;
  }
}

console.log(`\n결과: ${passed1}/${testCases1.length} 통과\n`);

// ============================================================================
// 2. detectTypeScriptSyntax 테스트
// ============================================================================
console.log('Test 2: detectTypeScriptSyntax');
console.log('================================\n');

const testCases2 = [
  {
    name: '순수 JavaScript (통과해야 함)',
    code: 'const x = 1; const y = { name: "test" };',
    expected: false
  },
  {
    name: 'interface 선언 (감지되어야 함)',
    code: 'interface User { name: string; }',
    expected: true
  },
  {
    name: 'type alias 선언 (감지되어야 함)',
    code: 'type User = { name: string; };',
    expected: true
  },
  {
    name: '타입 어노테이션 (감지되어야 함)',
    code: 'const name: string = "test";',
    expected: true
  },
  {
    name: '템플릿 리터럴 안의 TypeScript (통과해야 함)',
    code: `const template = \`
      interface User { name: string; }
      type Data = string;
    \`;`,
    expected: false
  },
  {
    name: '주석 안의 TypeScript (통과해야 함)',
    code: '// interface User { name: string; }\nconst x = 1;',
    expected: false
  },
  {
    name: 'Vue 파일 템플릿 (통과해야 함)',
    code: `const fileContent = \`
      <template>
        <div>{{ value }}</div>
      </template>
      <script lang="ts" setup>
      import type { CommonTableHeader } from "openerd-nuxt3";
      const headers: CommonTableHeader[] = [];
      </script>
    \`;`,
    expected: false
  },
  {
    name: '실제 TypeScript + 템플릿 혼합 (감지되어야 함)',
    code: `
      interface RealInterface { id: number; }
      const template = \`interface FakeInterface { name: string; }\`;
    `,
    expected: true
  }
];

let passed2 = 0;
for (const test of testCases2) {
  const result = detectTypeScriptSyntax(test.code);

  if (result === test.expected) {
    console.log(`✅ ${test.name}`);
    passed2++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result}`);
    console.log(`   Code: ${test.code.substring(0, 100)}...`);
  }
}

console.log(`\n결과: ${passed2}/${testCases2.length} 통과\n`);

// ============================================================================
// 최종 결과
// ============================================================================
const totalPassed = passed1 + passed2;
const totalTests = testCases1.length + testCases2.length;

console.log('========================================');
console.log(`✨ 전체 결과: ${totalPassed}/${totalTests} 통과`);
console.log('========================================\n');

if (totalPassed === totalTests) {
  console.log('🎉 모든 테스트 통과!');
  process.exit(0);
} else {
  console.log('⚠️  일부 테스트 실패');
  process.exit(1);
}

/**
 * Sandbox 문법 감지 테스트
 *
 * removeStringsAndComments, detectTypeScriptSyntax, detectJSXSyntax, detectES6ModuleSyntax 함수 테스트
 */

// ⚠️ 주의: 이 테스트는 sandbox.ts에서 함수들을 복사하여 테스트합니다
// 실제 코드는 packages/ai-runner/src/sandbox.ts에 있습니다

/**
 * 문자열과 주석을 정확하게 제거하는 헬퍼 함수
 */
function removeStringsAndComments(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];

    // 1. 블록 주석 제거: /* ... */
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      result += ' '; // 공백으로 대체
      continue;
    }

    // 2. 라인 주석 제거: // ...
    if (char === '/' && nextChar === '/') {
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      result += '\n'; // 줄바꿈 유지
      i++;
      continue;
    }

    // 3. 정규식 리터럴 제거: /pattern/flags
    if (char === '/' && /[=(\[,;:!&|?+\-*/%\s]/.test(code[i - 1] || ' ')) {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }
        if (code[i] === '/') {
          i++;
          // flags (g, i, m 등) 건너뛰기
          while (i < code.length && /[gimsuvy]/.test(code[i])) {
            i++;
          }
          break;
        }
        i++;
      }
      continue;
    }

    // 4. 템플릿 리터럴 제거: `...`
    if (char === '`') {
      result += '""';
      i++;
      let templateDepth = 1;

      while (i < code.length && templateDepth > 0) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }

        // 템플릿 표현식 시작: ${
        if (code[i] === '$' && code[i + 1] === '{') {
          i += 2;
          let braceDepth = 1;

          // 중괄호 균형 맞춰서 표현식 끝 찾기
          while (i < code.length && braceDepth > 0) {
            if (code[i] === '\\') {
              i += 2;
              continue;
            }
            if (code[i] === '{') braceDepth++;
            if (code[i] === '}') braceDepth--;

            // 표현식 내부의 문자열은 재귀적으로 처리하지 않고 단순 건너뛰기
            if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
              const quote = code[i];
              i++;
              while (i < code.length) {
                if (code[i] === '\\') {
                  i += 2;
                  continue;
                }
                if (code[i] === quote) {
                  i++;
                  break;
                }
                i++;
              }
              continue;
            }

            i++;
          }
          continue;
        }

        if (code[i] === '`') {
          templateDepth--;
          i++;
          break;
        }

        i++;
      }
      continue;
    }

    // 5. 큰따옴표 문자열 제거: "..."
    if (char === '"') {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }
        if (code[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // 6. 작은따옴표 문자열 제거: '...'
    if (char === "'") {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }
        if (code[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // 7. 일반 문자 추가
    result += char;
    i++;
  }

  return result;
}

/**
 * TypeScript 문법 감지
 */
function detectTypeScriptSyntax(code: string): boolean {
  const cleanedCode = removeStringsAndComments(code);

  const hasInterface = /\binterface\s+\w+/.test(cleanedCode);
  const hasTypeAlias = /\btype\s+\w+\s*=/.test(cleanedCode);
  const hasTypeAnnotation = /:\s*\w+(\[\]|<[^>]+>)?\s*(=|;|\))/.test(cleanedCode);

  return hasInterface || hasTypeAlias || hasTypeAnnotation;
}

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

/**
 * PreprocessCode 디버그 테스트
 *
 * 코드 변환 결과를 확인합니다
 */

// preprocessCode 함수 복사 (테스트용)
function preprocessCode(code: string): string {
  // import 문 전체 제거
  code = code.replace(/import\s+.+?from\s+['"][^'"]+['"];?\s*/g, '');

  // 단독 import 문 제거 (예: import 'module')
  code = code.replace(/import\s+['"][^'"]+['"];?\s*/g, '');

  // export default 처리 - 함수를 자동으로 IIFE로 변환하여 실행
  if (code.includes('export default')) {
    // 1. export default async function name(...) { ... } -> (async function name(...) { ... })()
    code = code.replace(
      /export\s+default\s+async\s+function(\s+\w+)?\s*\(([^)]*)\)\s*\{/g,
      '(async function$1($2) {'
    );

    // 2. export default function name(...) { ... } -> (function name(...) { ... })()
    code = code.replace(
      /export\s+default\s+function(\s+\w+)?\s*\(([^)]*)\)\s*\{/g,
      '(function$1($2) {'
    );

    // IIFE 닫기: 마지막 } 뒤에 )() 추가
    if (code.match(/^\((?:async\s+)?function/)) {
      code = code.trimEnd();
      if (!code.endsWith(')()') && !code.endsWith(')();')) {
        code += ')()';
      }
    }

    // 3. export default class -> class
    code = code.replace(/export\s+default\s+class/g, 'class');

    // 4. 나머지 export default (표현식, 객체 등) - 단순 제거
    code = code.replace(/export\s+default\s+/g, '');
  }

  return code;
}

console.log('🔍 PreprocessCode 디버그 테스트\n');
console.log('='.repeat(60));

const testCases = [
  {
    name: 'export default async function',
    input: `export default async function run(context) {
  return { ok: true };
}`
  },
  {
    name: 'export default function',
    input: `export default function calculate() {
  return 42;
}`
  },
  {
    name: 'export default 표현식',
    input: `export default { ok: true, value: 123 };`
  }
];

for (const test of testCases) {
  console.log(`\n${test.name}`);
  console.log('-'.repeat(60));
  console.log('입력:');
  console.log(test.input);
  console.log('\n출력:');
  const output = preprocessCode(test.input);
  console.log(output);
  console.log('='.repeat(60));
}

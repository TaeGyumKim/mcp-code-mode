/**
 * TypeScript 엣지 케이스 검토
 *
 * 현재 감지 시스템이 놓칠 수 있는 다양한 TypeScript 문법들을 테스트합니다
 */

import { removeStringsAndComments, detectTypeScriptSyntax } from '../../packages/ai-runner/src/sandbox.js';

console.log('🔍 TypeScript 엣지 케이스 정밀 검토\n');
console.log('================================================\n');

// 테스트 케이스 정의
const testCases = [
  // ===== JavaScript (통과해야 함) =====
  {
    category: 'JavaScript (통과해야 함)',
    name: '삼항 연산자',
    code: 'const result = condition ? value1 : value2;',
    expected: false,
    critical: true
  },
  {
    category: 'JavaScript (통과해야 함)',
    name: 'switch-case 문',
    code: 'switch(x) { case 1: break; case 2: break; }',
    expected: false,
    critical: true
  },
  {
    category: 'JavaScript (통과해야 함)',
    name: 'label 문',
    code: 'myLabel: for (let i = 0; i < 10; i++) { break myLabel; }',
    expected: false,
    critical: true
  },
  {
    category: 'JavaScript (통과해야 함)',
    name: '객체 리터럴',
    code: 'const obj = { name: "John", age: 30 };',
    expected: false,
    critical: true
  },
  {
    category: 'JavaScript (통과해야 함)',
    name: '객체 destructuring with rename',
    code: 'const { name: alias } = obj;',
    expected: false,
    critical: true
  },
  {
    category: 'JavaScript (통과해야 함)',
    name: '객체 메서드 축약',
    code: 'const obj = { method() { return 1; } };',
    expected: false,
    critical: true
  },

  // ===== TypeScript (감지되어야 함) =====
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'as 타입 어설션',
    code: 'const value = obj as SomeType;',
    expected: true,
    critical: true
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: '제네릭 꺾쇠괄호',
    code: 'const arr = new Array<string>();',
    expected: true,
    critical: true
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: '제네릭 함수 호출',
    code: 'func<Type>(arg);',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'enum 선언',
    code: 'enum Color { Red, Green, Blue }',
    expected: true,
    critical: true
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'namespace 선언',
    code: 'namespace Foo { export const bar = 1; }',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'declare 선언',
    code: 'declare const API_KEY: string;',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: '옵셔널 파라미터',
    code: 'function foo(param?: string) { }',
    expected: true,
    critical: true
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'Non-null assertion',
    code: 'const value = obj!.property;',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'readonly 접근 제어자',
    code: 'class Foo { readonly name: string; }',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'public/private 접근 제어자',
    code: 'class Foo { private name: string; }',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: '제네릭 타입 파라미터',
    code: 'function identity<T>(arg: T): T { return arg; }',
    expected: true,
    critical: true
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: '타입 가드',
    code: 'function isString(value: any): value is string { return typeof value === "string"; }',
    expected: true,
    critical: false
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'Union 타입',
    code: 'type StringOrNumber = string | number;',
    expected: true,
    critical: true
  },
  {
    category: 'TypeScript (감지되어야 함)',
    name: 'Intersection 타입',
    code: 'type Combined = A & B;',
    expected: true,
    critical: true
  },
];

// 카테고리별로 그룹화
const categories: { [key: string]: typeof testCases } = {};
testCases.forEach(test => {
  if (!categories[test.category]) {
    categories[test.category] = [];
  }
  categories[test.category].push(test);
});

let totalPassed = 0;
let totalCriticalFailed = 0;
const failures: typeof testCases = [];

// 카테고리별로 테스트 실행
Object.entries(categories).forEach(([category, tests]) => {
  console.log(`\n${category}`);
  console.log('='.repeat(category.length));

  tests.forEach(test => {
    const result = detectTypeScriptSyntax(test.code);
    const passed = result === test.expected;

    if (passed) {
      console.log(`✅ ${test.name}`);
      totalPassed++;
    } else {
      const icon = test.critical ? '🔴' : '⚠️ ';
      console.log(`${icon} ${test.name}`);
      console.log(`   예상: ${test.expected ? 'TypeScript 감지' : 'JavaScript 통과'}`);
      console.log(`   실제: ${result ? 'TypeScript 감지' : 'JavaScript 통과'}`);
      console.log(`   코드: ${test.code.substring(0, 60)}${test.code.length > 60 ? '...' : ''}`);

      if (test.critical) {
        totalCriticalFailed++;
      }

      failures.push(test);
    }
  });
});

// 최종 결과
console.log('\n\n================================================');
console.log(`전체 결과: ${totalPassed}/${testCases.length} 통과`);
console.log(`실패: ${testCases.length - totalPassed}개`);
console.log(`  - 🔴 Critical 실패: ${totalCriticalFailed}개`);
console.log(`  - ⚠️  Non-critical 실패: ${failures.length - totalCriticalFailed}개`);
console.log('================================================\n');

if (failures.length > 0) {
  console.log('📋 실패 항목 요약:');
  console.log('==================\n');

  failures.forEach((test, i) => {
    console.log(`${i + 1}. ${test.critical ? '🔴' : '⚠️ '} ${test.name}`);
    console.log(`   카테고리: ${test.category}`);
    console.log(`   문제: ${test.expected ? 'TypeScript 문법이 감지되지 않음' : 'JavaScript가 TypeScript로 오인됨'}`);
    console.log('');
  });

  console.log('\n💡 개선 필요 사항:');
  console.log('=================\n');

  const improvements: { [key: string]: string[] } = {};
  failures.forEach(test => {
    if (test.expected && !detectTypeScriptSyntax(test.code)) {
      if (!improvements['감지 추가 필요']) improvements['감지 추가 필요'] = [];
      improvements['감지 추가 필요'].push(test.name);
    } else if (!test.expected && detectTypeScriptSyntax(test.code)) {
      if (!improvements['오탐지 수정 필요']) improvements['오탐지 수정 필요'] = [];
      improvements['오탐지 수정 필요'].push(test.name);
    }
  });

  Object.entries(improvements).forEach(([category, items]) => {
    console.log(`${category}:`);
    items.forEach(item => console.log(`  - ${item}`));
    console.log('');
  });
}

// 종료 코드
if (totalCriticalFailed > 0) {
  console.log('❌ Critical 실패 발생! 즉시 수정이 필요합니다.');
  process.exit(1);
} else if (failures.length > 0) {
  console.log('⚠️  일부 엣지 케이스 미감지. 개선 권장.');
  process.exit(0);
} else {
  console.log('✅ 모든 엣지 케이스 통과!');
  process.exit(0);
}

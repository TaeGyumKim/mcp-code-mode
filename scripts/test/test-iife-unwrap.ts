/**
 * ✅ IIFE unwrap 및 TypeScript 타입 제거 테스트
 */

import { runAgentScript } from '../../packages/ai-runner/dist/agentRunner.js';

async function testIifeUnwrap() {
  console.log('📊 IIFE unwrap 테스트 시작\n');

  // 테스트 1: IIFE로 감싼 코드 (중복 wrap 방지)
  const testCode1 = `
    (async () => {
      const result = {
        success: true,
        message: 'IIFE unwrap 성공!',
        timestamp: Date.now()
      };
      return result;
    })();
  `;

  console.log('테스트 1: IIFE 코드 실행');
  try {
    const result = await runAgentScript({
      code: testCode1,
      timeoutMs: 10000
    });

    if (result.ok && result.output) {
      console.log('✅ 테스트 1 성공!');
      console.log('결과:', JSON.stringify(result.output, null, 2));
    } else {
      console.error('❌ 테스트 1 실패!');
      console.error('결과:', result);
    }
  } catch (err) {
    console.error('❌ 테스트 1 실행 중 에러:', err);
  }

  console.log('\n---\n');

  // 테스트 2: TypeScript 타입 annotation (자동 제거)
  const testCode2 = `
    const name: string = 'test';
    const age: number = 25;
    const data: any = { foo: 'bar' };

    return {
      success: true,
      name,
      age,
      data,
      message: 'TypeScript 타입 annotation 제거 성공!'
    };
  `;

  console.log('테스트 2: TypeScript 타입 annotation');
  try {
    const result = await runAgentScript({
      code: testCode2,
      timeoutMs: 10000
    });

    if (result.ok && result.output) {
      console.log('✅ 테스트 2 성공!');
      console.log('결과:', JSON.stringify(result.output, null, 2));
    } else {
      console.error('❌ 테스트 2 실패!');
      console.error('에러:', result.error);
    }
  } catch (err) {
    console.error('❌ 테스트 2 실행 중 에러:', err);
  }

  console.log('\n---\n');

  // 테스트 3: 사용자의 실제 코드 (IIFE + filesystem API)
  const testCode3 = `
    (async () => {
      const p = "d:\\\\01.Work\\\\01.Projects\\\\49.airian\\\\frontend-admin\\\\pages\\\\memberManagement.vue";
      try {
        const res = await filesystem.readFile({ path: p });
        const content = res && res.content ? res.content : '';
        const summary = {
          path: p,
          hasOnSearch: /function\\s+onSearch\\s*\\(/.test(content),
          hasResetFilters: /function\\s+resetFilters\\s*\\(/.test(content),
          fileLength: content.length
        };
        return { ok: true, summary };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    })();
  `;

  console.log('테스트 3: 사용자 실제 코드 (IIFE + filesystem API)');
  try {
    const result = await runAgentScript({
      code: testCode3,
      timeoutMs: 10000
    });

    if (result.ok && result.output) {
      console.log('✅ 테스트 3 성공!');
      console.log('결과:', JSON.stringify(result.output, null, 2));
    } else {
      console.error('❌ 테스트 3 실패!');
      console.error('에러:', result.error);
    }
  } catch (err) {
    console.error('❌ 테스트 3 실행 중 에러:', err);
  }
}

// 실행
testIifeUnwrap()
  .then(() => {
    console.log('\n🎉 모든 테스트 완료!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 테스트 실행 실패:', err);
    process.exit(1);
  });

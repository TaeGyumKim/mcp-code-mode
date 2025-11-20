/**
 * 실제 변환 결과 확인
 */

import { runInSandbox } from '../../packages/ai-runner/dist/sandbox.js';

// 디버깅용 - preprocessCode 함수 임포트는 불가능하므로 runInSandbox의 로그를 확인
const testCode = `export default async function run(context) {
  return { ok: true, message: 'test' };
}`;

console.log('🔍 실제 변환 결과 확인\n');
console.log('입력 코드:');
console.log(testCode);
console.log('\n실행 중...\n');

runInSandbox(testCode, 5000)
  .then(result => {
    console.log('결과:', result);
    if (result.ok) {
      console.log('✅ 성공!');
      console.log('출력:', JSON.stringify(result.output, null, 2));
    } else {
      console.log('❌ 실패');
      console.log('에러:', result.error);
    }
  })
  .catch(error => {
    console.error('예외 발생:', error);
  });

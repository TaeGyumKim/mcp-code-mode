/**
 * 원본 사용자 실패 케이스 테스트
 *
 * TypeScript 타입 어노테이션이 포함된 export default 함수
 */

import { runInSandbox } from '../../packages/ai-runner/dist/sandbox.js';

const originalUserCode = `export default async function run(context:any){
  return { ok: true, note: 'MCP run requested via autoRecommend' };
}`;

console.log('🔍 원본 사용자 실패 케이스 테스트\n');
console.log('입력 코드:');
console.log(originalUserCode);
console.log('\n실행 중...\n');

runInSandbox(originalUserCode, 5000)
  .then(result => {
    console.log('결과:', result);
    if (result.ok) {
      console.log('✅ 성공!');
      console.log('출력:', JSON.stringify(result.output, null, 2));
      process.exit(0);
    } else {
      console.log('❌ 실패');
      console.log('에러:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('예외 발생:', error);
    process.exit(1);
  });

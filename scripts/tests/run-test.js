import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFile } from 'fs/promises';

async function main() {
  console.log('🚀 BestCase 저장 스크립트 실행 중...\n');
  
  const code = await readFile('./test-script.js', 'utf-8');
  
  const result = await runAgentScript({ 
    code,
    timeoutMs: 120000 // 2분
  });
  
  if (result.ok) {
    console.log('\n✅ 성공!');
    if (result.logs && result.logs.length > 0) {
      console.log('\n📝 실행 로그:');
      result.logs.forEach(log => console.log(log));
    }
    if (result.output) {
      console.log('\n📊 출력:', result.output);
    }
  } else {
    console.log('\n❌ 실패!');
    console.log('에러:', result.error);
    if (result.logs && result.logs.length > 0) {
      console.log('\n📝 실행 로그:');
      result.logs.forEach(log => console.log(log));
    }
  }
}

main().catch(console.error);

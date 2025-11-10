import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFile } from 'fs/promises';

async function main() {
  console.log('🚀 BestCase 시스템 테스트 실행\n');
  
  const code = await readFile('./test-simple.js', 'utf-8');
  
  const result = await runAgentScript({ 
    code,
    timeoutMs: 60000
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (result.ok) {
    console.log('✅ 실행 성공!\n');
    if (result.logs && result.logs.length > 0) {
      console.log('📝 실행 로그:');
      console.log('='.repeat(60));
      result.logs.forEach(log => console.log(log));
    }
  } else {
    console.log('❌ 실행 실패!\n');
    console.log('에러:', result.error);
    if (result.logs && result.logs.length > 0) {
      console.log('\n📝 실행 로그:');
      result.logs.forEach(log => console.log(log));
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);

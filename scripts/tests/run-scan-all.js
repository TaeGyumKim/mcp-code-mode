import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFile } from 'fs/promises';

async function main() {
  console.log('🚀 00~50번 프로젝트 전체 스캔\n');
  console.log('⏱️  예상 소요 시간: 2~5분');
  console.log('');
  
  const code = await readFile('./scan-all-projects.js', 'utf-8');
  
  const startTime = Date.now();
  
  const result = await runAgentScript({ 
    code,
    timeoutMs: 300000 // 5분
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  if (result.ok) {
    if (result.logs && result.logs.length > 0) {
      result.logs.forEach(log => console.log(log));
    }
    console.log('');
    console.log(`⏱️  총 소요 시간: ${elapsed}초`);
  } else {
    console.log('❌ 실행 실패!');
    console.log('에러:', result.error);
    
    if (result.logs && result.logs.length > 0) {
      console.log('\n실행 로그:');
      result.logs.forEach(log => console.log(log));
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
}

main().catch(console.error);

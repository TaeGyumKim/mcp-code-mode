import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFile } from 'fs/promises';

async function main() {
  console.log('🎯 특정 프로젝트 BestCase 저장\n');
  console.log('='.repeat(60));
  console.log('');
  
  const code = await readFile('./scan-target-project.js', 'utf-8');
  
  const result = await runAgentScript({ 
    code,
    timeoutMs: 120000 // 2분
  });
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  if (result.ok) {
    if (result.logs && result.logs.length > 0) {
      result.logs.forEach(log => console.log(log));
    }
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

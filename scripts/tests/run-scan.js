import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFile } from 'fs/promises';

async function main() {
  console.log('🚀 D:/01.Work/01.Projects 프로젝트 스캔 시작\n');
  console.log('='.repeat(60));
  console.log('');
  
  const code = await readFile('./scan-projects.js', 'utf-8');
  
  const result = await runAgentScript({ 
    code,
    timeoutMs: 120000 // 2분
  });
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  
  if (result.ok) {
    console.log('✅ 스캔 완료!\n');
    
    if (result.logs && result.logs.length > 0) {
      result.logs.forEach(log => console.log(log));
    }
    
    if (result.output) {
      console.log('\n📊 반환값:', result.output);
    }
  } else {
    console.log('❌ 스캔 실패!\n');
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

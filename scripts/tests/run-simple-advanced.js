// 간단한 고급 스캔 실행 래퍼
import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFileSync } from 'fs';

const code = readFileSync('./scan-simple-advanced.js', 'utf-8');

console.log('🚀 간단한 고급 스캐너 테스트...\n');

const result = await runAgentScript({ code, timeoutMs: 30000 });

console.log('\n결과:', result.ok ? '성공' : '실패');
if (!result.ok) {
  console.log('에러:', result.error);
}

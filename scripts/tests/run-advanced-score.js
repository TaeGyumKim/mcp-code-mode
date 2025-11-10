/**
 * 고급 점수 기반 스캔 실행
 */
import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFileSync } from 'fs';

const code = readFileSync('./scan-advanced-score.js', 'utf-8');

console.log('🚀 Starting advanced score-based scan...\n');

await runAgentScript({ code, timeoutMs: 60000 });

console.log('\n✅ Scan completed!');

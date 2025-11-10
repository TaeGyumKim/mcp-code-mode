// 고급 스캔 실행 래퍼
import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFileSync } from 'fs';

const code = readFileSync('./scan-advanced.js', 'utf-8');

console.log('🚀 고급 프로젝트 스캐너 실행 중...\n');

await runAgentScript({ code, timeoutMs: 60000 });

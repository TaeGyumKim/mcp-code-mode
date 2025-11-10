import { runInSandbox, type SandboxResult } from './sandbox.js';

export async function runAgentScript(params: { 
  filePath?: string; 
  code?: string;
  timeoutMs?: number 
}): Promise<SandboxResult> {
  if (!params.code) {
    throw new Error('Code is required');
  }
  
  const result = await runInSandbox(params.code, params.timeoutMs);
  
  // 로그 출력
  if (result.logs && result.logs.length > 0) {
    result.logs.forEach(log => console.log(log));
  }
  
  return result;
}
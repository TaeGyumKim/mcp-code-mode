import { defineEventHandler, readBody } from 'h3'
import { runAgentScript } from 'ai-runner/agentRunner'

export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code: string }>(event)
  
  if (!code) {
    return { ok: false, error: 'Code is required' }
  }
  
  const result = await runAgentScript({ code, timeoutMs: 60000 })
  return result
})
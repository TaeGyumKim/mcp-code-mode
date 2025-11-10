// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    alias: {
      'ai-bindings': 'D:/01.Work/08.rf/mcp-code-mode-starter/packages/ai-bindings/dist/index.js',
      'ai-runner/agentRunner': 'D:/01.Work/08.rf/mcp-code-mode-starter/packages/ai-runner/dist/agentRunner.js'
    }
  }
})

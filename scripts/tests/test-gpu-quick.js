// Quick GPU Test - 3 files only
const { analyzeCodeQuality } = require('./packages/llm-analyzer/dist/index.js');

async function testGPU() {
  console.log('🧪 Quick GPU Test - 3 files');
  console.log('⚡ CONCURRENCY:', process.env.CONCURRENCY || 3);
  
  const testFiles = [
    { path: 'test1.ts', content: 'export function hello() { return "world"; }', type: 'api' },
    { path: 'test2.ts', content: 'export function add(a: number, b: number) { return a + b; }', type: 'api' },
    { path: 'test3.vue', content: '<template><div>Hello</div></template><script setup lang="ts">const msg = "hi";</script>', type: 'component' }
  ];
  
  console.log('\n🔄 Starting analysis...\n');
  const start = Date.now();
  
  const results = await analyzeCodeQuality(testFiles, Number(process.env.CONCURRENCY || 3));
  
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Completed in ${duration}s`);
  console.log('📊 Scores:', results.map(r => r.score));
}

testGPU().catch(console.error);

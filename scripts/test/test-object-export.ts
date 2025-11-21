/**
 * Debug test for export default object expression
 */

import { runInSandbox } from '../../packages/ai-runner/dist/sandbox.js';

const code = `export default { ok: true, value: 123 };`;

console.log('Testing:', code);
console.log('\n' + '='.repeat(60) + '\n');

runInSandbox(code, 5000).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
  if (!result.ok) {
    console.log('\n❌ Error:', result.error);
  }
}).catch(error => {
  console.error('Exception:', error);
});

/**
 * Test: Export default with context injection
 *
 * Verifies that export default functions work correctly even when
 * there's code injected before them (like context variables)
 */

import { runInSandbox } from '../../packages/ai-runner/dist/sandbox.js';

async function testExportWithContext() {
  console.log('Testing export default with context injection...\n');

  // Simulate the exact scenario from the bug report:
  // Context injection + export default async function
  const code = `
// Simulated context injection
const context = {
  recommendations: [],
  guides: '',
  projectContext: null
};

// User's original code
export default async function main(){
  return {
    message: 'Requesting MCP recommendations...',
    hasContext: !!context
  };
}
`;

  console.log('Input code:');
  console.log(code);
  console.log('\n' + '='.repeat(60) + '\n');

  const result = await runInSandbox(code, 5000);

  console.log('Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log('\n✅ Test PASSED: Code executed successfully');
    console.log('Output:', result.output);
  } else {
    console.log('\n❌ Test FAILED: Execution error');
    console.log('Error:', result.error);
    process.exit(1);
  }
}

testExportWithContext().catch(error => {
  console.error('Test failed with exception:', error);
  process.exit(1);
});

import { indexGuides, combineGuides } from './mcp-servers/guides/dist/index.js';

async function testGuides() {
  console.log('\n📏 Guide Content Sizes:\n');

  const allGuides = await indexGuides();

  allGuides.forEach(g => {
    const lines = g.content.split('\n').length;
    console.log(`  ${g.id.padEnd(35)} ${g.content.length.toString().padStart(6)} chars, ${lines.toString().padStart(4)} lines`);
  });

  // Test combineGuides
  console.log('\n📦 Testing combineGuides:');
  const searchResults = [
    { id: 'mandatory-api-detection', score: 1000 },
    { id: 'grpc.api.connection', score: 95 },
    { id: 'nuxt.routing.navigation', score: 80 }
  ];

  const combined = await combineGuides(searchResults);
  console.log('  Selected guides:', searchResults.map(r => r.id).join(', '));
  console.log('  Combined length:', combined.length, 'chars');
  console.log('\n  First 300 chars:');
  console.log('  ' + combined.substring(0, 300).replace(/\n/g, '\n  '));
  console.log('  ...\n');

  console.log('✅ All guides loaded successfully!');
}

testGuides().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
});

/**
 * Test API Type Detection
 *
 * Tests the new dynamic API type detection system
 */

import { detectApiType, matchesPattern } from '../../packages/llm-analyzer/src/apiTypeMapping.js';

console.log('🧪 Testing API Type Detection\n');

// Test 1: Pattern matching
console.log('Test 1: Pattern Matching');
console.log('========================');

const testPatterns = [
  { pattern: 'axios', package: 'axios', expected: true },
  { pattern: 'axios', package: 'axios-retry', expected: false },
  { pattern: '*proto*', package: 'protobuf', expected: true },
  { pattern: '*proto*', package: '@grpc/proto-loader', expected: true },
  { pattern: '@grpc/*', package: '@grpc/grpc-js', expected: true },
  { pattern: '@grpc/*', package: 'grpc', expected: false },
];

for (const test of testPatterns) {
  const result = matchesPattern(test.package, test.pattern);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} "${test.package}" matches "${test.pattern}": ${result} (expected: ${test.expected})`);
}

console.log('\n');

// Test 2: API Type Detection
console.log('Test 2: API Type Detection');
console.log('===========================');

const testCases = [
  {
    name: 'Pure gRPC',
    dependencies: {
      '@grpc/grpc-js': '^1.8.0',
      '@grpc/proto-loader': '^0.7.0'
    },
    expectedType: 'grpc'
  },
  {
    name: 'Pure OpenAPI',
    dependencies: {
      'swagger-ui-express': '^4.0.0',
      '@nestjs/swagger': '^6.0.0'
    },
    expectedType: 'openapi'
  },
  {
    name: 'Pure REST',
    dependencies: {
      'axios': '^1.0.0',
      'ky': '^0.33.0'
    },
    expectedType: 'rest'
  },
  {
    name: 'Pure GraphQL',
    dependencies: {
      'graphql': '^16.0.0',
      '@apollo/client': '^3.0.0'
    },
    expectedType: 'graphql'
  },
  {
    name: 'Mixed (gRPC + REST)',
    dependencies: {
      '@grpc/grpc-js': '^1.8.0',
      'axios': '^1.0.0'
    },
    expectedType: 'grpc'  // Higher priority
  },
  {
    name: 'Mixed (gRPC + GraphQL)',
    dependencies: {
      '@grpc/grpc-js': '^1.8.0',
      'graphql': '^16.0.0'
    },
    expectedType: 'mixed'  // Similar priority
  },
  {
    name: 'Wildcard match (*proto*)',
    dependencies: {
      'protobufjs': '^7.0.0'
    },
    expectedType: 'grpc'
  },
  {
    name: 'No API packages',
    dependencies: {
      'vue': '^3.0.0',
      'lodash': '^4.0.0'
    },
    expectedType: 'unknown'
  }
];

async function runTests() {
  for (const testCase of testCases) {
    console.log(`\n📦 ${testCase.name}`);
    console.log('   Dependencies:', Object.keys(testCase.dependencies).join(', '));

    const result = await detectApiType(testCase.dependencies);

    const status = result.type === testCase.expectedType ? '✅' : '❌';
    console.log(`   ${status} Detected: ${result.type} (expected: ${testCase.expectedType})`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Packages: ${result.packages.join(', ') || 'none'}`);
  }
}

runTests().then(() => {
  console.log('\n✨ Tests completed!\n');
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

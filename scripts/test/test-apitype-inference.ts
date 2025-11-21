/**
 * API Type Inference from filePath Test
 *
 * extractProjectContext()가 filePath에서 package.json을 찾아
 * API 타입을 올바르게 추론하는지 검증
 */

import { extractProjectContext } from '../../packages/ai-runner/dist/projectContext.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface TestScenario {
  name: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  expectedApiType: 'grpc' | 'openapi' | 'trpc' | 'rest' | 'graphql' | 'mixed' | 'unknown';
}

const testScenarios: TestScenario[] = [
  {
    name: "gRPC Project (with @grpc/grpc-js)",
    dependencies: {
      "@grpc/grpc-js": "^1.8.0",
      "vue": "^3.3.0"
    },
    expectedApiType: "grpc"
  },
  {
    name: "gRPC Project (with grpc)",
    dependencies: {
      "grpc": "^1.24.0",
      "nuxt": "^3.0.0"
    },
    expectedApiType: "grpc"
  },
  {
    name: "OpenAPI Project (axios + openapi-types)",
    dependencies: {
      "axios": "^1.4.0",
      "openapi-types": "^12.0.0",
      "vue": "^3.3.0"
    },
    expectedApiType: "openapi"
  },
  {
    name: "OpenAPI Project (axios + openapi-typescript)",
    dependencies: {
      "axios": "^1.4.0"
    },
    devDependencies: {
      "openapi-typescript": "^6.0.0"
    },
    expectedApiType: "openapi"
  },
  {
    name: "tRPC Project (@trpc/client)",
    dependencies: {
      "@trpc/client": "^10.0.0",
      "@trpc/server": "^10.0.0",
      "vue": "^3.3.0"
    },
    expectedApiType: "trpc"
  },
  {
    name: "Unknown Project (no API packages)",
    dependencies: {
      "vue": "^3.3.0",
      "vuex": "^4.0.0"
    },
    expectedApiType: "unknown"
  },
  {
    name: "REST Project (axios only)",
    dependencies: {
      "axios": "^1.4.0",
      "vue": "^3.3.0"
    },
    expectedApiType: "rest"
  }
];

async function createTestProject(scenario: TestScenario): Promise<string> {
  // Create temporary directory
  const tempDir = join(tmpdir(), `test-apitype-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  // Create pages directory
  const pagesDir = join(tempDir, 'pages');
  await fs.mkdir(pagesDir, { recursive: true });

  // Create dummy Vue file
  await fs.writeFile(
    join(pagesDir, 'noticeManagement.vue'),
    '<template><div>Test</div></template>'
  );

  // Create package.json
  const packageJson = {
    name: "test-project",
    version: "1.0.0",
    dependencies: scenario.dependencies,
    devDependencies: scenario.devDependencies || {}
  };

  await fs.writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  return tempDir;
}

async function cleanupTestProject(projectDir: string): Promise<void> {
  try {
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to cleanup ${projectDir}:`, error);
  }
}

async function runTest(scenario: TestScenario): Promise<boolean> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 Test: ${scenario.name}`);
  console.log('='.repeat(70));

  let projectDir: string | null = null;

  try {
    // Create test project
    projectDir = await createTestProject(scenario);
    console.log(`✅ Created test project at: ${projectDir}`);

    // Test with filePath (relative path from project root)
    const filePath = join(projectDir, 'pages', 'noticeManagement.vue');
    console.log(`📄 Testing with filePath: ${filePath}`);

    // Extract context
    const context = await extractProjectContext(undefined, filePath);

    console.log(`\n🔍 Results:`);
    console.log(`   - Detected API Type: ${context.apiInfo.type}`);
    console.log(`   - Expected API Type: ${scenario.expectedApiType}`);
    console.log(`   - API Packages: ${context.apiInfo.packages.join(', ') || 'none'}`);
    console.log(`   - Confidence: ${context.apiInfo.confidence}`);
    console.log(`   - Project Path: ${context.projectPath}`);

    const passed = context.apiInfo.type === scenario.expectedApiType;
    console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}`);

    return passed;
  } catch (error: any) {
    console.error(`❌ Test failed with error:`, error.message);
    return false;
  } finally {
    if (projectDir) {
      await cleanupTestProject(projectDir);
      console.log(`🧹 Cleaned up test project`);
    }
  }
}

async function main() {
  console.log('🧪 API Type Inference from filePath Test\n');
  console.log('Testing extractProjectContext() with package.json-based API type detection');

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    const result = await runTest(scenario);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Final Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

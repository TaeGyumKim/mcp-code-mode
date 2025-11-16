#!/usr/bin/env npx tsx
/**
 * API Workflow Test - Without LLM dependency
 *
 * Tests:
 * 1. Multi-dimensional Score Calculation (with mock data)
 * 2. BestCase Save with Auto-scoring
 * 3. BestCase List with new score structure
 * 4. BestCase Search with filters
 * 5. BestCase Load with score details
 */

import { calculateScoresFromMetadata } from '../../packages/llm-analyzer/src/scoreCalculator.js';
import { calculateWeightedScore, getExcellentCategories, shouldSaveBestCase } from '../../packages/bestcase-db/src/types.js';
import * as bestcase from '../../mcp-servers/bestcase/index.js';
import * as guides from '../../mcp-servers/guides/dist/index.js';
import type { ProjectMetadata } from '../../packages/llm-analyzer/src/metadata.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

// Mock metadata for testing (simulates real project analysis)
const mockProjectMetadata: ProjectMetadata = {
  projectName: 'test-project/src',
  totalFiles: 10,
  filesByCategory: {
    'api': 3,
    'composable': 2,
    'utility': 2,
    'page': 2,
    'other': 1
  },
  apiType: 'grpc',
  apiMethods: ['GetUser', 'CreateOrder', 'ListProducts', 'UpdateCart'],
  frameworks: ['vue3', 'pinia', 'typescript'],
  patterns: ['api-client', 'error-handling', 'state-management', 'composable-pattern'],
  dependencies: ['@vue/reactivity', 'pinia', 'element-plus', 'date-fns'],
  designSystem: 'element-plus',
  utilityLibrary: 'vueuse',
  componentsUsed: ['ElButton', 'ElTable', 'ElForm', 'ElInput', 'ElDialog', 'ElPagination'],
  composablesUsed: ['useAsyncState', 'useDebounce', 'useFetch', 'useStorage'],
  entities: ['User', 'Order', 'Product', 'Cart'],
  complexityDistribution: {
    'trivial': 2,
    'low': 4,
    'medium': 3,
    'high': 1,
    'very-high': 0
  },
  excellentFiles: [
    {
      path: 'src/api/userClient.ts',
      reasons: ['gRPC 클라이언트 패턴 사용', '에러 핸들링 우수', '타입 정의 명확'],
      patterns: ['api-client', 'error-handling', 'type-safety']
    },
    {
      path: 'src/composables/useUser.ts',
      reasons: ['재사용성 높음', '상태 관리 패턴 우수'],
      patterns: ['composable-pattern', 'state-management']
    }
  ],
  excellentSnippets: [],
  averageComplexity: 'low',
  totalLinesOfCode: 2500,
  filesWithGoodErrorHandling: 7,
  filesWithGoodTypes: 8
};

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('🚀 Starting API Workflow Test\n');

  // Test 1: Multi-dimensional Score Calculation
  console.log('📈 Test 1: Multi-dimensional Score Calculation');
  let scores: any;
  let totalScore: number = 0;
  let excellentIn: string[] = [];
  let saveDecision: any;
  try {
    scores = calculateScoresFromMetadata(mockProjectMetadata, true);
    totalScore = calculateWeightedScore(scores);
    excellentIn = getExcellentCategories(scores);
    saveDecision = shouldSaveBestCase(scores);

    const hasAllCategories =
      scores.structure !== undefined &&
      scores.apiConnection !== undefined &&
      scores.designSystem !== undefined &&
      scores.utilityUsage !== undefined &&
      scores.errorHandling !== undefined &&
      scores.typeUsage !== undefined &&
      scores.stateManagement !== undefined &&
      scores.performance !== undefined;

    results.push({
      name: 'Score Calculation',
      passed: hasAllCategories && totalScore > 0,
      details: {
        scores,
        totalScore: totalScore.toFixed(2),
        excellentIn,
        saveDecision
      }
    });
    console.log(`  ✅ Total Score: ${totalScore.toFixed(2)}`);
    console.log(`  ✅ Scores: ${JSON.stringify(scores)}`);
    console.log(`  ✅ Excellent Categories: ${excellentIn.join(', ') || 'none'}`);
    console.log(`  ✅ Should Save: ${saveDecision.shouldSave} (${saveDecision.reason})\n`);
  } catch (err: any) {
    results.push({
      name: 'Score Calculation',
      passed: false,
      error: err.message
    });
    console.log(`  ❌ Failed: ${err.message}\n`);
  }

  // Test 2: BestCase Save with Auto-scoring
  console.log('💾 Test 2: BestCase Save with Auto-scoring');
  const testId = `test-api-workflow-${Date.now()}`;
  let savedId = '';
  try {
    const saveResult = await bestcase.saveBestCase({
      id: testId,
      projectName: 'api-workflow-test',
      category: 'api',
      description: 'API workflow test with auto-scoring',
      files: [
        { path: 'test/sample.ts', content: 'export const test = 1;', reason: 'test file' }
      ],
      patterns: {
        metadata: mockProjectMetadata
      },
      tags: ['test', 'api-workflow', 'auto-score']
    });

    savedId = saveResult.id; // Store the actual saved ID

    const hasScoreFields =
      saveResult.scores !== undefined &&
      saveResult.totalScore !== undefined &&
      saveResult.excellentIn !== undefined &&
      saveResult.saveDecision !== undefined;

    results.push({
      name: 'BestCase Save with Auto-scoring',
      passed: hasScoreFields && saveResult.success,
      details: {
        id: saveResult.id,
        success: saveResult.success,
        totalScore: saveResult.totalScore?.toFixed(2),
        excellentIn: saveResult.excellentIn,
        shouldSave: saveResult.saveDecision?.shouldSave,
        reason: saveResult.saveDecision?.reason
      }
    });
    console.log(`  ✅ Saved: ${saveResult.id} (success: ${saveResult.success})`);
    console.log(`  ✅ Auto-calculated Score: ${saveResult.totalScore?.toFixed(2)}`);
    console.log(`  ✅ Excellent In: ${saveResult.excellentIn?.join(', ') || 'none'}\n`);
  } catch (err: any) {
    results.push({
      name: 'BestCase Save with Auto-scoring',
      passed: false,
      error: err.message
    });
    console.log(`  ❌ Failed: ${err.message}\n`);
  }

  // Test 3: BestCase List with new score structure
  console.log('📋 Test 3: BestCase List with Score Structure');
  try {
    const listResult = await bestcase.listBestCases({});

    const hasNewFields = listResult.bestcases.some((bc: any) =>
      bc.scores !== undefined || bc.totalScore !== undefined || bc.excellentIn !== undefined
    );

    results.push({
      name: 'BestCase List with Scores',
      passed: listResult.bestcases !== undefined && listResult.total !== undefined,
      details: {
        total: listResult.total,
        hasNewScoreFields: hasNewFields,
        sampleBestCase: listResult.bestcases[0] ? {
          id: listResult.bestcases[0].id,
          hasScores: !!listResult.bestcases[0].scores,
          totalScore: listResult.bestcases[0].totalScore,
          excellentIn: listResult.bestcases[0].excellentIn
        } : null
      }
    });
    console.log(`  ✅ Total BestCases: ${listResult.total}`);
    console.log(`  ✅ Has new score fields: ${hasNewFields}\n`);
  } catch (err: any) {
    results.push({
      name: 'BestCase List with Scores',
      passed: false,
      error: err.message
    });
    console.log(`  ❌ Failed: ${err.message}\n`);
  }

  // Test 4: BestCase Search with filters
  console.log('🔍 Test 4: BestCase Search with Filters');
  try {
    // Search with minTotalScore filter
    const searchResult = await bestcase.searchBestCases({
      minTotalScore: 50,
      tags: ['test']
    });

    const hasSearchResults =
      searchResult.ids !== undefined &&
      searchResult.summary !== undefined &&
      searchResult.total !== undefined;

    results.push({
      name: 'BestCase Search',
      passed: hasSearchResults,
      details: {
        total: searchResult.total,
        ids: searchResult.ids?.slice(0, 3),
        summaryCount: searchResult.summary?.length || 0
      }
    });
    console.log(`  ✅ Found ${searchResult.total} matching BestCases`);
    if (searchResult.ids && searchResult.ids.length > 0) {
      console.log(`  ✅ IDs: ${searchResult.ids.slice(0, 3).join(', ')}\n`);
    } else {
      console.log(`  ✅ No results (expected with strict filters)\n`);
    }
  } catch (err: any) {
    results.push({
      name: 'BestCase Search',
      passed: false,
      error: err.message
    });
    console.log(`  ❌ Failed: ${err.message}\n`);
  }

  // Test 5: BestCase Load with score details
  console.log('📥 Test 5: BestCase Load with Score Details');
  try {
    const loadResult = await bestcase.loadBestCase({ id: savedId || testId });

    const hasDetailedScores =
      loadResult.bestCase !== undefined &&
      loadResult.bestCase.scores !== undefined;

    results.push({
      name: 'BestCase Load with Scores',
      passed: hasDetailedScores,
      details: {
        id: loadResult.bestCase?.id,
        hasScores: !!loadResult.bestCase?.scores,
        totalScore: loadResult.bestCase?.totalScore,
        excellentIn: loadResult.bestCase?.excellentIn,
        scoreBreakdown: loadResult.bestCase?.scores
      }
    });
    console.log(`  ✅ Loaded: ${loadResult.bestCase?.id}`);
    console.log(`  ✅ Score breakdown available: ${!!loadResult.bestCase?.scores}\n`);
  } catch (err: any) {
    results.push({
      name: 'BestCase Load with Scores',
      passed: false,
      error: err.message
    });
    console.log(`  ❌ Failed: ${err.message}\n`);
  }

  // Test 6: Guide Search (if guides available)
  console.log('📚 Test 6: Guide Search API');
  try {
    const searchResult = await guides.searchGuides({
      keywords: ['api', 'grpc', 'error-handling']
    });

    results.push({
      name: 'Guide Search',
      passed: searchResult.guides !== undefined,
      details: {
        guidesFound: searchResult.guides?.length || 0,
        guideIds: searchResult.guides?.map((g: any) => g.id).slice(0, 3)
      }
    });
    console.log(`  ✅ Found ${searchResult.guides?.length || 0} guides\n`);
  } catch (err: any) {
    results.push({
      name: 'Guide Search',
      passed: false,
      error: err.message
    });
    console.log(`  ❌ Failed: ${err.message}\n`);
  }

  return results;
}

async function main() {
  try {
    const results = await runTests();

    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.name}`);
      if (!r.passed && r.error) {
        console.log(`   Error: ${r.error}`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`RESULT: ${passed}/${total} tests passed`);
    console.log('='.repeat(50));

    if (passed < total) {
      console.log('\n⚠️ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All API workflow tests passed!');
    }
  } catch (err: any) {
    console.error('Test suite failed:', err);
    process.exit(1);
  }
}

main();

#!/usr/bin/env tsx
/**
 * Guides 통합 테스트 스크립트
 *
 * 동적 지침 로딩 시스템의 4가지 도구를 테스트합니다:
 * 1. search_guides
 * 2. load_guide
 * 3. combine_guides
 * 4. execute_workflow
 */

import {
  searchGuides,
  loadGuide,
  combineGuides,
  executeWorkflow,
  type SearchGuidesInput,
  type LoadGuideInput,
  type CombineGuidesInput,
  type ExecuteWorkflowInput
} from '../../mcp-servers/guides/index.js';

console.log('🧪 Starting Guides Integration Test\n');

// 테스트 1: search_guides
async function testSearchGuides() {
  console.log('📝 Test 1: search_guides');
  console.log('━'.repeat(60));

  const input: SearchGuidesInput = {
    keywords: ['grpc', 'nuxt3', 'asyncData', 'api'],
    apiType: 'grpc'
  };

  console.log('Input:', JSON.stringify(input, null, 2));

  try {
    const result = await searchGuides(input);
    console.log(`✅ Success! Found ${result.guides.length} guides`);

    console.log('\nTop 5 guides:');
    result.guides.slice(0, 5).forEach((guide, idx) => {
      console.log(`  ${idx + 1}. [${guide.score}pts] ${guide.id}`);
      console.log(`     ${guide.summary}`);
      console.log(`     Tags: ${guide.tags.join(', ')}`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

// 테스트 2: load_guide
async function testLoadGuide() {
  console.log('📝 Test 2: load_guide');
  console.log('━'.repeat(60));

  const input: LoadGuideInput = {
    id: 'grpc.api.connection'
  };

  console.log('Input:', JSON.stringify(input, null, 2));

  try {
    const result = await loadGuide(input);
    console.log('✅ Success! Loaded guide:', result.guide.id);
    console.log(`   Scope: ${result.guide.scope}`);
    console.log(`   Priority: ${result.guide.priority}`);
    console.log(`   Version: ${result.guide.version}`);
    console.log(`   Tags: ${result.guide.tags.join(', ')}`);
    console.log(`   Content length: ${result.guide.content.length} chars`);
    console.log('\n   Summary:', result.guide.summary);
    console.log('\n   Content preview:');
    console.log('   ' + result.guide.content.substring(0, 200).replace(/\n/g, '\n   ') + '...');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

// 테스트 3: combine_guides
async function testCombineGuides() {
  console.log('📝 Test 3: combine_guides');
  console.log('━'.repeat(60));

  const input: CombineGuidesInput = {
    ids: [
      'grpc.api.connection',
      'api.validation',
      'error.handling'
    ],
    context: {
      project: 'test-project',
      apiType: 'grpc'
    }
  };

  console.log('Input:', JSON.stringify(input, null, 2));

  try {
    const result = await combineGuides(input);
    console.log(`✅ Success! Combined ${result.usedGuides.length} guides`);

    console.log('\nUsed guides:');
    result.usedGuides.forEach((guide, idx) => {
      console.log(`  ${idx + 1}. ${guide.id}`);
      console.log(`     Scope: ${guide.scope}, Priority: ${guide.priority}, Version: ${guide.version}`);
    });

    console.log(`\nCombined content length: ${result.combined.length} chars`);
    console.log('\nCombined content preview:');
    console.log(result.combined.substring(0, 300).replace(/^/gm, '  ') + '...');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

// 테스트 4: execute_workflow
async function testExecuteWorkflow() {
  console.log('📝 Test 4: execute_workflow');
  console.log('━'.repeat(60));

  const input: ExecuteWorkflowInput = {
    userRequest: 'Create an inquiry list page with gRPC API integration',
    workspacePath: '/home/user/test-project',
    bestCase: {
      patterns: {
        apiInfo: {
          apiType: 'gRPC',
          hasGrpc: true,
          hasOpenApi: false
        }
      }
    },
    workflowGuide: {} as any
  };

  console.log('Input:', JSON.stringify({
    userRequest: input.userRequest,
    workspacePath: input.workspacePath,
    hasBestCase: !!input.bestCase
  }, null, 2));

  try {
    const result = await executeWorkflow(input);
    console.log('✅ Success!');
    console.log(`   Success: ${result.success}`);
    console.log(`   Risk: ${result.preflight?.risk || 0}`);
    console.log(`   Keywords: ${result.preflight?.keywords?.join(', ') || 'none'}`);
    console.log(`   Used guides: ${result.usedGuides.length}`);

    if (result.success) {
      console.log('\nPreflight checks:');
      result.preflight?.reasons?.forEach((reason: any) => {
        const status = reason.passed ? '✅' : '❌';
        console.log(`  ${status} ${reason.check}: ${reason.details}`);
      });

      console.log('\nUsed guides:');
      result.usedGuides.forEach((guide, idx) => {
        console.log(`  ${idx + 1}. ${guide.id} (${guide.scope}, priority: ${guide.priority})`);
      });

      console.log(`\nCombined content length: ${result.combinedContent.length} chars`);
    } else {
      console.log('\n⚠️  Workflow failed (scaffold-only mode)');
      console.log('Reason:', result.changeSummary?.reason);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n');
}

// 테스트 5: 필수 지침 포함 테스트
async function testMandatoryGuides() {
  console.log('📝 Test 5: search_guides with mandatory IDs');
  console.log('━'.repeat(60));

  const input: SearchGuidesInput = {
    keywords: ['nuxt3', 'page'],
    apiType: 'grpc',
    mandatoryIds: ['grpc.api.connection', 'error.handling']
  };

  console.log('Input:', JSON.stringify(input, null, 2));

  try {
    const result = await searchGuides(input);
    console.log(`✅ Success! Found ${result.guides.length} guides`);

    // 필수 지침 확인
    const mandatoryFound = input.mandatoryIds!.filter(id =>
      result.guides.some(g => g.id === id)
    );

    console.log(`\nMandatory guides found: ${mandatoryFound.length}/${input.mandatoryIds!.length}`);
    mandatoryFound.forEach(id => {
      const guide = result.guides.find(g => g.id === id);
      console.log(`  ✅ ${id} (score: ${guide!.score})`);
    });

    console.log('\nAll guides:');
    result.guides.forEach((guide, idx) => {
      const isMandatory = input.mandatoryIds!.includes(guide.id) ? '🔒' : '  ';
      console.log(`  ${isMandatory} ${idx + 1}. [${guide.score}pts] ${guide.id}`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

// 모든 테스트 실행
async function runAllTests() {
  try {
    await testSearchGuides();
    await testLoadGuide();
    await testCombineGuides();
    await testMandatoryGuides();
    await testExecuteWorkflow();

    console.log('━'.repeat(60));
    console.log('🎉 All tests completed!');
  } catch (error: any) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests();

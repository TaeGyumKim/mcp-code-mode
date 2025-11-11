#!/usr/bin/env tsx
/**
 * MCP 서버 전체 플로우 테스트
 *
 * 실제 사용 시나리오를 시뮬레이션:
 * 1. 사용자 요청 입력
 * 2. execute_workflow로 전체 워크플로우 실행
 * 3. 반환된 지침을 기반으로 코드 생성
 */

import {
  executeWorkflow,
  searchGuides,
  combineGuides,
  type ExecuteWorkflowInput
} from '../../mcp-servers/guides/index.js';

console.log('🚀 MCP 서버 전체 플로우 테스트\n');
console.log('━'.repeat(80));

// 시나리오: 사용자가 "gRPC를 사용하는 문의 목록 페이지 생성" 요청
async function testRealWorldScenario() {
  console.log('\n📋 시나리오: gRPC API를 사용하는 문의 목록 페이지 생성\n');

  const userRequest = 'Create an inquiry list page with gRPC API, including search, pagination, and delete functionality';
  const workspacePath = '/home/user/test-project';

  console.log('👤 사용자 요청:', userRequest);
  console.log('📁 작업 경로:', workspacePath);
  console.log('\n' + '━'.repeat(80));

  // Step 1: execute_workflow 실행
  console.log('\n🔄 Step 1: execute_workflow 실행');
  console.log('─'.repeat(80));

  const workflowInput: ExecuteWorkflowInput = {
    userRequest,
    workspacePath,
    bestCase: {
      patterns: {
        apiInfo: {
          apiType: 'gRPC',
          hasGrpc: true,
          hasOpenApi: false,
          endpoints: [
            { method: 'getInquiryList', file: 'composables/grpc.ts' },
            { method: 'deleteInquiry', file: 'composables/grpc.ts' }
          ]
        }
      }
    },
    workflowGuide: {} as any
  };

  try {
    const workflowResult = await executeWorkflow(workflowInput);

    console.log('\n✅ Workflow 실행 성공!');
    console.log('\n📊 결과:');
    console.log(`  - Success: ${workflowResult.success}`);
    console.log(`  - Risk Score: ${workflowResult.preflight?.risk || 0}/40`);
    console.log(`  - 추출된 키워드: ${workflowResult.preflight?.keywords?.length || 0}개`);
    console.log(`  - 사용된 지침: ${workflowResult.usedGuides.length}개`);
    console.log(`  - 병합된 콘텐츠: ${workflowResult.combinedContent.length} chars`);

    // 추출된 키워드 출력
    if (workflowResult.preflight?.keywords) {
      console.log('\n🔑 추출된 키워드:');
      console.log('  ', workflowResult.preflight.keywords.join(', '));
    }

    // Preflight 체크 결과
    if (workflowResult.preflight?.reasons) {
      console.log('\n✓ Preflight 검수 결과:');
      workflowResult.preflight.reasons.forEach((reason: any) => {
        const icon = reason.passed ? '✅' : '❌';
        console.log(`  ${icon} ${reason.check}: ${reason.details}`);
      });
    }

    // 사용된 지침 목록
    console.log('\n📚 사용된 지침:');
    workflowResult.usedGuides.forEach((guide, idx) => {
      console.log(`  ${idx + 1}. ${guide.id}`);
      console.log(`     Scope: ${guide.scope}, Priority: ${guide.priority}, Version: ${guide.version}`);
    });

    // 병합된 콘텐츠 미리보기
    console.log('\n📄 병합된 지침 콘텐츠 미리보기:');
    console.log('  ' + workflowResult.combinedContent.substring(0, 300).replace(/\n/g, '\n  ') + '...');

    console.log('\n' + '━'.repeat(80));

    // Step 2: 키워드 기반 추가 지침 검색
    console.log('\n🔍 Step 2: 추가 지침 검색 (키워드 기반)');
    console.log('─'.repeat(80));

    const searchKeywords = ['pagination', 'search', 'delete', 'crud'];
    console.log('검색 키워드:', searchKeywords.join(', '));

    const searchResult = await searchGuides({
      keywords: searchKeywords,
      apiType: 'grpc'
    });

    console.log(`\n✅ ${searchResult.guides.length}개 지침 발견`);
    console.log('\nTop 3 추가 지침:');
    searchResult.guides.slice(0, 3).forEach((guide, idx) => {
      console.log(`  ${idx + 1}. [${guide.score}pts] ${guide.id}`);
      console.log(`     ${guide.summary}`);
    });

    console.log('\n' + '━'.repeat(80));

    // Step 3: 추가 지침 병합
    console.log('\n🔗 Step 3: 기존 지침 + 추가 지침 병합');
    console.log('─'.repeat(80));

    const allGuideIds = [
      ...workflowResult.usedGuides.map(g => g.id),
      ...searchResult.guides.slice(0, 2).map(g => g.id)
    ];

    // 중복 제거
    const uniqueGuideIds = [...new Set(allGuideIds)];
    console.log(`병합할 지침 (${uniqueGuideIds.length}개):`, uniqueGuideIds.join(', '));

    const combinedResult = await combineGuides({
      ids: uniqueGuideIds,
      context: {
        project: 'test-project',
        apiType: 'grpc'
      }
    });

    console.log(`\n✅ ${combinedResult.usedGuides.length}개 지침 병합 완료`);
    console.log(`병합된 콘텐츠: ${combinedResult.combined.length} chars`);

    console.log('\n최종 사용된 지침:');
    combinedResult.usedGuides.forEach((guide, idx) => {
      console.log(`  ${idx + 1}. ${guide.id} (${guide.scope}, priority: ${guide.priority})`);
    });

    console.log('\n' + '━'.repeat(80));

    // Step 4: 최종 요약
    console.log('\n📈 Step 4: 최종 요약');
    console.log('─'.repeat(80));

    console.log('\n✨ 워크플로우 완료!');
    console.log(`\n📊 통계:`);
    console.log(`  - Risk Score: ${workflowResult.preflight?.risk || 0}/40 ${(workflowResult.preflight?.risk || 0) < 40 ? '✅ (안전)' : '⚠️ (스캐폴딩만)'}`);
    console.log(`  - 추출된 키워드: ${workflowResult.preflight?.keywords?.length || 0}개`);
    console.log(`  - 초기 지침: ${workflowResult.usedGuides.length}개`);
    console.log(`  - 최종 지침: ${combinedResult.usedGuides.length}개`);
    console.log(`  - 최종 콘텐츠: ${combinedResult.combined.length} chars`);

    // 토큰 절감 계산
    const allGuidesTokens = 100000; // 전체 11개 지침 (추정)
    const usedGuidesTokens = Math.floor(combinedResult.combined.length / 4); // ~4 chars per token
    const savings = Math.floor((1 - usedGuidesTokens / allGuidesTokens) * 100);

    console.log(`\n💰 토큰 절감:`);
    console.log(`  - 전통 MCP: ~${allGuidesTokens.toLocaleString()} 토큰 (전체 지침)`);
    console.log(`  - Code Mode: ~${usedGuidesTokens.toLocaleString()} 토큰 (필요한 지침만)`);
    console.log(`  - 절감률: ${savings}% 🎉`);

    console.log('\n✅ 전체 플로우 테스트 성공!');

  } catch (error: any) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 실행
testRealWorldScenario().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * MCP 서버 전체 플로우 테스트
 *
 * 새로운 Anthropic Code Mode 방식 테스트:
 * 1. 가이드 검색 (guides.search)
 * 2. 가이드 병합 (guides.combine)
 * 3. BestCase 로드 및 비교 (선택적)
 */

import {
  searchGuides,
  combineGuides
} from '../../mcp-servers/guides/dist/index.js';

console.log('🚀 MCP 서버 전체 플로우 테스트 (Code Mode)\n');
console.log('━'.repeat(80));

// 시나리오: 사용자가 "gRPC를 사용하는 문의 목록 페이지 생성" 요청
async function testRealWorldScenario() {
  console.log('\n📋 시나리오: gRPC API를 사용하는 문의 목록 페이지 생성\n');

  const userRequest = 'Create an inquiry list page with gRPC API, including search, pagination, and delete functionality';
  const projectApiType = 'grpc';

  console.log('👤 사용자 요청:', userRequest);
  console.log('🔧 프로젝트 API 타입:', projectApiType);
  console.log('\n' + '━'.repeat(80));

  try {
    // Step 1: 가이드 검색
    console.log('\n🔍 Step 1: 가이드 검색 (guides.search)');
    console.log('─'.repeat(80));

    const searchKeywords = ['grpc', 'crud', 'pagination', 'search', 'delete', 'inquiry'];
    const mandatoryIds = ['grpc.api.connection', 'api.validation', 'error.handling'];

    console.log('검색 키워드:', searchKeywords.join(', '));
    console.log('필수 가이드:', mandatoryIds.join(', '));

    const searchResult = await searchGuides({
      keywords: searchKeywords,
      apiType: projectApiType,
      mandatoryIds
    });

    console.log(`\n✅ ${searchResult.guides.length}개 가이드 발견`);
    console.log('\nTop 5 가이드:');
    searchResult.guides.slice(0, 5).forEach((guide, idx) => {
      console.log(`  ${idx + 1}. [${guide.score}pts] ${guide.id}`);
      console.log(`     ${guide.summary}`);
      console.log(`     Scope: ${guide.scope}, Priority: ${guide.priority}`);
    });

    console.log('\n' + '━'.repeat(80));

    // Step 2: 가이드 병합
    console.log('\n🔗 Step 2: 가이드 병합 (guides.combine)');
    console.log('─'.repeat(80));

    // 상위 5개 가이드 + 필수 가이드 선택
    const selectedGuideIds = searchResult.guides.slice(0, 5).map(g => g.id);
    console.log(`병합할 가이드 (${selectedGuideIds.length}개):`, selectedGuideIds.join(', '));

    const combinedResult = await combineGuides({
      ids: selectedGuideIds,
      context: {
        project: 'test-project',
        apiType: projectApiType,
        designSystem: 'element-plus',
        utilityLibrary: 'vueuse'
      }
    });

    console.log(`\n✅ ${combinedResult.usedGuides.length}개 가이드 병합 완료`);
    console.log(`병합된 콘텐츠: ${combinedResult.combined.length} chars`);

    console.log('\n최종 사용된 가이드:');
    combinedResult.usedGuides.forEach((guide, idx) => {
      console.log(`  ${idx + 1}. ${guide.id}`);
      console.log(`     Scope: ${guide.scope}, Priority: ${guide.priority}, Mandatory: ${guide.mandatory || false}`);
    });

    if (combinedResult.mandatoryReminders && combinedResult.mandatoryReminders.length > 0) {
      console.log('\n⚠️ 필수 가이드 알림:');
      combinedResult.mandatoryReminders.forEach(reminder => {
        console.log(`  - ${reminder}`);
      });
    }

    console.log('\n' + '━'.repeat(80));

    // Step 3: 병합된 콘텐츠 미리보기
    console.log('\n📄 Step 3: 병합된 가이드 콘텐츠 미리보기');
    console.log('─'.repeat(80));

    const preview = combinedResult.combined.substring(0, 500).replace(/\n/g, '\n  ');
    console.log('\n  ' + preview + '...');

    console.log('\n' + '━'.repeat(80));

    // Step 4: 최종 요약
    console.log('\n📈 Step 4: 최종 요약');
    console.log('─'.repeat(80));

    console.log('\n✨ 워크플로우 완료!');
    console.log(`\n📊 통계:`);
    console.log(`  - 검색된 가이드: ${searchResult.guides.length}개`);
    console.log(`  - 선택된 가이드: ${selectedGuideIds.length}개`);
    console.log(`  - 최종 사용된 가이드: ${combinedResult.usedGuides.length}개`);
    console.log(`  - 최종 콘텐츠: ${combinedResult.combined.length} chars`);

    // 토큰 절감 계산
    const allGuidesTokens = 100000; // 전체 가이드 (추정)
    const usedGuidesTokens = Math.floor(combinedResult.combined.length / 4); // ~4 chars per token
    const savings = Math.floor((1 - usedGuidesTokens / allGuidesTokens) * 100);

    console.log(`\n💰 토큰 절감:`);
    console.log(`  - 전통 MCP: ~${allGuidesTokens.toLocaleString()} 토큰 (전체 가이드)`);
    console.log(`  - Code Mode: ~${usedGuidesTokens.toLocaleString()} 토큰 (필요한 가이드만)`);
    console.log(`  - 절감률: ${savings}% 🎉`);

    console.log('\n' + '━'.repeat(80));

    // Step 5: 추가 키워드로 재검색 (예시)
    console.log('\n🔄 Step 5: 추가 키워드로 재검색 (예시)');
    console.log('─'.repeat(80));

    const additionalKeywords = ['error-handling', 'validation', 'loading-states'];
    console.log('추가 검색 키워드:', additionalKeywords.join(', '));

    const additionalSearchResult = await searchGuides({
      keywords: additionalKeywords,
      apiType: projectApiType
    });

    console.log(`\n✅ ${additionalSearchResult.guides.length}개 추가 가이드 발견`);
    console.log('\nTop 3 추가 가이드:');
    additionalSearchResult.guides.slice(0, 3).forEach((guide, idx) => {
      console.log(`  ${idx + 1}. [${guide.score}pts] ${guide.id}`);
      console.log(`     ${guide.summary}`);
    });

    console.log('\n✅ 전체 플로우 테스트 성공!');
    console.log('\n' + '━'.repeat(80));

    console.log('\n📝 다음 단계:');
    console.log('  1. 병합된 가이드를 LLM에 전달');
    console.log('  2. LLM이 가이드를 참고하여 코드 생성');
    console.log('  3. BestCase와 비교하여 품질 개선 (선택)');
    console.log('\n💡 BestCase 비교는 scripts/examples/compare-bestcase-example.ts 참고');

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

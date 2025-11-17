#!/usr/bin/env tsx
/**
 * 페이지 코드 자동 추천 워크플로우 예시
 *
 * 이 스크립트는 "페이지를 완성해줘" 요청 시 실행되는 자동 코드 추천 플로우를 시연합니다.
 *
 * 워크플로우:
 * 1. 현재 프로젝트 컨텍스트 추출
 * 2. 유사한 BestCase 페이지 검색
 * 3. 관련 코드 파일 자동 추천
 * 4. 적용 가이드 생성
 */

import { runAgentScript } from '../../packages/ai-runner/src/agentRunner.js';

console.log('🚀 페이지 코드 자동 추천 워크플로우 예시\n');
console.log('━'.repeat(80));

async function exampleRecommendPageCode() {
  console.log('\n📋 시나리오: "목록 페이지를 완성해줘"\n');

  try {
    const result = await runAgentScript({
      code: `
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 1: 현재 프로젝트 컨텍스트 추출
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🔍 Step 1: 현재 프로젝트 컨텍스트 추출');
console.log('─'.repeat(80));

// 예시: 실제로는 metadata.extractProjectContext()를 사용
const projectAnalysis = {
  category: 'list',  // 목록 페이지
  apiType: 'grpc',   // gRPC API 사용
  designSystem: 'openerd-nuxt3',  // 디자인 시스템
  frameworks: ['vue3', 'pinia', 'nuxt3'],
  features: ['pagination', 'sorting', 'filtering', 'loading-state']
};

console.log('현재 프로젝트 분석:');
console.log(JSON.stringify(projectAnalysis, null, 2));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 2: 유사한 페이지 검색
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n📦 Step 2: 유사한 페이지 검색');
console.log('─'.repeat(80));

const similarPages = await bestcase.findSimilarPages({
  category: projectAnalysis.category,
  apiType: projectAnalysis.apiType,
  designSystem: projectAnalysis.designSystem,
  frameworks: projectAnalysis.frameworks,
  tags: projectAnalysis.features,
  minTotalScore: 60,
  limit: 5
});

console.log(\`유사한 페이지 발견: \${similarPages.total}개\\n\`);

if (similarPages.pages.length > 0) {
  similarPages.pages.forEach((page, idx) => {
    console.log(\`\${idx + 1}. [\${page.matchScore}점] \${page.projectName} / \${page.category}\`);
    console.log(\`   설명: \${page.description}\`);
    console.log(\`   품질: \${page.totalScore || 'N/A'}점\`);
    console.log(\`   우수 영역: \${page.excellentIn?.join(', ') || 'N/A'}\`);
    console.log(\`   파일 수: \${page.fileCount}개\`);
    console.log(\`   일치 이유: \${page.matchReasons.join(', ')}\`);
    console.log('');
  });
} else {
  console.log('⚠️ 유사한 페이지를 찾을 수 없습니다.');
  console.log('   BestCase를 먼저 저장해주세요.');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 3: 코드 자동 추천
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n💡 Step 3: 코드 자동 추천');
console.log('─'.repeat(80));

const recommendation = await bestcase.recommendCodeForPage(projectAnalysis);

console.log(\`추천 파일 수: \${recommendation.totalFiles}개\\n\`);

if (recommendation.files.length > 0) {
  console.log('📂 추천 파일 목록:');
  recommendation.files.slice(0, 10).forEach((file, idx) => {
    console.log(\`\\n\${idx + 1}. [\${file.relevanceScore}점] \${file.path}\`);
    console.log(\`   카테고리: \${file.fileCategory}\`);
    console.log(\`   목적: \${file.purpose}\`);
    console.log(\`   출처: \${file.sourceProject}\`);
    console.log(\`   추천 이유: \${file.reasons.slice(0, 2).join(', ')}\`);
    console.log(\`   코드 크기: \${file.content.length} chars\`);
  });

  // 첫 번째 파일 내용 미리보기
  console.log('\\n━'.repeat(80));
  console.log('\\n📄 첫 번째 추천 파일 미리보기:');
  console.log('─'.repeat(80));
  const firstFile = recommendation.files[0];
  console.log(\`파일: \${firstFile.path}\`);
  console.log(\`목적: \${firstFile.purpose}\\n\`);

  // 코드 미리보기 (최대 50줄)
  const lines = firstFile.content.split('\\n');
  const preview = lines.slice(0, 50).join('\\n');
  console.log(preview);
  if (lines.length > 50) {
    console.log(\`\\n... (총 \${lines.length}줄 중 50줄 표시)\`);
  }
} else {
  console.log('⚠️ 추천할 파일이 없습니다.');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 4: 적용 가이드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n━'.repeat(80));
console.log('\\n📋 Step 4: 적용 가이드');
console.log('─'.repeat(80));
console.log(recommendation.applicationGuide);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 최종 요약
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n━'.repeat(80));
console.log('\\n✅ 워크플로우 완료!');
console.log('─'.repeat(80));

console.log(\`\\n📊 최종 통계:\`);
console.log(\`  - 검색된 유사 페이지: \${similarPages.total}개\`);
console.log(\`  - 추천된 파일: \${recommendation.totalFiles}개\`);
console.log(\`  - 참조된 BestCase: \${recommendation.sources.length}개\`);

console.log('\\n💡 MCP 클라이언트 사용 예시:');
console.log(\`
// Claude나 다른 MCP 클라이언트에서:
const result = await execute({
  code: \\\`
    const analysis = await metadata.extractProjectContext('/projects/myapp');
    const recommendation = await bestcase.recommendCodeForPage({
      category: 'list',
      apiType: analysis.apiInfo.type,
      designSystem: analysis.designSystemInfo.detected,
      frameworks: analysis.frameworks
    });

    // 추천된 코드를 현재 프로젝트에 적용
    for (const file of recommendation.files) {
      console.log('Applying:', file.path);
      // 코드 수정 및 적용 로직
    }

    return recommendation;
  \\\`
});
\`);

return {
  similarPages: similarPages.pages.map(p => ({
    id: p.id,
    projectName: p.projectName,
    category: p.category,
    matchScore: p.matchScore
  })),
  recommendedFiles: recommendation.files.map(f => ({
    path: f.path,
    fileCategory: f.fileCategory,
    relevanceScore: f.relevanceScore,
    contentLength: f.content.length
  })),
  sources: recommendation.sources,
  guide: recommendation.applicationGuide.slice(0, 500) + '...'
};
      `,
      timeoutMs: 60000
    });

    console.log('\n━'.repeat(80));
    console.log('\n✅ 스크립트 실행 완료!');

    if (result.ok) {
      console.log('\n📄 실행 로그:');
      if (result.logs && result.logs.length > 0) {
        result.logs.forEach(log => console.log(log));
      }
    } else {
      console.error('\n❌ 에러 발생:');
      console.error(result.error);
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 실행
exampleRecommendPageCode().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

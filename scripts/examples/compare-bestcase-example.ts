#!/usr/bin/env tsx
/**
 * BestCase 비교 워크플로우 예시
 *
 * 이 스크립트는 execute 도구를 통해 BestCase 비교 전체 플로우를 시연합니다.
 *
 * 워크플로우:
 * 1. 현재 프로젝트 메타데이터 추출 (MetadataAnalyzer)
 * 2. 유사한 BestCase 로드 (API 타입 기준)
 * 3. 메타데이터 비교 (compareBestCase)
 * 4. TODO 항목 생성
 * 5. 가이드 검색 및 병합
 */

import { runAgentScript } from '../../packages/ai-runner/src/agentRunner.js';

console.log('🚀 BestCase 비교 워크플로우 예시\n');
console.log('━'.repeat(80));

async function exampleCompareBestCase() {
  console.log('\n📋 시나리오: 현재 프로젝트와 BestCase 비교\n');

  try {
    const result = await runAgentScript({
      code: `
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 1: 현재 프로젝트 메타데이터 추출
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🔍 Step 1: 현재 프로젝트 메타데이터 추출');
console.log('─'.repeat(80));

// MetadataAnalyzer 생성
const analyzer = metadata.createAnalyzer({
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:7b'
});

// 프로젝트 파일 검색
const files = await filesystem.searchFiles({
  pattern: '**/*.{ts,vue,js}'
});

console.log(\`발견된 파일: \${files.length}개\`);

// 프로젝트 메타데이터 추출 (상위 3개 파일만 분석)
const projectPath = '/workspace/myapp';
const projectMeta = await analyzer.analyzeProject(projectPath, files.slice(0, 10), 3);

console.log('\\n✅ 프로젝트 분석 완료');
console.log(\`  - API Type: \${projectMeta.apiType}\`);
console.log(\`  - Design System: \${projectMeta.designSystem}\`);
console.log(\`  - Patterns: \${projectMeta.patterns.join(', ')}\`);
console.log(\`  - Complexity: \${projectMeta.averageComplexity}\`);
console.log(\`  - Total Files: \${projectMeta.totalFiles}\`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 2: 유사한 BestCase 로드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n📦 Step 2: 유사한 BestCase 로드');
console.log('─'.repeat(80));

// 모든 BestCase 목록 가져오기
const allCases = await bestcase.listBestCases();
console.log(\`사용 가능한 BestCase: \${allCases.bestcases.length}개\`);

// API 타입이 일치하는 BestCase 찾기
const similarCase = allCases.bestcases.find(bc => {
  const metadata = bc.patterns?.metadata;
  return metadata && metadata.apiType === projectMeta.apiType;
});

if (!similarCase) {
  console.log('⚠️ 유사한 BestCase를 찾을 수 없습니다');
  console.log('   다음 명령으로 BestCase를 저장하세요:');
  console.log('   await bestcase.saveBestCase({ ... })');
  return { error: 'No similar BestCase found' };
}

console.log(\`\\n✅ 유사한 BestCase 발견: \${similarCase.projectName}\`);
console.log(\`  - Category: \${similarCase.category}\`);
console.log(\`  - API Type: \${similarCase.patterns?.metadata?.apiType}\`);

// 전체 BestCase 로드
const fullCase = await bestcase.loadBestCase({
  projectName: similarCase.projectName,
  category: similarCase.category
});

const bestCaseMeta = fullCase.bestCase.patterns.metadata;
const bestCaseFiles = fullCase.bestCase.files;

console.log(\`  - Files: \${bestCaseFiles.length}개\`);
console.log(\`  - Patterns: \${bestCaseMeta.patterns.join(', ')}\`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 3: 메타데이터 비교
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n⚖️ Step 3: 메타데이터 비교');
console.log('─'.repeat(80));

const comparison = metadata.compareBestCase(
  projectMeta,
  bestCaseMeta,
  bestCaseFiles
);

console.log('\\n📊 비교 결과:');
console.log(\`  - Missing Patterns: \${comparison.missingPatterns.length}개\`);
if (comparison.missingPatterns.length > 0) {
  console.log(\`    → \${comparison.missingPatterns.join(', ')}\`);
}

console.log(\`  - Complexity Gap: \${comparison.complexityGap.project} (현재) vs \${comparison.complexityGap.bestCase} (목표)\`);
console.log(\`  - Error Handling Gap: \${comparison.errorHandlingGap}%\`);
console.log(\`  - Type Quality Gap: \${comparison.typeQualityGap}%\`);
console.log(\`  - Unused Methods: \${comparison.unusedMethods.length}개\`);
console.log(\`  - Unused Components: \${comparison.unusedComponents.length}개\`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 4: TODO 항목 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(\`\\n📝 Step 4: TODO 항목 생성 (\${comparison.todos.length}개)\`);
console.log('─'.repeat(80));

comparison.todos.forEach((todo, idx) => {
  const priorityIcon = todo.priority === 'high' ? '🔴' :
                       todo.priority === 'medium' ? '🟡' : '🟢';
  console.log(\`\\n\${idx + 1}. \${priorityIcon} [\${todo.priority.toUpperCase()}] \${todo.id}\`);
  console.log(\`   Reason: \${todo.reason}\`);
  console.log(\`   Files: \${todo.files.join(', ')}\`);
  console.log(\`   LOC: ~\${todo.loc} lines\`);

  if (todo.referenceFile) {
    console.log(\`   Reference: \${todo.referenceFile.path} (score: \${todo.referenceFile.score}, tier: \${todo.referenceFile.tier})\`);
  }

  if (todo.referenceFiles && todo.referenceFiles.length > 0) {
    console.log(\`   References: \${todo.referenceFiles.length}개\`);
    todo.referenceFiles.forEach((ref, refIdx) => {
      console.log(\`     \${refIdx + 1}. \${ref.path} (score: \${ref.score}, tier: \${ref.tier})\`);
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 5: 가이드 검색 및 병합
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n🔍 Step 5: 가이드 검색 및 병합');
console.log('─'.repeat(80));

// 누락된 패턴 + 프로젝트 패턴을 키워드로 사용
const keywords = [
  ...projectMeta.patterns,
  ...comparison.missingPatterns,
  projectMeta.apiType
];

console.log(\`검색 키워드: \${keywords.join(', ')}\`);

const guidesResult = await guides.search({
  keywords,
  apiType: projectMeta.apiType,
  designSystem: projectMeta.designSystem,
  utilityLibrary: projectMeta.utilityLibrary
});

console.log(\`\\n✅ \${guidesResult.guides.length}개 가이드 발견\`);
console.log('\\nTop 5 가이드:');
guidesResult.guides.slice(0, 5).forEach((guide, idx) => {
  console.log(\`  \${idx + 1}. [\${guide.score}pts] \${guide.id}\`);
  console.log(\`     \${guide.summary}\`);
});

// 가이드 병합
const selectedIds = guidesResult.guides.slice(0, 5).map(g => g.id);
const combinedGuides = await guides.combine({
  ids: selectedIds,
  context: {
    project: 'myapp',
    apiType: projectMeta.apiType,
    designSystem: projectMeta.designSystem
  }
});

console.log(\`\\n✅ \${combinedGuides.usedGuides.length}개 가이드 병합 완료\`);
console.log(\`   콘텐츠 크기: \${combinedGuides.combined.length} chars\`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 최종 요약
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\\n━'.repeat(80));
console.log('\\n📈 최종 요약');
console.log('─'.repeat(80));

console.log('\\n✨ BestCase 비교 워크플로우 완료!');
console.log(\`\\n📊 통계:\`);
console.log(\`  - 프로젝트 파일: \${projectMeta.totalFiles}개\`);
console.log(\`  - BestCase 파일: \${bestCaseFiles.length}개\`);
console.log(\`  - 생성된 TODO: \${comparison.todos.length}개\`);
console.log(\`    - High Priority: \${comparison.todos.filter(t => t.priority === 'high').length}개\`);
console.log(\`    - Medium Priority: \${comparison.todos.filter(t => t.priority === 'medium').length}개\`);
console.log(\`    - Low Priority: \${comparison.todos.filter(t => t.priority === 'low').length}개\`);
console.log(\`  - 선택된 가이드: \${combinedGuides.usedGuides.length}개\`);
console.log(\`  - 가이드 콘텐츠: \${combinedGuides.combined.length} chars\`);

console.log('\\n💡 다음 단계:');
console.log('  1. TODO 항목을 기반으로 코드 개선');
console.log('  2. BestCase 참고 파일을 참조하여 패턴 구현');
console.log('  3. 가이드를 LLM에 전달하여 코드 생성 지원');
console.log('  4. 개선 후 다시 메타데이터 추출하여 품질 확인');

return {
  projectMeta,
  bestCaseMeta,
  comparison,
  guides: combinedGuides.usedGuides,
  todos: comparison.todos
};
      `,
      timeoutMs: 60000
    });

    console.log('\n━'.repeat(80));
    console.log('\n✅ 워크플로우 실행 완료!');

    if (result.ok) {
      console.log('\n📄 실행 결과:');
      if (result.logs && result.logs.length > 0) {
        result.logs.forEach(log => console.log(log));
      }

      if (result.output) {
        console.log('\n📦 반환된 데이터:');
        console.log(JSON.stringify(result.output, null, 2));
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
exampleCompareBestCase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

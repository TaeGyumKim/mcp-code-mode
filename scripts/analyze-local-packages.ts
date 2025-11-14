#!/usr/bin/env tsx
/**
 * 로컬 패키지 자동 분석 스크립트
 *
 * .mcp/local-packages.json에 등록된 모든 패키지를 AI로 분석
 */

import { LocalPackageAnalyzer } from '../packages/llm-analyzer/src/localPackageAnalyzer.js';
import { LocalPackageManager } from '../packages/llm-analyzer/src/localPackageManager.js';

async function main() {
  console.log('\n🚀 Starting local package analysis...\n');

  const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
  const model = process.env.LLM_MODEL || 'qwen2.5-coder:7b';

  console.log(`📡 Ollama URL: ${ollamaUrl}`);
  console.log(`🤖 Model: ${model}\n`);

  // 분석기 초기화
  const analyzer = new LocalPackageAnalyzer({
    ollamaUrl,
    model
  });

  const manager = new LocalPackageManager();

  try {
    // 등록된 패키지 목록 로드
    const packages = await manager.getAllPackages();

    if (packages.length === 0) {
      console.log('⚠️  No local packages found in .mcp/local-packages.json');
      console.log('   Please register packages first.\n');
      return;
    }

    console.log(`📦 Found ${packages.length} local packages:\n`);
    packages.forEach((pkg, idx) => {
      const status = pkg.analyzed ? '✅' : '⏳';
      console.log(`   ${idx + 1}. ${status} ${pkg.name} (${pkg.type}) - ${pkg.sourceType}`);
    });
    console.log();

    // 분석 모드 선택
    const mode = process.env.ANALYSIS_MODE || 'unanalyzed'; // all | unanalyzed | force

    let toAnalyze = packages;

    if (mode === 'unanalyzed') {
      toAnalyze = packages.filter(p => !p.analyzed);
      console.log(`🔍 Analysis mode: unanalyzed only (${toAnalyze.length} packages)\n`);
    } else if (mode === 'all' || mode === 'force') {
      console.log(`🔍 Analysis mode: all packages (${toAnalyze.length} packages)\n`);
    }

    if (toAnalyze.length === 0) {
      console.log('✅ All packages are already analyzed!\n');
      return;
    }

    // 패키지별 분석 실행
    let successCount = 0;
    let failCount = 0;

    for (const pkg of toAnalyze) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📦 Analyzing: ${pkg.name} (${pkg.id})`);
      console.log(`${'='.repeat(80)}\n`);

      try {
        await analyzer.analyzePackage(pkg.id);
        successCount++;
        console.log(`\n✅ Success: ${pkg.name}\n`);
      } catch (error) {
        failCount++;
        console.error(`\n❌ Failed: ${pkg.name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);

        // 에러 로그 저장 (선택사항)
        if (process.env.LOG_ERRORS === 'true') {
          const errorLog = {
            packageId: pkg.id,
            packageName: pkg.name,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          };
          console.error(`   Error details:`, JSON.stringify(errorLog, null, 2));
        }
      }
    }

    // 최종 결과
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 Analysis Summary');
    console.log(`${'='.repeat(80)}\n`);
    console.log(`   Total packages: ${toAnalyze.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log();

    if (successCount > 0) {
      console.log('🎉 Local package analysis completed!\n');
    } else {
      console.log('⚠️  No packages were successfully analyzed.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error during analysis:');
    console.error(error);
    process.exit(1);
  }
}

// 실행
main().catch(error => {
  console.error('❌ Unhandled error:');
  console.error(error);
  process.exit(1);
});

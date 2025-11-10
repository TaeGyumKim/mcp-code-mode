/**
 * 단일 프로젝트 AI 스캔 테스트
 */

import { CodeAnalyzer } from './packages/llm-analyzer/dist/index.js';
import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { BestCaseStorage } from './packages/bestcase-db/dist/index.js';

const PROJECTS_BASE_PATH = '/projects';
const BESTCASE_STORAGE_PATH = `${PROJECTS_BASE_PATH}/.bestcases`;
const OLLAMA_URL = 'http://ollama-code-analyzer:11434';
const LLM_MODEL = 'qwen2.5-coder:7b';
const CONCURRENCY = 2;

// 테스트할 프로젝트 (간단한 프로젝트)
const TEST_PROJECT = {
  name: '03.nuxt3_starter',
  path: `${PROJECTS_BASE_PATH}/03.nuxt3_starter`,
  category: 'test-ai-scan'
};

/**
 * 단일 프로젝트 스캔
 */
async function testSingleProject() {
  console.log('');
  console.log('🧪 Testing AI Analysis on Single Project');
  console.log('📦 Project:', TEST_PROJECT.name);
  console.log('🤖 Model:', LLM_MODEL);
  console.log('⚡ Concurrency:', CONCURRENCY);
  console.log('');

  const PROJECT_NAME = TEST_PROJECT.name;
  const targetPath = TEST_PROJECT.path;

  const scanCode = `
const PROJECT_NAME = '${PROJECT_NAME}';
const targetPath = '${targetPath}';

console.log('========================================');
console.log('🔍 Scanning:', PROJECT_NAME);
console.log('========================================');
console.log('');

try {
  // 1. 파일 스캔
  const fileList = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*',
    recursive: true
  });

  const files = fileList.files.filter(f => !f.isDirectory && (f.name.endsWith('.vue') || f.name.endsWith('.ts')));
  console.log(\`📊 Found \${files.length} analyzable files\\n\`);

  // 패턴 분석 및 결과 수집을 위한 기본 구조
  const patterns = {
    componentUsage: { CommonTable: 0, CommonPaginationTable: 0, CommonButton: 0, CommonLayout: 0 },
    composableUsage: { usePaging: 0, useBackendClient: 0, useModalState: 0 },
    apiInfo: { hasGrpc: false, hasOpenApi: false },
    codePatterns: { framework: 'Nuxt 3', usesTypescript: true }
  };

  // 샘플 파일 수집
  const sampleFiles = [];
  const vueComponents = files.filter(f => f.name.endsWith('.vue')).slice(0, 3);
  
  for (const file of vueComponents) {
    try {
      const content = await filesystem.readFile({ path: file.path });
      sampleFiles.push({
        path: file.name,
        content: content.content.substring(0, 2000),
        purpose: 'Vue Component Sample'
      });
    } catch (e) {}
  }

  // 결과 반환
  return {
    patterns,
    sampleFiles,
    fileCount: files.length,
    scores: {
      final: 50,
      pattern: 20,
      api: 20,
      component: 20,
      tier: 'C'
    }
  };

} catch (error) {
  console.log('❌ Error:', error.message);
  return null;
}
`;

  // 스캔 실행
  console.log('🔄 Running scan code...');
  let scanResult;
  try {
    const result = await runAgentScript({ 
      code: scanCode, 
      timeoutMs: 60000 
    });
    
    if (result.ok && result.output) {
      scanResult = result.output;
      console.log('✅ Scan completed');
      console.log(`📊 Files found: ${scanResult.fileCount}`);
      console.log('');
    } else {
      console.log('❌ Scan failed - no output');
      return;
    }
  } catch (error) {
    console.log('❌ Scan execution failed:', error.message);
    return;
  }

  // AI 분석 실행 (실제 파일 3-5개만)
  if (scanResult && scanResult.fileCount > 0) {
    console.log('🤖 Starting AI Code Quality Analysis...');
    
    const analyzer = new CodeAnalyzer({
      ollamaUrl: OLLAMA_URL,
      model: LLM_MODEL,
      concurrency: CONCURRENCY
    });

    try {
      // 파일 목록 가져오기
      const fileListResult = await runAgentScript({
        code: `
          const files = await filesystem.searchFiles({
            path: '${targetPath}',
            pattern: '*',
            recursive: true
          });
          return files.files.filter(f => 
            !f.isDirectory && 
            (f.name.endsWith('.vue') || f.name.endsWith('.ts'))
          ).slice(0, 5);
        `,
        timeoutMs: 10000
      });

      if (!fileListResult.ok || !fileListResult.output) {
        console.log('❌ Failed to get file list');
        return;
      }

      const filesToAnalyze = fileListResult.output;
      console.log(`📊 Analyzing ${filesToAnalyze.length} files with ${CONCURRENCY} parallel workers...`);
      console.log('');

      // 파일 내용 읽기
      const { promises: fs } = await import('fs');
      const filesWithContent = [];
      
      for (const file of filesToAnalyze) {
        try {
          const content = await fs.readFile(file.path, 'utf-8');
          filesWithContent.push({
            path: file.path,
            content: content
          });
        } catch (e) {
          // Skip unreadable files
        }
      }

      if (filesWithContent.length === 0) {
        console.log('❌ No readable files');
        return;
      }

      // AI 분석 실행 - 올바른 API 사용
      const aiAnalysis = await analyzer.analyzeProject(
        TEST_PROJECT.path,
        filesWithContent,  // { path, content } 배열
        CONCURRENCY
      );

      console.log('');
      console.log('✅ AI Analysis completed');
      console.log(`   Average score: ${aiAnalysis.summary.averageScore.toFixed(1)}/100`);
      console.log(`   Excellent files (85+): ${aiAnalysis.summary.excellentSnippets.length}`);
      console.log('');

      // AI 점수 확인
      if (aiAnalysis.results.length > 0) {
        console.log('📋 Individual file scores:');
        aiAnalysis.results.forEach(file => {
          console.log(`   ${file.filePath.split('/').pop()}: ${file.score}/100`);
        });
        console.log('');
      }

      scanResult.aiAnalysis = aiAnalysis;
      scanResult.scores.final = Math.round(aiAnalysis.summary.averageScore * 0.6 + scanResult.scores.pattern * 0.4);

    } catch (aiError) {
      console.log('⚠️ AI Analysis failed:', aiError.message);
      console.log('Continuing with pattern-only scoring...');
      console.log('');
    }
  }

  // BestCase 저장
  if (scanResult && scanResult.patterns) {
    console.log('💾 Saving BestCase...');
    try {
      const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
      
      const sanitizedProjectName = TEST_PROJECT.name.replace(/\//g, '-').replace(/\\/g, '-');
      const bestCaseId = `${sanitizedProjectName}-${TEST_PROJECT.category}-${Date.now()}`;
      
      const bestCase = {
        id: bestCaseId,
        projectName: TEST_PROJECT.name,
        category: TEST_PROJECT.category,
        description: `${TEST_PROJECT.name} Test AI Scan (Score: ${scanResult.scores.final}/100)`,
        files: scanResult.sampleFiles,
        patterns: scanResult.patterns,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['test', 'ai-analysis', new Date().toISOString().split('T')[0]]
        }
      };
      
      await storage.save(bestCase);
      console.log(`✅ BestCase saved: ${bestCaseId}`);
      console.log('');
      
      // 저장 확인
      const loaded = await storage.load(bestCaseId);
      if (loaded) {
        console.log('✅ BestCase file verification successful');
        console.log(`📁 Location: ${BESTCASE_STORAGE_PATH}/${bestCaseId}.json`);
      } else {
        console.log('⚠️ BestCase file not found after save');
      }
      
    } catch (saveError) {
      console.log('❌ BestCase save failed:', saveError.message);
      console.log(saveError.stack);
    }
  }

  console.log('');
  console.log('✨ Test Completed');
}

// 실행
testSingleProject().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

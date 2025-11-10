/**
 * 실제 AI 기반 프로젝트 분석 스크립트
 */

import { CodeAnalyzer } from './packages/llm-analyzer/dist/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';

const PROJECT_NAME = '50.dktechin/frontend';
const projectsBasePath = 'D:/01.Work/01.Projects';
const targetPath = join(projectsBasePath, PROJECT_NAME);

// Ollama 설정
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5-coder:7b'; // GPU로 7B 모델 사용
const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 5; // GPU 사용 시 병렬 처리 개수 증가

console.log('========================================');
console.log('🤖 AI-Powered Code Quality Analysis');
console.log('========================================');
console.log(`📁 Project: ${PROJECT_NAME}`);
console.log(`🧠 LLM: ${LLM_MODEL}`);
console.log(`🔗 Ollama: ${OLLAMA_URL}`);
console.log(`⚡ Concurrency: ${CONCURRENCY} (parallel processing)`);
console.log('========================================\n');

async function analyzeProject() {
  try {
    // 1. CodeAnalyzer 초기화
    console.log('🔧 Initializing AI analyzer...');
    const analyzer = new CodeAnalyzer(OLLAMA_URL, LLM_MODEL);
    
    // 2. Ollama 서버 상태 확인
    console.log('🏥 Checking Ollama health...');
    const isHealthy = await analyzer.healthCheck();
    
    if (!isHealthy) {
      throw new Error('Ollama server is not responding. Please run: docker-compose -f docker-compose.ai.yml up -d');
    }
    
    console.log('✅ Ollama server is healthy\n');
    
    // 3. 사용 가능한 모델 확인
    const models = await analyzer.listModels();
    console.log('📊 Available models:', models.join(', '));
    
    if (!models.includes(LLM_MODEL)) {
      throw new Error(`Model ${LLM_MODEL} not found. Please run: docker exec ollama-code-analyzer ollama pull ${LLM_MODEL}`);
    }
    
    console.log(`✅ Model ${LLM_MODEL} is ready\n`);
    
    // 4. 프로젝트 파일 스캔
    console.log('📂 Scanning project files...');
    
    const composablesPath = join(targetPath, 'composables');
    const pagesPath = join(targetPath, 'pages');
    
    const composableFiles = [];
    const componentFiles = [];
    
    // composables 디렉토리 스캔
    try {
      const composables = await fs.readdir(composablesPath);
      for (const file of composables) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          composableFiles.push(join(composablesPath, file));
        }
      }
      console.log(`  ✓ Found ${composableFiles.length} composable files`);
    } catch (e) {
      console.log('  ⚠️ No composables directory found');
    }
    
    // pages 디렉토리 스캔
    try {
      const pages = await fs.readdir(pagesPath);
      for (const file of pages) {
        if (file.endsWith('.vue')) {
          componentFiles.push(join(pagesPath, file));
        }
      }
      console.log(`  ✓ Found ${componentFiles.length} Vue component files`);
    } catch (e) {
      console.log('  ⚠️ No pages directory found');
    }
    
    console.log('');
    
    // 5. 병렬 파일 분석 (모든 파일)
    const allFiles = [...composableFiles, ...componentFiles];
    
    if (allFiles.length === 0) {
      console.log('⚠️ No files to analyze. Check project path.');
      return;
    }
    
    console.log(`🔍 Analyzing ${allFiles.length} files with ${CONCURRENCY} parallel workers...\n`);
    
    // 파일 내용 읽기
    const filesWithContent = await Promise.all(
      allFiles.map(async (filePath) => {
        const content = await fs.readFile(filePath, 'utf-8');
        return { path: filePath, content };
      })
    );
    
    // 병렬 분석 실행
    const startTime = Date.now();
    const analysisResult = await analyzer.analyzeProject(
      PROJECT_NAME,
      filesWithContent,
      CONCURRENCY
    );
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // 6. 결과 요약
    console.log('\n========================================');
    console.log('📊 Analysis Summary');
    console.log('========================================');
    
    const { results, summary } = analysisResult;
    
    console.log(`Files analyzed: ${summary.totalFiles}`);
    console.log(`Average score: ${summary.averageScore.toFixed(1)}/100`);
    console.log(`Total time: ${totalDuration}s`);
    console.log(`Average time per file: ${(parseFloat(totalDuration) / summary.totalFiles).toFixed(1)}s`);
    console.log('');
    
    // Top 5 파일
    console.log('🏆 Top 5 files:');
    summary.topFiles.forEach((file, idx) => {
      const fileName = file.path.split(/[\\/]/).pop();
      console.log(`  ${idx + 1}. ${fileName}: ${file.score}/100`);
    });
    console.log('');
    
    // 우수 코드 스니펫
    if (summary.excellentSnippets.length > 0) {
      console.log(`🌟 Excellent code patterns found (${summary.excellentSnippets.length}):`);
      summary.excellentSnippets.forEach(snippet => {
        const fileName = snippet.filePath.split(/[\\/]/).pop();
        console.log(`  - ${fileName} (${snippet.score}/100): ${snippet.reason}`);
      });
      console.log('');
    }
    
    // 성능 통계
    console.log('⚡ Performance:');
    console.log(`  Concurrency: ${CONCURRENCY} parallel workers`);
    console.log(`  Throughput: ${(summary.totalFiles / parseFloat(totalDuration)).toFixed(2)} files/sec`);
    console.log(`  Speedup: ~${CONCURRENCY}x faster than sequential`);
    console.log('');
    
    console.log('✨ Analysis completed!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check Ollama is running: docker ps');
    console.error('2. Check model is downloaded: docker exec ollama-code-analyzer ollama list');
    console.error('3. Pull model if needed: docker exec ollama-code-analyzer ollama pull qwen2.5-coder:7b');
    process.exit(1);
  }
}

analyzeProject();

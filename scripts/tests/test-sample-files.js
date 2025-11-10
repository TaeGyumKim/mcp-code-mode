import { CodeAnalyzer } from './packages/llm-analyzer/dist/index.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PROJECTS_BASE_PATH = '/projects';
const OLLAMA_URL = 'http://ollama-code-analyzer:11434';
const LLM_MODEL = 'qwen2.5-coder:7b';
const CONCURRENCY = 2;
const MAX_FILES_PER_PROJECT = 6; // 프로젝트당 최대 6개 파일만 분석

async function testSampleFiles() {
  console.log('=== Testing 8 Projects (Sample Files) ===\n');
  
  const targetProjects = [
    '50.dktechin/frontend',
    '00.common/frontend_work-dir', 
    '01.GCCare/GCCareGit',
    '03.nuxt3_starter',
    '30.samsung-gpt/frontend',
    '39.scbank-vault/frontend',
    '43.catholic-erp/frontend',
    '49.airian/frontend'
  ];
  
  const analyzer = new CodeAnalyzer({
    ollamaUrl: OLLAMA_URL,
    model: LLM_MODEL,
    concurrency: CONCURRENCY
  });
  
  const allResults = {};
  
  for (const projectPath of targetProjects) {
    const fullPath = join(PROJECTS_BASE_PATH, projectPath);
    console.log(`\n📁 Analyzing: ${projectPath}`);
    console.log(`   Path: ${fullPath}`);
    console.log('─'.repeat(60));
    
    try {
      // pages와 components 디렉토리 찾기
      const targetDirs = [];
      const pagesDir = join(fullPath, 'pages');
      const componentsDir = join(fullPath, 'components');
      
      if (existsSync(pagesDir)) targetDirs.push(pagesDir);
      if (existsSync(componentsDir)) targetDirs.push(componentsDir);
      
      if (targetDirs.length === 0) {
        console.log('⚠️  No pages or components directory found');
        allResults[projectPath] = [];
        continue;
      }
      
      // 파일 목록 수집 (샘플만)
      const filePaths = [];
      for (const dir of targetDirs) {
        const collected = collectSampleFiles(dir, MAX_FILES_PER_PROJECT - filePaths.length);
        filePaths.push(...collected);
        if (filePaths.length >= MAX_FILES_PER_PROJECT) break;
      }
      
      console.log(`   Found ${filePaths.length} sample files to analyze`);
      
      // 파일 내용 읽기
      const fileList = [];
      for (const filePath of filePaths) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          fileList.push({ path: filePath, content });
        } catch (err) {
          console.warn(`   ⚠️  Failed to read ${filePath}: ${err.message}`);
        }
      }
      
      if (fileList.length === 0) {
        console.log('   No files to analyze');
        allResults[projectPath] = [];
        continue;
      }
      
      console.log(`   Successfully loaded ${fileList.length} files\n`);
      
      // 분석 실행
      const analysisResult = await analyzer.analyzeProject(projectPath, fileList, CONCURRENCY);
      const results = analysisResult.results;
      
      if (results && results.length > 0) {
        allResults[projectPath] = results;
        
        // 결과 출력
        const sortedResults = results.sort((a, b) => b.score - a.score);
        console.log('\n📊 Analysis Results:');
        sortedResults.forEach(r => {
          const fileName = r.filePath.split('/').pop();
          const emoji = r.score >= 80 ? '🏆' : r.score >= 60 ? '✅' : r.score >= 40 ? '📝' : '⚠️';
          console.log(`  ${emoji} ${fileName}: ${r.score}/100`);
        });
        
        const avgScore = (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1);
        console.log(`\n📊 Average Score: ${avgScore}/100 (${results.length} files)`);
        
      } else {
        console.log('⚠️  No analysis results');
        allResults[projectPath] = [];
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${projectPath}:`, error.message);
      allResults[projectPath] = [];
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY - ALL PROJECTS');
  console.log('='.repeat(80));
  
  for (const [project, results] of Object.entries(allResults)) {
    if (results.length > 0) {
      const scores = results.map(r => r.score);
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      
      console.log(`\n${project}:`);
      console.log(`  Files: ${results.length}, Avg: ${avg}, Range: ${min}-${max}`);
      
      // 점수별 파일 분포
      const ranges = { '80+': 0, '60-79': 0, '40-59': 0, '20-39': 0, '<20': 0 };
      scores.forEach(s => {
        if (s >= 80) ranges['80+']++;
        else if (s >= 60) ranges['60-79']++;
        else if (s >= 40) ranges['40-59']++;
        else if (s >= 20) ranges['20-39']++;
        else ranges['<20']++;
      });
      console.log(`  Distribution: 80+=${ranges['80+']}, 60-79=${ranges['60-79']}, 40-59=${ranges['40-59']}, 20-39=${ranges['20-39']}, <20=${ranges['<20']}`);
      
      // Top 3 files
      const topFiles = results
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(r => `${r.filePath.split('/').pop()} (${r.score})`)
        .join(', ');
      console.log(`  Top 3: ${topFiles}`);
    } else {
      console.log(`\n${project}: No results`);
    }
  }
  
  console.log('\n✅ Test complete\n');
  return allResults;
}

/**
 * 디렉토리에서 샘플 파일 수집 (다양성을 위해 분산 선택)
 */
function collectSampleFiles(dir, maxCount, fileList = []) {
  if (fileList.length >= maxCount) return fileList;
  
  try {
    const items = readdirSync(dir);
    
    // .vue와 .ts 파일 분리
    const vueFiles = [];
    const tsFiles = [];
    const subdirs = [];
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          subdirs.push(fullPath);
        }
      } else if (stat.isFile()) {
        if (item.endsWith('.vue')) vueFiles.push(fullPath);
        else if (item.endsWith('.ts')) tsFiles.push(fullPath);
      }
    }
    
    // Vue와 TS 파일을 균등하게 선택
    const halfCount = Math.floor(maxCount / 2);
    const selectedVue = vueFiles.slice(0, halfCount);
    const selectedTs = tsFiles.slice(0, maxCount - selectedVue.length);
    
    fileList.push(...selectedVue, ...selectedTs);
    
    // 아직 부족하면 하위 디렉토리에서 수집
    if (fileList.length < maxCount && subdirs.length > 0) {
      for (const subdir of subdirs) {
        collectSampleFiles(subdir, maxCount - fileList.length, fileList);
        if (fileList.length >= maxCount) break;
      }
    }
  } catch (err) {
    console.warn(`   ⚠️  Error reading directory ${dir}: ${err.message}`);
  }
  
  return fileList;
}

testSampleFiles().catch(console.error);

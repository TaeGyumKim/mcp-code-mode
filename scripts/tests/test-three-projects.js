import { CodeAnalyzer } from './packages/llm-analyzer/dist/index.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PROJECTS_BASE_PATH = '/projects';
const OLLAMA_URL = 'http://ollama-code-analyzer:11434';
const LLM_MODEL = 'qwen2.5-coder:7b';
const CONCURRENCY = 2;

async function testEightProjects() {
  console.log('=== Testing 8 Projects ===\n');
  
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
  const projectResults = {};
  
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
        projectResults[projectPath] = [];
        continue;
      }
      
      // 파일 목록 수집
      const filePaths = [];
      for (const dir of targetDirs) {
        const collected = collectFiles(dir);
        filePaths.push(...collected);
      }
      
      console.log(`   Found ${filePaths.length} files to analyze`);
      
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
      
      console.log(`   Successfully loaded ${fileList.length} files\n`);
      
      // 분석 실행
      const analysisResult = await analyzer.analyzeProject(projectPath, fileList, CONCURRENCY);
      const results = analysisResult.results;
      
      if (results && results.length > 0) {
        projectResults[projectPath] = results;
        
        // TypeScript 파일들
        const tsFiles = results.filter(r => r.filePath.endsWith('.ts'));
        if (tsFiles.length > 0) {
          console.log('\n📘 TypeScript Files:');
          tsFiles.forEach(r => {
            const fileName = r.filePath.split('/').pop();
            console.log(`  ${fileName}: ${r.score}/100`);
          });
        }
        
        // Vue 파일들
        const vueFiles = results.filter(r => r.filePath.endsWith('.vue'));
        if (vueFiles.length > 0) {
          console.log('\n🎨 Vue Components:');
          vueFiles.forEach(r => {
            const fileName = r.filePath.split('/').pop();
            console.log(`  ${fileName}: ${r.score}/100`);
          });
        }
        
        const avgScore = (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1);
        console.log(`\n📊 Average Score: ${avgScore}/100 (${results.length} files)`);
        
      } else {
        console.log('⚠️  No analysis results');
        projectResults[projectPath] = [];
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${projectPath}:`, error.message);
      projectResults[projectPath] = [];
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  for (const [project, results] of Object.entries(projectResults)) {
    if (results.length > 0) {
      const scores = results.map(r => r.score);
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      console.log(`\n${project}:`);
      console.log(`  Files: ${results.length}, Avg: ${avg}, Range: ${min}-${max}`);
      
      // 점수별 파일 분포
      const ranges = { '90+': 0, '70-89': 0, '50-69': 0, '30-49': 0, '<30': 0 };
      scores.forEach(s => {
        if (s >= 90) ranges['90+']++;
        else if (s >= 70) ranges['70-89']++;
        else if (s >= 50) ranges['50-69']++;
        else if (s >= 30) ranges['30-49']++;
        else ranges['<30']++;
      });
      console.log(`  Distribution: 90+=${ranges['90+']}, 70-89=${ranges['70-89']}, 50-69=${ranges['50-69']}, 30-49=${ranges['30-49']}, <30=${ranges['<30']}`);
    } else {
      console.log(`\n${project}: No results`);
    }
  }
  
  console.log('\n✅ Test complete\n');
  return projectResults;
}

/**
 * 디렉토리에서 .ts, .vue 파일 수집
 */
function collectFiles(dir, fileList = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // node_modules, .nuxt 등 제외
      if (!item.startsWith('.') && item !== 'node_modules') {
        collectFiles(fullPath, fileList);
      }
    } else if (stat.isFile()) {
      if (item.endsWith('.ts') || item.endsWith('.vue')) {
        fileList.push(fullPath);
      }
    }
  }
  
  return fileList;
}

testEightProjects().catch(console.error);

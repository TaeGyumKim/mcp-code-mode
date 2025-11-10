/**
 * AI 기반 자동 프로젝트 스캔 스크립트
 * 기존 스캔 + AI 코드 품질 분석 통합
 */

import { CodeAnalyzer } from '../../packages/llm-analyzer/dist/index.js';
import { runAgentScript } from '../../packages/ai-runner/dist/agentRunner.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { ProjectInfo, AnalysisResult, ScanPatterns } from '../types.js';

const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || 'D:/01.Work/01.Projects';
const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;

// Ollama 설정
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5-coder:7b';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2');

/**
 * 디렉토리가 Nuxt 프로젝트인지 확인
 */
function isNuxtProject(projectPath: string): boolean {
  try {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return false;
    }
    
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    return deps['nuxt'] || deps['nuxt3'] || deps['@nuxt/core'];
  } catch (error) {
    return false;
  }
}

/**
 * 모든 Nuxt 프로젝트 자동 탐색
 */
function findAllNuxtProjects(basePath: string): ProjectInfo[] {
  const nuxtProjects: ProjectInfo[] = [];
  
  try {
    const entries = readdirSync(basePath);
    
    for (const entry of entries) {
      if (entry === '.bestcases' || entry.startsWith('.')) {
        continue;
      }
      
      const fullPath = join(basePath, entry);
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (isNuxtProject(fullPath)) {
            nuxtProjects.push({
              name: entry,
              path: fullPath,
              category: 'auto-scan-ai'
            });
          } else {
            try {
              const subEntries = readdirSync(fullPath);
              for (const subEntry of subEntries) {
                if (subEntry.startsWith('.')) continue;
                
                const subPath = join(fullPath, subEntry);
                try {
                  const subStat = statSync(subPath);
                  if (subStat.isDirectory() && isNuxtProject(subPath)) {
                    nuxtProjects.push({
                      name: entry + '/' + subEntry,
                      path: subPath,
                      category: 'auto-scan-ai'
                    });
                  }
                } catch (err) {
                  // Skip
                }
              }
            } catch (err) {
              // Skip
            }
          }
        }
      } catch (err) {
        continue;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('⚠️ Error scanning projects directory:', errorMessage);
  }
  
  return nuxtProjects;
}

/**
 * AI 분석 수행
 */
async function performAIAnalysis(projectPath: string, projectName: string): Promise<any | null> {
  console.log('\n🤖 Starting AI Code Quality Analysis...');
  
  try {
    const analyzer = new CodeAnalyzer({
      ollamaUrl: OLLAMA_URL,
      model: LLM_MODEL,
      concurrency: CONCURRENCY
    });
    
    // Health check
    const isHealthy = await analyzer.healthCheck();
    if (!isHealthy) {
      console.log('⚠️ Ollama server not available, skipping AI analysis');
      return null;
    }
    
    // 분석할 파일 수집
    const filesToAnalyze: Array<{ path: string; content: string }> = [];
    
    const composablesPath = join(projectPath, 'composables');
    const pagesPath = join(projectPath, 'pages');
    
    // Composables 파일 스캔
    try {
      const composables = await fs.readdir(composablesPath);
      for (const file of composables) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const filePath = join(composablesPath, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            filesToAnalyze.push({ path: filePath, content });
          } catch (e) {
            // Skip
          }
        }
      }
    } catch (e) {
      // No composables
    }
    
    // Pages 파일 스캔 (최대 5개)
    try {
      const pages = await fs.readdir(pagesPath);
      for (const file of pages.slice(0, 5)) {
        if (file.endsWith('.vue')) {
          const filePath = join(pagesPath, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            filesToAnalyze.push({ path: filePath, content });
          } catch (e) {
            // Skip
          }
        }
      }
    } catch (e) {
      // No pages
    }
    
    if (filesToAnalyze.length === 0) {
      console.log('⚠️ No files found for AI analysis');
      return null;
    }
    
    console.log(`📊 Analyzing ${filesToAnalyze.length} files with ${CONCURRENCY} parallel workers...`);
    
    // 최대 20개 파일만 분석
    const filesWithContent = filesToAnalyze.slice(0, 20);
    
    if (filesWithContent.length === 0) {
      console.log('⚠️ No readable files for AI analysis');
      return null;
    }
    
    console.log(`📝 Read ${filesWithContent.length} files successfully\n`);
    
    // 병렬 AI 분석 실행
    const analysisResult = await analyzer.analyzeProject(
      projectPath,
      filesWithContent,
      CONCURRENCY
    ) as AnalysisResult;
    
    const { results, summary } = analysisResult;
    
    console.log(`✅ AI Analysis completed`);
    console.log(`   Average score: ${summary.averageScore.toFixed(1)}/100`);
    console.log(`   Excellent files (85+): ${summary.excellentSnippets?.length || 0}`);
    
    return {
      averageScore: summary.averageScore,
      totalFiles: summary.totalFiles,
      topFiles: summary.topFiles,
      excellentSnippets: summary.excellentSnippets || [],
      detailedResults: results.map(r => ({
        file: r.filePath.split(/[\\/]/).pop(),
        score: r.score,
        category: r.category || 'component',
        strengths: r.strengths || [],
        weaknesses: r.weaknesses || []
      }))
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('⚠️ AI analysis failed:', errorMessage);
    return null;
  }
}

/**
 * 단일 프로젝트 스캔
 */
async function scanProject(project: ProjectInfo): Promise<void> {
  console.log('========================================');
  console.log(`🔍 Scanning: ${project.name}`);
  console.log('========================================');
  
  if (!existsSync(project.path)) {
    console.log('⚠️ Skipping: Path not found');
    console.log('');
    return;
  }
  
  // 1. AI 분석 먼저 수행
  const aiAnalysis = await performAIAnalysis(project.path, project.name);
  
  // 2. 기존 패턴 분석
  const scanCode = `
const PROJECT_NAME = '${project.name}';
const targetPath = '${project.path.replace(/\\/g, '/')}';

try {
  const vueFiles = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*.vue',
    recursive: true
  });

  const tsFiles = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*.ts',
    recursive: true
  });

  const allFiles = [...vueFiles.files, ...tsFiles.files];
  const fileList = allFiles.filter(f => !f.isDirectory);

  console.log(\`📊 Found \${fileList.length} files\`);

  let pkg = {};
  try {
    const pkgContent = await filesystem.readFile({ path: \`\${targetPath}/package.json\` });
    pkg = JSON.parse(pkgContent.content);
  } catch (e) {
    console.log('⚠️ package.json not found');
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const hasGrpc = Object.keys(deps).some(dep => 
    ['grpc', 'proto', '@grpc', 'protobuf'].some(kw => dep.toLowerCase().includes(kw))
  );

  const hasOpenApi = Object.keys(deps).some(dep => 
    ['openapi', 'swagger', '@~/openapi'].some(kw => dep.toLowerCase().includes(kw))
  );

  let framework = 'unknown';
  if (deps['nuxt']) framework = 'Nuxt 3';
  else if (deps['next']) framework = 'Next.js';
  else if (deps['vue']) framework = 'Vue 3';

  const componentUsage = {
    CommonTable: 0,
    CommonPaginationTable: 0,
    CommonButton: 0,
    CommonLayout: 0
  };

  const composableUsage = {
    usePaging: 0,
    useBackendClient: 0,
    useModalState: 0
  };

  for (const file of fileList.slice(0, 20)) {
    try {
      const content = await filesystem.readFile({ path: file.path });
      const text = content.content;
      
      for (const comp of Object.keys(componentUsage)) {
        const matches = text.match(new RegExp(comp, 'g'));
        if (matches) componentUsage[comp] += matches.length;
      }
      
      for (const comp of Object.keys(composableUsage)) {
        const matches = text.match(new RegExp(comp, 'g'));
        if (matches) composableUsage[comp] += matches.length;
      }
    } catch (e) {}
  }

  let hasTailwindConfig = false;
  try {
    await filesystem.readFile({ path: \`\${targetPath}/tailwind.config.js\` });
    hasTailwindConfig = true;
  } catch (e) {
    try {
      await filesystem.readFile({ path: \`\${targetPath}/tailwind.config.ts\` });
      hasTailwindConfig = true;
    } catch (e2) {}
  }

  let apiScore = 0;
  if (hasOpenApi) apiScore += 40;
  else if (hasGrpc) apiScore += 35;

  let componentScore = 0;
  const totalUsage = Object.values(componentUsage).reduce((sum, count) => sum + count, 0);
  componentScore += Math.min(50, totalUsage * 2);
  if (hasTailwindConfig) componentScore += 20;
  componentScore += Object.values(composableUsage).reduce((sum, count) => sum + (count > 0 ? 10 : 0), 0);

  const patternScore = Math.round((apiScore + componentScore) / 2);
  
  console.log(\`📊 Pattern Score: \${patternScore}/100 (API=\${apiScore}, Component=\${componentScore})\`);

  const aiAnalysis = ${JSON.stringify(aiAnalysis)};
  
  let finalScore = patternScore;
  let tier = 'D';
  
  if (aiAnalysis && aiAnalysis.averageScore > 0) {
    finalScore = Math.round(aiAnalysis.averageScore * 0.6 + patternScore * 0.4);
    console.log(\`🤖 AI Score: \${aiAnalysis.averageScore.toFixed(1)}/100\`);
    console.log(\`📊 Final Score: \${finalScore}/100 (AI 60% + Pattern 40%)\`);
  }
  
  if (finalScore >= 80) tier = 'S';
  else if (finalScore >= 60) tier = 'A';
  else if (finalScore >= 40) tier = 'B';
  else if (finalScore >= 20) tier = 'C';

  const patterns = {
    stats: {
      totalFiles: fileList.length,
      vueFiles: vueFiles.files.filter(f => !f.isDirectory).length,
      tsFiles: tsFiles.files.filter(f => !f.isDirectory).length
    },
    apiInfo: {
      hasGrpc,
      hasOpenApi,
      apiType: hasOpenApi ? 'OpenAPI' : (hasGrpc ? 'gRPC' : 'none')
    },
    componentUsage,
    composableUsage,
    tailwindUsage: {
      hasTailwindConfig
    },
    codePatterns: {
      framework,
      usesTypescript: tsFiles.files.filter(f => !f.isDirectory).length > 0
    },
    scores: {
      final: finalScore,
      pattern: patternScore,
      api: apiScore,
      component: componentScore,
      tier
    },
    aiAnalysis: aiAnalysis
  };

  const sampleFiles = [];
  const vueComponents = fileList.filter(f => f.name.endsWith('.vue')).slice(0, 3);
  
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

  return {
    patterns,
    sampleFiles,
    aiAnalysis,
    scores: {
      final: finalScore,
      pattern: patternScore,
      api: apiScore,
      component: componentScore,
      tier
    }
  };

} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('');
  return null;
}
`;

  // 스캔 실행
  let scanResult: any;
  try {
    const result = await runAgentScript({ 
      code: scanCode, 
      timeoutMs: 60000 
    });
    
    if (result.ok && result.output) {
      scanResult = result.output;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('❌ Scan failed:', errorMessage);
    console.log('');
    return;
  }

  // BestCase 저장
  if (scanResult && scanResult.patterns) {
    try {
      const { BestCaseStorage } = await import('../../packages/bestcase-db/dist/index.js');
      const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
      
      const sanitizedProjectName = project.name.replace(/\//g, '-').replace(/\\/g, '-');
      const bestCaseId = `${sanitizedProjectName}-${project.category}-${Date.now()}`;
      
      const bestCase = {
        id: bestCaseId,
        projectName: project.name,
        category: project.category,
        description: `${project.name} AI-Enhanced Scan (Tier ${scanResult.scores.tier}, Score: ${scanResult.scores.final}/100)`,
        files: scanResult.sampleFiles,
        patterns: scanResult.patterns,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['auto-scan', 'ai-analysis', scanResult.scores.tier, scanResult.patterns.codePatterns.framework.toLowerCase(), new Date().toISOString().split('T')[0]]
        }
      };
      
      await storage.save(bestCase);
      console.log(`✅ BestCase saved: ${bestCaseId}`);
      console.log('');
    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
      console.log('❌ BestCase save failed:', errorMessage);
      console.log('');
    }
  }
}

/**
 * 모든 프로젝트 스캔 실행
 */
async function scanAllProjects(): Promise<void> {
  console.log('');
  console.log('🚀 AI-Enhanced Auto BestCase Update');
  console.log('📅 Time: ' + new Date().toISOString());
  console.log('📂 Projects Base: ' + PROJECTS_BASE_PATH);
  console.log('💾 Storage: ' + BESTCASE_STORAGE_PATH);
  console.log('🤖 LLM: ' + LLM_MODEL);
  console.log('⚡ Concurrency: ' + CONCURRENCY);
  console.log('');

  console.log('🔍 Scanning for Nuxt projects...');
  const projects = findAllNuxtProjects(PROJECTS_BASE_PATH);
  console.log(`📊 Found ${projects.length} Nuxt project(s)\n`);

  if (projects.length === 0) {
    console.log('⚠️ No Nuxt projects found');
    return;
  }

  for (const project of projects) {
    await scanProject(project);
  }

  console.log('✨ AI-Enhanced Auto BestCase Update Completed');
  console.log('');
}

// 실행
scanAllProjects().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

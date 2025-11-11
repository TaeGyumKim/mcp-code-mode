/**
 * AI 기반 자동 프로젝트 스캔 스크립트
 * 메타데이터 기반 코드 분석 (Anthropic Code Mode 방식)
 *
 * 변경 사항:
 * - CodeAnalyzer (점수 기반) → MetadataAnalyzer (메타데이터 기반)
 * - 점수 계산 제거 → 구조화된 메타데이터 사용
 * - BestCase patterns.metadata 필드 사용
 */

import { MetadataAnalyzer } from '../../packages/llm-analyzer/dist/index.js';
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
 * AI 기반 메타데이터 추출 + 점수 계산 (MetadataAnalyzer 사용)
 *
 * 프로세스:
 * 1. 메타데이터 추출 (객관적 정보)
 * 2. 메타데이터 기반 점수 계산 (정량화)
 */
async function performMetadataAnalysis(
  projectPath: string,
  projectName: string
): Promise<{
  metadata: any;
  fileResults: any[];
  scores: {
    overall: number;
    average: number;
    tier: string;
    distribution: Record<string, number>;
  };
} | null> {
  console.log('\n🤖 Starting AI Metadata Extraction + Score Calculation...');

  try {
    const analyzer = new MetadataAnalyzer({
      ollamaUrl: OLLAMA_URL,
      model: LLM_MODEL
    });

    // Health check
    const isHealthy = await analyzer.healthCheck();
    if (!isHealthy) {
      console.log('⚠️ Ollama server not available, skipping metadata analysis');
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
      console.log('⚠️ No files found for metadata analysis');
      return null;
    }

    console.log(`📊 Analyzing ${filesToAnalyze.length} files with MetadataAnalyzer...`);

    // 최대 20개 파일만 분석
    const filesWithContent = filesToAnalyze.slice(0, 20);

    if (filesWithContent.length === 0) {
      console.log('⚠️ No readable files for metadata analysis');
      return null;
    }

    console.log(`📝 Read ${filesWithContent.length} files successfully\n`);

    // 1️⃣ 메타데이터 추출 (Ollama LLM 사용)
    console.log('📊 Step 1/2: Extracting metadata...');
    const fileResults = await analyzer.analyzeFilesParallel(filesWithContent, CONCURRENCY);
    const projectMetadata = analyzer['aggregateMetadata'](projectPath, fileResults);

    console.log(`✅ Metadata extraction completed`);
    console.log(`   Patterns: ${projectMetadata.patterns?.join(', ') || 'none'}`);
    console.log(`   Frameworks: ${projectMetadata.frameworks?.join(', ') || 'none'}`);
    console.log(`   API Type: ${projectMetadata.apiType || 'none'}`);
    console.log(`   Complexity: ${projectMetadata.averageComplexity || 'unknown'}`);
    console.log(`   Excellent files: ${projectMetadata.excellentFiles?.length || 0}`);

    // 2️⃣ 메타데이터 기반 점수 계산
    console.log('\n📊 Step 2/2: Calculating scores from metadata...');
    const projectScores = analyzer.calculateProjectScore(projectMetadata, fileResults);
    const tier = analyzer.getTierFromScore(projectScores.overall);

    console.log(`✅ Score calculation completed`);
    console.log(`   Overall: ${projectScores.overall}/100 (Tier ${tier})`);
    console.log(`   Average: ${projectScores.average}/100`);
    console.log(`   Distribution: S=${projectScores.distribution.S}, A=${projectScores.distribution.A}, B=${projectScores.distribution.B}, C=${projectScores.distribution.C}, D=${projectScores.distribution.D}`);

    return {
      metadata: projectMetadata,
      fileResults,
      scores: {
        overall: projectScores.overall,
        average: projectScores.average,
        tier,
        distribution: projectScores.distribution
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('⚠️ Metadata analysis failed:', errorMessage);
    return null;
  }
}

/**
 * 단일 프로젝트 스캔 (메타데이터 기반)
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

  // 1. 메타데이터 추출 + 점수 계산
  const analysisResult = await performMetadataAnalysis(project.path, project.name);

  if (!analysisResult) {
    console.log('⚠️ Skipping: Analysis failed');
    console.log('');
    return;
  }

  const { metadata: projectMetadata, scores } = analysisResult;
  
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

  // 메타데이터 기반 패턴 정보
  const projectMetadata = ${JSON.stringify(projectMetadata)};

  console.log(\`📊 Analysis Results\`);
  if (projectMetadata) {
    console.log(\`   Patterns: \${projectMetadata.patterns?.join(', ') || 'none'}\`);
    console.log(\`   API Type: \${projectMetadata.apiType || 'none'}\`);
    console.log(\`   Complexity: \${projectMetadata.averageComplexity || 'unknown'}\`);
    console.log(\`   Excellent files: \${projectMetadata.excellentFiles?.length || 0}\`);
  }

  // 점수 정보 추가
  const scores = ${JSON.stringify(scores)};
  console.log(\`   Overall Score: \${scores.overall}/100 (Tier \${scores.tier})\`);
  console.log(\`   Distribution: S=\${scores.distribution.S}, A=\${scores.distribution.A}, B=\${scores.distribution.B}, C=\${scores.distribution.C}, D=\${scores.distribution.D}\`);

  const patterns = {
    // ✅ 메타데이터 기반 (권장)
    metadata: projectMetadata || null,
    excellentReasons: projectMetadata?.excellentReasons || [],

    // ⚠️ 하위 호환성: 기본 통계 정보 유지
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
    }
  };

  // 우수 파일 수집 (메타데이터 + 점수 포함)
  const sampleFiles = [];
  const fileResults = ${JSON.stringify(analysisResult.fileResults)};

  // 점수 계산 함수 (Sandbox 내부)
  function calculateFileScore(metadata) {
    const complexityScores = { 'trivial': 20, 'low': 40, 'medium': 60, 'high': 80, 'very-high': 100 };
    const errorHandlingScores = { 'none': 0, 'basic': 50, 'comprehensive': 100 };
    const typeDefinitionsScores = { 'poor': 25, 'basic': 50, 'good': 75, 'excellent': 100 };
    const reusabilityScores = { 'low': 33, 'medium': 66, 'high': 100 };

    const baseScore = (
      complexityScores[metadata.complexity] +
      errorHandlingScores[metadata.errorHandling] +
      typeDefinitionsScores[metadata.typeDefinitions] +
      reusabilityScores[metadata.reusability]
    ) / 4;

    const excellentBonus = metadata.isExcellent ? 10 : 0;
    return Math.round(Math.min(100, Math.max(0, baseScore + excellentBonus)));
  }

  function getTier(score) {
    if (score >= 90) return 'S';
    if (score >= 70) return 'A';
    if (score >= 50) return 'B';
    if (score >= 30) return 'C';
    return 'D';
  }

  // 점수가 높은 파일들을 선별 (70점 이상 또는 excellent 파일)
  const highQualityFiles = fileResults
    .map(file => ({ ...file, score: calculateFileScore(file) }))
    .filter(file => file.score >= 70 || file.isExcellent)
    .sort((a, b) => b.score - a.score)  // 점수 높은 순
    .slice(0, 5);  // 최대 5개

  console.log(\`📁 Found \${highQualityFiles.length} high-quality files (score >= 70)\`);

  for (const fileResult of highQualityFiles) {
    try {
      const content = await filesystem.readFile({ path: fileResult.filePath });

      // 메타데이터를 purpose에 명시
      const metadataInfo = [];
      if (fileResult.patterns && fileResult.patterns.length > 0) {
        metadataInfo.push(\`Patterns: \${fileResult.patterns.join(', ')}\`);
      }
      if (fileResult.apiType && fileResult.apiType !== 'none') {
        metadataInfo.push(\`API: \${fileResult.apiType}\`);
      }
      if (fileResult.frameworks && fileResult.frameworks.length > 0) {
        metadataInfo.push(\`Frameworks: \${fileResult.frameworks.join(', ')}\`);
      }
      if (fileResult.isExcellent) {
        const reasons = fileResult.excellentReasons?.join(', ') || 'Yes';
        metadataInfo.push(\`Excellent: \${reasons}\`);
      }

      sampleFiles.push({
        path: fileResult.filePath.split(/[\\\\/]/).pop(),
        content: content.content.substring(0, 2000),
        purpose: \`Score: \${fileResult.score}/100 (Tier \${getTier(fileResult.score)}) - \${metadataInfo.join(' | ')}\`,
        // ✅ 메타데이터 정보 포함
        metadata: {
          patterns: fileResult.patterns || [],
          frameworks: fileResult.frameworks || [],
          apiType: fileResult.apiType,
          apiMethods: fileResult.apiMethods || [],
          complexity: fileResult.complexity,
          errorHandling: fileResult.errorHandling,
          typeDefinitions: fileResult.typeDefinitions,
          reusability: fileResult.reusability,
          isExcellent: fileResult.isExcellent,
          excellentReasons: fileResult.excellentReasons || []
        },
        // ✅ 점수 정보 포함
        score: fileResult.score,
        tier: getTier(fileResult.score)
      });
    } catch (e) {
      console.log(\`⚠️ Failed to read file: \${fileResult.filePath}\`);
    }
  }

  console.log(\`📁 Selected \${sampleFiles.length} files for BestCase reference\`);

  return {
    patterns,
    sampleFiles,
    metadata: projectMetadata,  // ✅ 프로젝트 메타데이터
    scores: scores               // ✅ 프로젝트 점수
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

  // BestCase 저장 (메타데이터 기반)
  if (scanResult && scanResult.patterns) {
    try {
      const { BestCaseStorage } = await import('../../packages/bestcase-db/dist/index.js');
      const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);

      const sanitizedProjectName = project.name.replace(/\//g, '-').replace(/\\/g, '-');
      const bestCaseId = `${sanitizedProjectName}-${project.category}-${Date.now()}`;

      // 메타데이터 + 점수 기반 설명 생성
      const meta = scanResult.metadata;
      const scores = scanResult.scores;
      let description = `${project.name} - Score: ${scores.overall}/100 (Tier ${scores.tier})`;
      if (meta) {
        if (meta.excellentFiles?.length > 0) {
          description += ` - ${meta.excellentFiles.length} Excellent Files`;
        }
        if (meta.apiType && meta.apiType !== 'none') {
          description += ` - API: ${meta.apiType}`;
        }
      }

      // 메타데이터 + 점수 기반 태그 생성
      const tags = ['auto-scan', 'metadata-based', `tier-${scores.tier.toLowerCase()}`, `score-${Math.floor(scores.overall / 10) * 10}`];
      if (meta) {
        if (meta.excellentFiles?.length > 0) tags.push('has-excellent-files');
        if (meta.averageComplexity) tags.push(`complexity-${meta.averageComplexity}`);
        if (meta.apiType && meta.apiType !== 'none') tags.push(meta.apiType);
        if (meta.frameworks) tags.push(...meta.frameworks.slice(0, 3)); // 처음 3개만
        if (meta.patterns) tags.push(...meta.patterns.slice(0, 3)); // 처음 3개만
      }
      tags.push(new Date().toISOString().split('T')[0]);

      const bestCase = {
        id: bestCaseId,
        projectName: project.name,
        category: project.category,
        description,
        files: scanResult.sampleFiles,
        patterns: {
          ...scanResult.patterns,
          // ✅ 메타데이터 기반 점수 추가
          scores: {
            overall: scores.overall,
            average: scores.average,
            tier: scores.tier,
            distribution: scores.distribution
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [...new Set(tags)]  // 중복 제거
        }
      };

      await storage.save(bestCase);
      console.log(`✅ BestCase saved: ${bestCaseId}`);
      console.log(`   📊 Score: ${scores.overall}/100 (Tier ${scores.tier})`);
      console.log(`   📈 Distribution: S=${scores.distribution.S}, A=${scores.distribution.A}, B=${scores.distribution.B}`);
      if (meta?.excellentFiles?.length > 0) {
        console.log(`   🌟 ${meta.excellentFiles.length} Excellent files found!`);
        console.log(`   Reasons: ${meta.excellentFiles.slice(0, 3).flatMap(f => f.reasons).slice(0, 5).join(', ')}`);
      }
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

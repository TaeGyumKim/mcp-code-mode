/**
 * AI 기반 자동 프로젝트 스캔 + 마이그레이션 스크립트
 *
 * 기능:
 * 1. 기존 BestCase 버전 체크 및 마이그레이션
 * 2. 구버전 BestCase가 있는 프로젝트 재분석
 * 3. 새 프로젝트 스캔 및 BestCase 생성
 *
 * Cronjob에서 사용:
 * 0 3 * * * tsx scripts/scan/auto-scan-with-migration.ts
 */

import {
  MetadataAnalyzer,
  calculateScoresFromMetadata
} from '../../packages/llm-analyzer/dist/index.js';
import {
  BestCaseStorage,
  calculateWeightedScore,
  getExcellentCategories,
  shouldSaveBestCase
} from '../../packages/bestcase-db/dist/index.js';
import { runAgentScript } from '../../packages/ai-runner/dist/agentRunner.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  checkBestCaseVersion,
  migrateBestCase,
  migrateAllBestCases
} from './migrate-bestcases.js';
import type { ProjectInfo } from '../types.js';

const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || '/projects';
const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;

// Ollama 설정
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama-code-analyzer:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5-coder:7b';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2');

// 재분석 설정
const FORCE_REANALYZE = process.env.FORCE_REANALYZE === 'true';
const REANALYZE_OLD_VERSIONS = process.env.REANALYZE_OLD_VERSIONS !== 'false'; // 기본값: true
const MAX_REANALYZE_COUNT = parseInt(process.env.MAX_REANALYZE_COUNT || '10');

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
 * 구버전 BestCase가 있는 프로젝트 찾기
 */
async function findProjectsNeedingReanalysis(): Promise<string[]> {
  const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
  const allCases = await storage.list();

  const projectsToReanalyze = new Set<string>();

  for (const bestCase of allCases) {
    const versionCheck = checkBestCaseVersion(bestCase);

    if (versionCheck.needsMigration) {
      projectsToReanalyze.add(bestCase.projectName);
    }
  }

  return Array.from(projectsToReanalyze);
}

/**
 * 특정 프로젝트의 구버전 BestCase 삭제
 */
async function deleteOldBestCases(projectName: string): Promise<number> {
  const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
  const allCases = await storage.list();

  let deletedCount = 0;

  for (const bestCase of allCases) {
    if (bestCase.projectName === projectName) {
      const versionCheck = checkBestCaseVersion(bestCase);

      if (versionCheck.needsMigration) {
        await storage.delete(bestCase.id);
        deletedCount++;
        console.log(`   🗑️  Deleted old BestCase: ${bestCase.id}`);
      }
    }
  }

  return deletedCount;
}

/**
 * AI 기반 메타데이터 추출 + 점수 계산
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

    // Pages 파일 스캔 (최대 10개)
    try {
      const pages = await fs.readdir(pagesPath);
      for (const file of pages.slice(0, 10)) {
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

    // 1️⃣ 메타데이터 추출 (Ollama LLM 사용)
    console.log('📊 Step 1/2: Extracting metadata...');
    const fileResults = await analyzer.analyzeFilesParallel(filesWithContent, CONCURRENCY);
    const projectMetadata = analyzer['aggregateMetadata'](projectPath, fileResults);

    console.log(`✅ Metadata extraction completed`);
    console.log(`   Patterns: ${projectMetadata.patterns?.join(', ') || 'none'}`);
    console.log(`   Frameworks: ${projectMetadata.frameworks?.join(', ') || 'none'}`);
    console.log(`   API Type: ${projectMetadata.apiType || 'none'}`);

    // 2️⃣ 메타데이터 기반 점수 계산
    console.log('\n📊 Step 2/2: Calculating scores from metadata...');
    const projectScores = analyzer.calculateProjectScore(projectMetadata, fileResults);
    const tier = analyzer.getTierFromScore(projectScores.overall);

    console.log(`✅ Score calculation completed`);
    console.log(`   Overall: ${projectScores.overall}/100 (Tier ${tier})`);
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
 * 단일 프로젝트 스캔 및 BestCase 생성
 */
async function scanAndSaveProject(project: ProjectInfo): Promise<boolean> {
  console.log('========================================');
  console.log(`🔍 Scanning: ${project.name}`);
  console.log('========================================');

  if (!existsSync(project.path)) {
    console.log('⚠️ Skipping: Path not found');
    return false;
  }

  // 메타데이터 추출 + 점수 계산
  const analysisResult = await performMetadataAnalysis(project.path, project.name);

  if (!analysisResult) {
    console.log('⚠️ Skipping: Analysis failed');
    return false;
  }

  const { metadata: projectMetadata, fileResults, scores } = analysisResult;

  // 다차원 점수 계산
  const multiScores = calculateScoresFromMetadata(projectMetadata, true);
  const totalScore = calculateWeightedScore(multiScores);
  const excellentIn = getExcellentCategories(multiScores);

  // 저장 기준 판정
  const saveDecision = shouldSaveBestCase(multiScores);

  if (!saveDecision.shouldSave) {
    console.log(`⏭️  Skipping BestCase (${saveDecision.reason})`);
    console.log(`   📊 Score: ${totalScore}/100`);
    return false;
  }

  // BestCase 저장
  try {
    const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);

    const sanitizedProjectName = project.name.replace(/\//g, '-').replace(/\\/g, '-');
    const bestCaseId = `${sanitizedProjectName}-${project.category}-${Date.now()}`;

    // 설명 생성
    let description = `${project.name} - Score: ${totalScore}/100`;
    if (excellentIn.length > 0) {
      description += ` - Excellent in: ${excellentIn.join(', ')}`;
    }

    // 태그 생성
    const tags = [
      'auto-scan',
      'multi-score',
      'v2.0',
      `score-${Math.floor(totalScore / 10) * 10}`,
      ...excellentIn.map(cat => `excellent-${cat}`),
      new Date().toISOString().split('T')[0]
    ];

    if (projectMetadata) {
      if (projectMetadata.apiType && projectMetadata.apiType !== 'none') {
        tags.push(projectMetadata.apiType);
      }
      if (projectMetadata.designSystem) {
        tags.push(projectMetadata.designSystem);
      }
      if (projectMetadata.frameworks) {
        tags.push(...projectMetadata.frameworks.slice(0, 3));
      }
    }

    // 우수 파일 수집
    const sampleFiles = fileResults
      .filter((f: any) => f.isExcellent || f.score >= 70)
      .slice(0, 5)
      .map((f: any) => ({
        path: f.filePath.split(/[\\/]/).pop(),
        content: f.content?.substring(0, 2000) || '',
        purpose: `Score: ${f.score}/100 - ${f.patterns?.join(', ') || 'general'}`,
        metadata: {
          patterns: f.patterns || [],
          frameworks: f.frameworks || [],
          apiType: f.apiType,
          complexity: f.complexity,
          errorHandling: f.errorHandling,
          typeDefinitions: f.typeDefinitions,
          isExcellent: f.isExcellent
        },
        score: f.score,
        tier: f.tier
      }));

    const bestCase = {
      id: bestCaseId,
      projectName: project.name,
      category: project.category,
      description,
      files: sampleFiles,
      scores: multiScores,
      totalScore,
      excellentIn,
      patterns: {
        metadata: projectMetadata,
        excellentReasons: projectMetadata?.excellentReasons || [],
        scores
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: Array.from(new Set(tags))
      }
    };

    await storage.save(bestCase);
    console.log(`✅ BestCase saved: ${bestCaseId}`);
    console.log(`   📊 Total Score: ${totalScore}/100`);
    console.log(`   🌟 Excellent in: ${excellentIn.join(', ') || 'none'}`);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('❌ BestCase save failed:', errorMessage);
    return false;
  }
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  console.log('');
  console.log('🚀 AI-Enhanced Auto BestCase Scan with Migration');
  console.log('================================================');
  console.log('📅 Time: ' + new Date().toISOString());
  console.log('📂 Projects Base: ' + PROJECTS_BASE_PATH);
  console.log('💾 Storage: ' + BESTCASE_STORAGE_PATH);
  console.log('🤖 LLM: ' + LLM_MODEL);
  console.log('⚡ Concurrency: ' + CONCURRENCY);
  console.log('🔄 Re-analyze Old Versions: ' + REANALYZE_OLD_VERSIONS);
  console.log('🎯 Force Re-analyze: ' + FORCE_REANALYZE);
  console.log('');

  // 1️⃣ 기존 BestCase 버전 체크 및 마이그레이션
  console.log('═══════════════════════════════════════════════════');
  console.log('PHASE 1: BestCase Version Check & Migration');
  console.log('═══════════════════════════════════════════════════');

  const migrationResult = await migrateAllBestCases({ verbose: false });

  // 2️⃣ 구버전 BestCase가 있는 프로젝트 재분석
  if (REANALYZE_OLD_VERSIONS && migrationResult.needsMigration > 0) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 2: Re-analyze Projects with Old BestCases');
    console.log('═══════════════════════════════════════════════════');

    const projectsToReanalyze = await findProjectsNeedingReanalysis();

    if (projectsToReanalyze.length > 0) {
      console.log(`\n🔄 Found ${projectsToReanalyze.length} project(s) needing re-analysis`);

      const projectsToProcess = projectsToReanalyze.slice(0, MAX_REANALYZE_COUNT);
      console.log(`📊 Processing ${projectsToProcess.length} project(s) (max: ${MAX_REANALYZE_COUNT})`);

      for (const projectName of projectsToProcess) {
        console.log(`\n🔍 Re-analyzing: ${projectName}`);

        // 구버전 BestCase 삭제
        const deletedCount = await deleteOldBestCases(projectName);
        console.log(`   🗑️  Deleted ${deletedCount} old BestCase(s)`);

        // 프로젝트 경로 찾기
        const allProjects = findAllNuxtProjects(PROJECTS_BASE_PATH);
        const project = allProjects.find(p => p.name === projectName);

        if (project) {
          // 재분석
          await scanAndSaveProject(project);
        } else {
          console.log(`   ⚠️  Project path not found, skipping re-analysis`);
        }
      }
    } else {
      console.log('\n✅ No projects need re-analysis');
    }
  }

  // 3️⃣ 새 프로젝트 스캔
  console.log('\n═══════════════════════════════════════════════════');
  console.log('PHASE 3: Scan New Projects');
  console.log('═══════════════════════════════════════════════════');

  console.log('\n🔍 Scanning for Nuxt projects...');
  const allProjects = findAllNuxtProjects(PROJECTS_BASE_PATH);
  console.log(`📊 Found ${allProjects.length} Nuxt project(s)\n`);

  if (allProjects.length === 0) {
    console.log('⚠️ No Nuxt projects found');
  } else {
    // 이미 최신 BestCase가 있는 프로젝트 제외
    const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
    const existingCases = await storage.list();

    const projectsWithV2 = new Set<string>();
    for (const bc of existingCases) {
      const version = checkBestCaseVersion(bc);
      if (!version.needsMigration) {
        projectsWithV2.add(bc.projectName);
      }
    }

    const newProjects = allProjects.filter(p => !projectsWithV2.has(p.name));

    console.log(`📊 ${projectsWithV2.size} project(s) already have v2.0 BestCase`);
    console.log(`📊 ${newProjects.length} new project(s) to scan\n`);

    for (const project of newProjects) {
      await scanAndSaveProject(project);
    }
  }

  // 최종 요약
  console.log('\n═══════════════════════════════════════════════════');
  console.log('FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════');

  const finalStorage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
  const finalCases = await finalStorage.list();

  let v2Count = 0;
  let oldCount = 0;
  for (const bc of finalCases) {
    const version = checkBestCaseVersion(bc);
    if (!version.needsMigration) {
      v2Count++;
    } else {
      oldCount++;
    }
  }

  console.log(`📊 Total BestCases: ${finalCases.length}`);
  console.log(`   ✅ v2.0 (current): ${v2Count}`);
  console.log(`   ⚠️  Old versions: ${oldCount}`);

  if (oldCount > 0) {
    console.log(`\n⚠️  ${oldCount} old BestCase(s) remain. Run again or force re-analyze.`);
  } else {
    console.log('\n✅ All BestCases are up to date!');
  }

  console.log('\n✨ AI-Enhanced Auto BestCase Scan Completed');
  console.log('================================================\n');
}

// 실행
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

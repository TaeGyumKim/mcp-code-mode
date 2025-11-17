/**
 * AI 기반 파일 단위 스캔 스크립트 (v3.0 통합)
 *
 * 기존 MetadataAnalyzer의 AI 분석을 유지하면서
 * 파일 단위로 저장합니다 (점수 무관, 모든 파일 저장)
 *
 * 특징:
 * - AI 기반 메타데이터 추출 (Ollama LLM)
 * - 파일 단위 저장 (프로젝트가 아닌 개별 파일)
 * - 점수 필터링 없음 (모든 파일 저장)
 * - 키워드 자동 추출 (검색용)
 * - 모든 폴더 스캔 (pages, components, composables, stores, etc.)
 */

import { promises as fs } from 'fs';
import { join, relative, extname, basename } from 'path';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { MetadataAnalyzer } from '../../packages/llm-analyzer/dist/index.js';
import {
  FileCaseStorage,
  filePathToId,
  inferFileType,
  inferFileRole,
  extractKeywords
} from '../../packages/bestcase-db/dist/index.js';
import { SCORING_VERSION } from '../../packages/llm-analyzer/dist/index.js';
import type { BestCaseScores } from '../../packages/bestcase-db/dist/index.js';

const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || '/projects';
const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5-coder:7b';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2');
const MAX_FILES_PER_PROJECT = parseInt(process.env.MAX_FILES_PER_PROJECT || '50');
const FORCE_REANALYZE = process.env.FORCE_REANALYZE === 'true';

const storage = new FileCaseStorage(BESTCASE_STORAGE_PATH);

interface ScanOptions {
  maxFilesPerProject?: number;
  fileExtensions?: string[];
  foldersToScan?: string[];
}

const DEFAULT_OPTIONS: ScanOptions = {
  maxFilesPerProject: MAX_FILES_PER_PROJECT,
  fileExtensions: ['.vue', '.ts', '.tsx', '.js'],
  foldersToScan: ['pages', 'components', 'composables', 'stores', 'utils', 'helpers', 'api', 'layouts', 'middleware']
};

/**
 * 파일 내용의 해시 계산
 */
function calculateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * 파일이 재분석이 필요한지 확인
 *
 * - FORCE_REANALYZE=true면 무조건 재분석
 * - 기존 FileCase가 없으면 재분석
 * - scoringVersion이 다르면 재분석
 * - 파일 내용이 변경되었으면 재분석
 */
async function checkNeedsReanalysis(
  projectName: string,
  filePath: string,
  content: string
): Promise<{ needsReanalysis: boolean; reason: string }> {
  if (FORCE_REANALYZE) {
    return { needsReanalysis: true, reason: 'force_reanalyze' };
  }

  const id = filePathToId(projectName, filePath);
  const existing = await storage.load(id);

  if (!existing) {
    return { needsReanalysis: true, reason: 'new_file' };
  }

  // scoringVersion 체크
  if (existing.scoringVersion !== SCORING_VERSION) {
    return { needsReanalysis: true, reason: 'version_outdated' };
  }

  // 내용 해시 체크
  const currentHash = calculateContentHash(content);
  const existingHash = (existing.metadata as any).contentHash;

  if (!existingHash || existingHash !== currentHash) {
    return { needsReanalysis: true, reason: 'content_changed' };
  }

  return { needsReanalysis: false, reason: 'up_to_date' };
}

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

    return !!deps['nuxt'] || !!deps['nuxt3'] || !!deps['@nuxt/core'];
  } catch (error) {
    return false;
  }
}

/**
 * 모든 Nuxt 프로젝트 탐색
 */
function findAllNuxtProjects(basePath: string): Array<{ name: string; path: string }> {
  const nuxtProjects: Array<{ name: string; path: string }> = [];

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
            nuxtProjects.push({ name: entry, path: fullPath });
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
                      path: subPath
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
    console.log('⚠️ Error scanning projects directory:', error);
  }

  return nuxtProjects;
}

/**
 * 폴더를 재귀적으로 스캔
 */
async function scanFolderRecursively(
  folderPath: string,
  projectPath: string,
  options: ScanOptions
): Promise<Array<{ relativePath: string; fullPath: string; content: string }>> {
  const files: Array<{ relativePath: string; fullPath: string; content: string }> = [];

  try {
    const entries = await fs.readdir(folderPath);

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') {
        continue;
      }

      const fullPath = join(folderPath, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        const subFiles = await scanFolderRecursively(fullPath, projectPath, options);
        files.push(...subFiles);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();

        if (options.fileExtensions!.includes(ext)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const relativePath = relative(projectPath, fullPath).replace(/\\/g, '/');

            files.push({ relativePath, fullPath, content });
          } catch (error) {
            // Skip unreadable file
          }
        }
      }
    }
  } catch (error) {
    // Skip folder
  }

  return files;
}

/**
 * 프로젝트에서 파일 수집
 */
async function collectFilesFromProject(
  projectPath: string,
  options: ScanOptions = DEFAULT_OPTIONS
): Promise<Array<{ relativePath: string; fullPath: string; content: string }>> {
  const files: Array<{ relativePath: string; fullPath: string; content: string }> = [];

  for (const folder of options.foldersToScan!) {
    const folderPath = join(projectPath, folder);

    if (!existsSync(folderPath)) {
      continue;
    }

    try {
      const folderFiles = await scanFolderRecursively(folderPath, projectPath, options);
      files.push(...folderFiles);

      if (files.length >= options.maxFilesPerProject!) {
        break;
      }
    } catch (error) {
      // Skip folder
    }
  }

  return files.slice(0, options.maxFilesPerProject!);
}

/**
 * 코드에서 엔티티 추출
 */
function extractEntities(content: string): string[] {
  const entities: Set<string> = new Set();

  const interfaceMatches = content.match(/interface\s+([A-Z][a-zA-Z0-9_]*)/g);
  if (interfaceMatches) {
    interfaceMatches.forEach(match => {
      entities.add(match.replace('interface ', ''));
    });
  }

  const typeMatches = content.match(/type\s+([A-Z][a-zA-Z0-9_]*)\s*=/g);
  if (typeMatches) {
    typeMatches.forEach(match => {
      entities.add(match.replace('type ', '').replace(' =', ''));
    });
  }

  const commonEntities = ['User', 'Product', 'Order', 'Category', 'Brand', 'Payment', 'Cart', 'Item', 'Customer', 'Admin'];
  for (const entity of commonEntities) {
    if (content.includes(entity)) {
      entities.add(entity);
    }
  }

  return Array.from(entities);
}

/**
 * 코드에서 API 메서드 추출
 */
function extractApiMethods(content: string): string[] {
  const methods: Set<string> = new Set();

  const grpcMatches = content.match(/client\.([a-zA-Z]+)\s*\(/g);
  if (grpcMatches) {
    grpcMatches.forEach(match => {
      methods.add(`grpc.${match.replace('client.', '').replace('(', '')}`);
    });
  }

  const backendMatches = content.match(/useBackendClient\(\)\.([a-zA-Z]+)/g);
  if (backendMatches) {
    backendMatches.forEach(match => {
      methods.add(`grpc.${match.replace('useBackendClient().', '')}`);
    });
  }

  if (content.includes('axios.get') || content.includes('fetch(')) methods.add('rest.get');
  if (content.includes('axios.post')) methods.add('rest.post');
  if (content.includes('axios.put')) methods.add('rest.put');
  if (content.includes('axios.delete')) methods.add('rest.delete');

  return Array.from(methods);
}

/**
 * 코드에서 사용된 컴포넌트 추출
 */
function extractComponentsUsed(content: string): string[] {
  const components: Set<string> = new Set();

  const elMatches = content.match(/<(El[A-Z][a-zA-Z]+)/g);
  if (elMatches) {
    elMatches.forEach(match => components.add(match.replace('<', '')));
  }

  const customMatches = content.match(/<([A-Z][a-zA-Z]+)(?:\s|>|\/)/g);
  if (customMatches) {
    customMatches.forEach(match => {
      const comp = match.replace('<', '').replace(/[\s>\/]/g, '');
      if (!comp.startsWith('El')) components.add(comp);
    });
  }

  return Array.from(components);
}

/**
 * 코드에서 사용된 composables 추출
 */
function extractComposablesUsed(content: string): string[] {
  const composables: Set<string> = new Set();

  const matches = content.match(/use[A-Z][a-zA-Z]+\s*\(/g);
  if (matches) {
    matches.forEach(match => composables.add(match.replace('(', '').trim()));
  }

  return Array.from(composables);
}

/**
 * AI 메타데이터를 BestCaseScores로 변환
 */
function convertMetadataToScores(metadata: any): BestCaseScores {
  const complexityScores: Record<string, number> = {
    'trivial': 20, 'low': 40, 'medium': 60, 'high': 80, 'very-high': 100
  };
  const errorHandlingScores: Record<string, number> = {
    'none': 30, 'basic': 60, 'comprehensive': 90
  };
  const typeDefinitionsScores: Record<string, number> = {
    'poor': 30, 'basic': 50, 'good': 75, 'excellent': 95
  };
  const reusabilityScores: Record<string, number> = {
    'low': 40, 'medium': 65, 'high': 90
  };

  const baseScore = complexityScores[metadata.complexity] || 50;
  let errorScore = errorHandlingScores[metadata.errorHandling] || 50;
  let typeScore = typeDefinitionsScores[metadata.typeDefinitions] || 50;
  const reuseScore = reusabilityScores[metadata.reusability] || 50;

  // API 점수
  let apiScore = 40;
  if (metadata.apiType === 'grpc') apiScore = 85;
  else if (metadata.apiType === 'rest') apiScore = 70;
  else if (metadata.apiType === 'graphql') apiScore = 75;
  if (metadata.apiMethods && metadata.apiMethods.length > 0) {
    apiScore = Math.min(100, apiScore + metadata.apiMethods.length * 5);
  }

  // 디자인 시스템 점수
  let designScore = 50;
  if (metadata.frameworks && metadata.frameworks.length > 0) {
    designScore = Math.min(100, 50 + metadata.frameworks.length * 10);
  }

  // 유틸리티 점수
  let utilityScore = 50;
  if (metadata.patterns && metadata.patterns.length > 0) {
    utilityScore = Math.min(100, 50 + metadata.patterns.length * 10);
  }

  // 성능 점수
  let performanceScore = baseScore;

  // 우수 파일 보너스
  if (metadata.isExcellent) {
    apiScore = Math.min(100, apiScore + 10);
    errorScore = Math.min(100, errorScore + 10);
    typeScore = Math.min(100, typeScore + 10);
  }

  return {
    structure: Math.min(100, baseScore),
    apiConnection: Math.min(100, apiScore),
    designSystem: Math.min(100, designScore),
    utilityUsage: Math.min(100, utilityScore),
    errorHandling: Math.min(100, errorScore),
    typeUsage: Math.min(100, typeScore),
    stateManagement: Math.min(100, reuseScore),
    performance: Math.min(100, performanceScore)
  };
}

/**
 * 휴리스틱 기반 점수 계산 (AI 분석 실패 시 fallback)
 */
function calculateFallbackScores(
  content: string,
  keywords: string[],
  apiMethods: string[],
  componentsUsed: string[]
): BestCaseScores {
  const lines = content.split('\n').length;
  const lowerContent = content.toLowerCase();

  let structure = 40;
  let apiConnection = 30;
  let designSystem = 30;
  let utilityUsage = 30;
  let errorHandling = 30;
  let typeUsage = 30;
  let stateManagement = 30;
  let performance = 40;

  if (lines > 50 && lines < 500) structure += 20;
  if (content.includes('export default')) structure += 10;
  if (content.includes('<script setup')) structure += 15;

  if (apiMethods.length > 0) apiConnection += apiMethods.length * 10;
  if (keywords.includes('grpc')) apiConnection += 15;

  if (componentsUsed.length > 0) designSystem += componentsUsed.length * 5;

  if (lowerContent.includes('try') && lowerContent.includes('catch')) errorHandling += 25;
  if (content.includes('interface ') || content.includes('type ')) typeUsage += 20;
  if (lowerContent.includes('pinia') || lowerContent.includes('usestore')) stateManagement += 25;
  if (lowerContent.includes('computed')) performance += 15;

  return {
    structure: Math.min(100, structure),
    apiConnection: Math.min(100, apiConnection),
    designSystem: Math.min(100, designSystem),
    utilityUsage: Math.min(100, utilityUsage),
    errorHandling: Math.min(100, errorHandling),
    typeUsage: Math.min(100, typeUsage),
    stateManagement: Math.min(100, stateManagement),
    performance: Math.min(100, performance)
  };
}

/**
 * AI 기반 프로젝트 스캔 (파일 단위 저장)
 *
 * 변경 감지:
 * - 새 파일: AI 분석 후 저장
 * - 변경된 파일: AI 분석 후 저장
 * - scoringVersion 구버전: AI 분석 후 저장
 * - 변경 없음: 스킵
 */
async function scanProjectWithAI(
  projectName: string,
  projectPath: string,
  analyzer: MetadataAnalyzer,
  options: ScanOptions = DEFAULT_OPTIONS
): Promise<{ saved: number; skipped: number; analyzed: number; unchanged: number }> {
  console.log('========================================');
  console.log(`🔍 Scanning: ${projectName}`);
  console.log('========================================');

  const files = await collectFilesFromProject(projectPath, options);
  console.log(`📊 Found ${files.length} files to process`);

  let saved = 0;
  let skipped = 0;
  let analyzed = 0;
  let unchanged = 0;

  // 변경 감지: 분석이 필요한 파일만 필터링
  console.log(`\n🔄 Checking for changes...`);
  const filesToReanalyze: typeof files = [];

  for (const file of files) {
    const check = await checkNeedsReanalysis(projectName, file.relativePath, file.content);
    if (check.needsReanalysis) {
      filesToReanalyze.push(file);
      if (check.reason === 'new_file') {
        console.log(`   📄 New: ${file.relativePath}`);
      } else if (check.reason === 'version_outdated') {
        console.log(`   🔄 Version outdated: ${file.relativePath}`);
      } else if (check.reason === 'content_changed') {
        console.log(`   ✏️  Changed: ${file.relativePath}`);
      } else if (check.reason === 'force_reanalyze') {
        console.log(`   🔃 Force: ${file.relativePath}`);
      }
    } else {
      unchanged++;
    }
  }

  console.log(`\n📊 Change detection summary:`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   Need reanalysis: ${filesToReanalyze.length}`);

  if (filesToReanalyze.length === 0) {
    console.log(`\n✅ All files are up to date, skipping AI analysis`);
    return { saved: 0, skipped: 0, analyzed: 0, unchanged };
  }

  // AI 분석 (변경된 파일만)
  console.log(`\n🤖 Running AI metadata analysis for ${filesToReanalyze.length} files...`);
  const filesToAnalyze = filesToReanalyze.map(f => ({ path: f.fullPath, content: f.content }));

  let aiResults: Map<string, any> = new Map();

  try {
    const results = await analyzer.analyzeFilesParallel(filesToAnalyze, CONCURRENCY);
    analyzed = results.length;

    for (const result of results) {
      aiResults.set(result.filePath, result);
    }

    console.log(`✅ AI analysis completed for ${analyzed} files`);
  } catch (error) {
    console.log(`⚠️ AI analysis failed, using fallback scoring`);
  }

  // 각 파일을 개별적으로 저장
  console.log(`\n💾 Saving files individually (no score filtering)...`);

  for (const file of filesToReanalyze) {
    try {
      const id = filePathToId(projectName, file.relativePath);
      const fileType = inferFileType(file.relativePath);
      const fileRole = inferFileRole(file.relativePath);
      const keywords = extractKeywords(file.content, file.relativePath);
      const entities = extractEntities(file.content);
      const apiMethods = extractApiMethods(file.content);
      const componentsUsed = extractComponentsUsed(file.content);
      const composablesUsed = extractComposablesUsed(file.content);

      // AI 분석 결과가 있으면 사용, 없으면 fallback
      let scores: BestCaseScores;
      let patterns: string[] = [];

      const aiResult = aiResults.get(file.fullPath);
      if (aiResult) {
        scores = convertMetadataToScores(aiResult);
        patterns = aiResult.patterns || [];

        // AI에서 추출한 키워드 추가
        if (aiResult.isExcellent) keywords.push('excellent');
        if (aiResult.apiType === 'grpc') keywords.push('grpc');
        if (aiResult.apiType === 'rest') keywords.push('rest');
      } else {
        scores = calculateFallbackScores(file.content, keywords, apiMethods, componentsUsed);
      }

      // 기존 FileCase가 있으면 createdAt 유지
      const existingCase = await storage.load(id);
      const createdAt = existingCase?.metadata.createdAt || new Date().toISOString();

      const fileCase = {
        id,
        projectName,
        filePath: file.relativePath,
        fileType,
        fileRole,
        content: file.content,
        keywords: Array.from(new Set(keywords)),
        scores,
        scoringVersion: SCORING_VERSION,
        analysis: {
          linesOfCode: file.content.split('\n').length,
          apiMethods,
          componentsUsed,
          composablesUsed,
          patterns,
          entities
        },
        metadata: {
          createdAt,
          updatedAt: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          tags: [fileType, fileRole, ...keywords.slice(0, 5)],
          contentHash: calculateContentHash(file.content)
        }
      };

      await storage.save(fileCase);
      saved++;

      console.log(`✅ ${file.relativePath} (${keywords.slice(0, 3).join(', ')})`);
    } catch (error) {
      skipped++;
      console.log(`❌ ${file.relativePath}`);
    }
  }

  console.log(`\n📊 Project Summary:`);
  console.log(`   Total files: ${files.length}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   AI analyzed: ${analyzed}`);
  console.log(`   Saved: ${saved}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('');

  return { saved, skipped, analyzed, unchanged };
}

/**
 * 모든 프로젝트 스캔
 */
async function scanAllProjects() {
  console.log('🚀 AI-Based File Scan (v3.0 Integration)');
  console.log('==========================================');
  console.log(`Projects Path: ${PROJECTS_BASE_PATH}`);
  console.log(`Storage Path: ${BESTCASE_STORAGE_PATH}`);
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`LLM Model: ${LLM_MODEL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Max Files/Project: ${MAX_FILES_PER_PROJECT}`);
  console.log(`Scoring Version: ${SCORING_VERSION}`);
  console.log('');

  // Ollama 연결 확인
  const analyzer = new MetadataAnalyzer({
    ollamaUrl: OLLAMA_URL,
    model: LLM_MODEL
  });

  console.log('🔌 Checking Ollama connection...');
  const isHealthy = await analyzer.healthCheck();
  if (!isHealthy) {
    console.log('❌ Ollama server not available!');
    console.log('   Make sure Ollama is running at', OLLAMA_URL);
    process.exit(1);
  }
  console.log('✅ Ollama connection OK\n');

  const projects = findAllNuxtProjects(PROJECTS_BASE_PATH);
  console.log(`📦 Found ${projects.length} Nuxt projects\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalAnalyzed = 0;
  let totalUnchanged = 0;

  for (const project of projects) {
    const result = await scanProjectWithAI(project.name, project.path, analyzer);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalAnalyzed += result.analyzed;
    totalUnchanged += result.unchanged;
  }

  console.log('==========================================');
  console.log('🎉 Scan Complete!');
  console.log(`   Total projects: ${projects.length}`);
  console.log(`   Total files unchanged: ${totalUnchanged}`);
  console.log(`   Total files AI-analyzed: ${totalAnalyzed}`);
  console.log(`   Total files saved: ${totalSaved}`);
  console.log(`   Total files skipped: ${totalSkipped}`);
  console.log('==========================================');
}

// CLI 실행
if (process.argv[1]?.includes('scan-files-ai')) {
  scanAllProjects().catch(console.error);
}

export { scanProjectWithAI, scanAllProjects };

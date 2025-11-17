/**
 * 파일 단위 자동 스캔 스크립트 (v3.0)
 *
 * 모든 파일을 개별적으로 저장합니다 (점수 무관)
 * *.vue, *.ts, *.tsx 파일을 모두 포함합니다.
 * 키워드를 자동으로 추출하여 검색 가능하게 합니다.
 */

import { promises as fs } from 'fs';
import { join, relative, extname } from 'path';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import {
  FileCaseStorage,
  filePathToId,
  inferFileType,
  inferFileRole,
  extractKeywords
} from '../../packages/bestcase-db/dist/index.js';
import { SCORING_VERSION } from '../../packages/llm-analyzer/dist/index.js';
import type { BestCaseScores } from '../../packages/bestcase-db/dist/index.js';

const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || 'D:/01.Work/01.Projects';
const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;
const storage = new FileCaseStorage(BESTCASE_STORAGE_PATH);

interface ScanOptions {
  maxFilesPerProject?: number;
  includeNodeModules?: boolean;
  fileExtensions?: string[];
  foldersToScan?: string[];
}

const DEFAULT_OPTIONS: ScanOptions = {
  maxFilesPerProject: 100,
  includeNodeModules: false,
  fileExtensions: ['.vue', '.ts', '.tsx', '.js', '.jsx'],
  foldersToScan: ['pages', 'components', 'composables', 'stores', 'utils', 'helpers', 'api', 'layouts', 'middleware']
};

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
            // 하위 폴더 확인
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
 * 프로젝트 폴더에서 파일 수집
 */
async function collectFilesFromProject(
  projectPath: string,
  options: ScanOptions = DEFAULT_OPTIONS
): Promise<Array<{ relativePath: string; content: string }>> {
  const files: Array<{ relativePath: string; content: string }> = [];

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
 * 폴더를 재귀적으로 스캔
 */
async function scanFolderRecursively(
  folderPath: string,
  projectPath: string,
  options: ScanOptions
): Promise<Array<{ relativePath: string; content: string }>> {
  const files: Array<{ relativePath: string; content: string }> = [];

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

            files.push({ relativePath, content });
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
 * 코드에서 엔티티 추출
 */
function extractEntities(content: string): string[] {
  const entities: Set<string> = new Set();

  // Interface/Type 정의에서 추출
  const interfaceMatches = content.match(/interface\s+([A-Z][a-zA-Z0-9_]*)/g);
  if (interfaceMatches) {
    interfaceMatches.forEach(match => {
      const name = match.replace('interface ', '');
      entities.add(name);
    });
  }

  const typeMatches = content.match(/type\s+([A-Z][a-zA-Z0-9_]*)\s*=/g);
  if (typeMatches) {
    typeMatches.forEach(match => {
      const name = match.replace('type ', '').replace(' =', '');
      entities.add(name);
    });
  }

  // 일반적인 엔티티 패턴
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

  // gRPC 메서드 (client.methodName)
  const grpcMatches = content.match(/client\.([a-zA-Z]+)\s*\(/g);
  if (grpcMatches) {
    grpcMatches.forEach(match => {
      const method = match.replace('client.', '').replace('(', '');
      methods.add(`grpc.${method}`);
    });
  }

  // useBackendClient 메서드
  const backendMatches = content.match(/useBackendClient\(\)\.([a-zA-Z]+)/g);
  if (backendMatches) {
    backendMatches.forEach(match => {
      const method = match.replace('useBackendClient().', '');
      methods.add(`grpc.${method}`);
    });
  }

  // REST API 메서드 (axios, fetch)
  if (content.includes('axios.get') || content.includes('fetch(')) {
    methods.add('rest.get');
  }
  if (content.includes('axios.post')) {
    methods.add('rest.post');
  }
  if (content.includes('axios.put')) {
    methods.add('rest.put');
  }
  if (content.includes('axios.delete')) {
    methods.add('rest.delete');
  }

  return Array.from(methods);
}

/**
 * 코드에서 사용된 컴포넌트 추출
 */
function extractComponentsUsed(content: string): string[] {
  const components: Set<string> = new Set();

  // Element Plus 컴포넌트
  const elMatches = content.match(/<(El[A-Z][a-zA-Z]+)/g);
  if (elMatches) {
    elMatches.forEach(match => {
      const comp = match.replace('<', '');
      components.add(comp);
    });
  }

  // 일반 PascalCase 컴포넌트
  const customMatches = content.match(/<([A-Z][a-zA-Z]+)(?:\s|>|\/)/g);
  if (customMatches) {
    customMatches.forEach(match => {
      const comp = match.replace('<', '').replace(/[\s>\/]/g, '');
      if (!comp.startsWith('El')) {
        components.add(comp);
      }
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
    matches.forEach(match => {
      const name = match.replace('(', '').trim();
      composables.add(name);
    });
  }

  return Array.from(composables);
}

/**
 * 간단한 휴리스틱 기반 점수 계산
 */
function calculateSimpleScores(
  content: string,
  keywords: string[],
  apiMethods: string[],
  componentsUsed: string[],
  composablesUsed: string[]
): BestCaseScores {
  const lines = content.split('\n').length;
  const lowerContent = content.toLowerCase();

  // 기본 점수
  let structure = 40;
  let apiConnection = 30;
  let designSystem = 30;
  let utilityUsage = 30;
  let errorHandling = 30;
  let typeUsage = 30;
  let stateManagement = 30;
  let performance = 40;

  // 구조 점수
  if (lines > 50 && lines < 500) structure += 20;
  if (content.includes('export default')) structure += 10;
  if (content.includes('<script setup')) structure += 15;
  if (content.includes('defineProps')) structure += 5;
  if (content.includes('defineEmits')) structure += 5;

  // API 연결 점수
  if (apiMethods.length > 0) {
    apiConnection += apiMethods.length * 10;
  }
  if (keywords.includes('grpc')) apiConnection += 15;
  if (keywords.includes('rest')) apiConnection += 10;
  if (lowerContent.includes('usegrpc') || lowerContent.includes('useapi')) apiConnection += 10;

  // 디자인 시스템 점수
  if (componentsUsed.length > 0) {
    designSystem += componentsUsed.length * 5;
  }
  if (lowerContent.includes('el-') || lowerContent.includes('eltable')) designSystem += 15;
  if (lowerContent.includes('scss') || lowerContent.includes('style')) designSystem += 10;

  // 유틸리티 점수
  if (composablesUsed.length > 0) {
    utilityUsage += composablesUsed.length * 8;
  }
  if (lowerContent.includes('lodash') || lowerContent.includes('datefns')) utilityUsage += 15;

  // 에러 핸들링 점수
  if (keywords.includes('error-handling')) errorHandling += 30;
  if (lowerContent.includes('try') && lowerContent.includes('catch')) errorHandling += 20;
  if (lowerContent.includes('onerror') || lowerContent.includes('error:')) errorHandling += 10;

  // 타입 사용 점수
  if (content.includes('interface ') || content.includes('type ')) typeUsage += 20;
  if (content.includes(': string') || content.includes(': number')) typeUsage += 15;
  if (!content.includes(': any')) typeUsage += 10;

  // 상태 관리 점수
  if (keywords.includes('state-management')) stateManagement += 20;
  if (lowerContent.includes('pinia') || lowerContent.includes('usestore')) stateManagement += 25;
  if (composablesUsed.some(c => c.startsWith('use'))) {
    stateManagement += 10;
  }

  // 성능 점수
  if (keywords.includes('async')) performance += 10;
  if (lowerContent.includes('computed')) performance += 15;
  if (lowerContent.includes('lazy') || lowerContent.includes('defineasynccomponent')) performance += 15;
  if (lowerContent.includes('memo') || lowerContent.includes('cache')) performance += 10;

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
 * 단일 프로젝트 스캔 (파일 단위 저장)
 */
async function scanProject(
  projectName: string,
  projectPath: string,
  options: ScanOptions = DEFAULT_OPTIONS
): Promise<{ saved: number; skipped: number }> {
  console.log('========================================');
  console.log(`🔍 Scanning: ${projectName}`);
  console.log('========================================');

  const files = await collectFilesFromProject(projectPath, options);

  console.log(`📊 Found ${files.length} files to save`);

  let saved = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const id = filePathToId(projectName, file.relativePath);
      const fileType = inferFileType(file.relativePath);
      const fileRole = inferFileRole(file.relativePath);
      const keywords = extractKeywords(file.content, file.relativePath);
      const entities = extractEntities(file.content);
      const apiMethods = extractApiMethods(file.content);
      const componentsUsed = extractComponentsUsed(file.content);
      const composablesUsed = extractComposablesUsed(file.content);
      const scores = calculateSimpleScores(file.content, keywords, apiMethods, componentsUsed, composablesUsed);

      const fileCase = {
        id,
        projectName,
        filePath: file.relativePath,
        fileType,
        fileRole,
        content: file.content,
        keywords,
        scores,
        scoringVersion: SCORING_VERSION,
        analysis: {
          linesOfCode: file.content.split('\n').length,
          apiMethods,
          componentsUsed,
          composablesUsed,
          patterns: [],  // TODO: 패턴 추출
          entities
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          tags: [fileType, fileRole, ...keywords.slice(0, 5)]
        }
      };

      await storage.save(fileCase);
      saved++;

      console.log(`✅ Saved: ${file.relativePath} (${keywords.join(', ')})`);
    } catch (error) {
      skipped++;
      console.log(`❌ Skipped: ${file.relativePath}`);
    }
  }

  console.log(`\n📊 Project Summary:`);
  console.log(`   Total files: ${files.length}`);
  console.log(`   Saved: ${saved}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('');

  return { saved, skipped };
}

/**
 * 모든 프로젝트 스캔
 */
async function scanAllProjects() {
  console.log('🚀 Starting File-Based BestCase Scan (v3.0)');
  console.log('============================================');
  console.log(`Projects Path: ${PROJECTS_BASE_PATH}`);
  console.log(`Storage Path: ${BESTCASE_STORAGE_PATH}`);
  console.log(`Scoring Version: ${SCORING_VERSION}`);
  console.log('');

  const projects = findAllNuxtProjects(PROJECTS_BASE_PATH);

  console.log(`📦 Found ${projects.length} Nuxt projects\n`);

  let totalSaved = 0;
  let totalSkipped = 0;

  for (const project of projects) {
    const result = await scanProject(project.name, project.path);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
  }

  console.log('============================================');
  console.log('🎉 Scan Complete!');
  console.log(`   Total projects: ${projects.length}`);
  console.log(`   Total files saved: ${totalSaved}`);
  console.log(`   Total files skipped: ${totalSkipped}`);
  console.log('============================================');
}

// CLI 실행
if (process.argv[1]?.includes('scan-files')) {
  scanAllProjects().catch(console.error);
}

export { scanProject, scanAllProjects, collectFilesFromProject };

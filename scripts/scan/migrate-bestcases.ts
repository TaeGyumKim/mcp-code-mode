/**
 * BestCase 버전 체크 및 마이그레이션 스크립트
 *
 * 구버전 BestCase를 감지하고 새 형식(다차원 점수)으로 마이그레이션합니다.
 *
 * 버전 히스토리:
 * - v1.0: 단일 점수 기반 (patterns.score)
 * - v1.5: 메타데이터 기반 (patterns.metadata)
 * - v2.0: 다차원 점수 (scores: BestCaseScores, totalScore, excellentIn)
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  BestCaseStorage,
  calculateWeightedScore,
  getExcellentCategories,
  shouldSaveBestCase
} from '../../packages/bestcase-db/dist/index.js';
import { calculateScoresFromMetadata, SCORING_VERSION } from '../../packages/llm-analyzer/dist/index.js';

const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';

export interface VersionCheckResult {
  id: string;
  version: '1.0' | '1.5' | '2.0' | 'unknown';
  needsMigration: boolean;
  missingFields: string[];
  hasScores: boolean;
  hasMetadata: boolean;
  hasMultiDimensionalScores: boolean;
  scoringVersion?: string;
  scoringVersionOutdated: boolean;
}

export interface MigrationResult {
  id: string;
  success: boolean;
  oldVersion: string;
  newVersion: string;
  changes: string[];
  error?: string;
}

/**
 * BestCase 버전 체크
 */
export function checkBestCaseVersion(bestCase: any): VersionCheckResult {
  const missingFields: string[] = [];
  let version: '1.0' | '1.5' | '2.0' | 'unknown' = 'unknown';

  // 필수 필드 체크
  if (!bestCase.id) missingFields.push('id');
  if (!bestCase.projectName) missingFields.push('projectName');
  if (!bestCase.category) missingFields.push('category');
  if (!bestCase.files) missingFields.push('files');
  if (!bestCase.patterns) missingFields.push('patterns');
  if (!bestCase.metadata) missingFields.push('metadata');

  // 버전별 특성 체크
  const hasScores = !!bestCase.scores &&
    typeof bestCase.scores === 'object' &&
    'structure' in bestCase.scores &&
    'apiConnection' in bestCase.scores;

  const hasMetadata = !!bestCase.patterns?.metadata &&
    typeof bestCase.patterns.metadata === 'object';

  const hasMultiDimensionalScores = hasScores &&
    bestCase.totalScore !== undefined &&
    Array.isArray(bestCase.excellentIn);

  // 버전 판정
  if (hasMultiDimensionalScores) {
    version = '2.0';
  } else if (hasMetadata) {
    version = '1.5';
  } else if (bestCase.patterns?.score !== undefined) {
    version = '1.0';
  }

  // 점수 계산 로직 버전 체크
  const scoringVersion = bestCase.scoringVersion;
  const scoringVersionOutdated = hasScores && scoringVersion !== SCORING_VERSION;

  // 마이그레이션 필요 여부 (형식 또는 점수 로직 버전이 다른 경우)
  const needsMigration = version !== '2.0' || missingFields.length > 0 || scoringVersionOutdated;

  return {
    id: bestCase.id || 'unknown',
    version,
    needsMigration,
    missingFields,
    hasScores,
    hasMetadata,
    hasMultiDimensionalScores,
    scoringVersion,
    scoringVersionOutdated
  };
}

/**
 * 단일 BestCase 마이그레이션
 */
export async function migrateBestCase(bestCase: any): Promise<MigrationResult> {
  const versionCheck = checkBestCaseVersion(bestCase);
  const changes: string[] = [];

  if (!versionCheck.needsMigration) {
    return {
      id: bestCase.id,
      success: true,
      oldVersion: versionCheck.version,
      newVersion: '2.0',
      changes: ['Already up to date']
    };
  }

  try {
    // 1. 메타데이터가 없으면 기본값 생성
    if (!bestCase.patterns) {
      bestCase.patterns = {};
      changes.push('Created patterns object');
    }

    if (!bestCase.patterns.metadata) {
      // v1.0에서 v1.5로 마이그레이션: 기본 메타데이터 생성
      bestCase.patterns.metadata = {
        projectName: bestCase.projectName,
        apiType: bestCase.patterns?.apiInfo?.apiType || 'none',
        frameworks: [],
        patterns: [],
        entities: [],
        totalFiles: bestCase.files?.length || 0,
        averageComplexity: 'medium',
        filesWithGoodErrorHandling: 0,
        filesWithGoodTypes: 0,
        apiMethods: [],
        componentsUsed: []
      };

      // 기존 정보에서 추론
      if (bestCase.patterns?.apiInfo?.hasGrpc) {
        bestCase.patterns.metadata.apiType = 'grpc';
      } else if (bestCase.patterns?.apiInfo?.hasOpenApi) {
        bestCase.patterns.metadata.apiType = 'openapi';
      }

      if (bestCase.patterns?.codePatterns?.framework) {
        bestCase.patterns.metadata.frameworks.push(
          bestCase.patterns.codePatterns.framework
        );
      }

      if (bestCase.patterns?.composableUsage) {
        const usedComposables = Object.entries(bestCase.patterns.composableUsage)
          .filter(([_, count]) => (count as number) > 0)
          .map(([name]) => name);
        bestCase.patterns.metadata.patterns.push(...usedComposables);
      }

      if (bestCase.patterns?.componentUsage) {
        const usedComponents = Object.entries(bestCase.patterns.componentUsage)
          .filter(([_, count]) => (count as number) > 0)
          .map(([name]) => name);
        bestCase.patterns.metadata.componentsUsed.push(...usedComponents);
      }

      changes.push('Generated metadata from legacy fields');
    }

    // 2. 다차원 점수가 없으면 계산
    if (!bestCase.scores || !bestCase.totalScore) {
      const metadata = bestCase.patterns.metadata;

      // 메타데이터 기반 점수 계산
      const multiScores = calculateScoresFromMetadata(metadata, true);

      bestCase.scores = multiScores;
      bestCase.totalScore = calculateWeightedScore(multiScores);
      bestCase.excellentIn = getExcellentCategories(multiScores);

      changes.push(`Calculated multi-dimensional scores: total=${bestCase.totalScore}`);
      changes.push(`Excellent in: ${bestCase.excellentIn.join(', ') || 'none'}`);
    }

    // 3. 메타데이터 필드 보완
    if (!bestCase.metadata) {
      bestCase.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      };
      changes.push('Created metadata object');
    }

    // 4. updatedAt 갱신
    bestCase.metadata.updatedAt = new Date().toISOString();

    // 5. 태그 업데이트
    if (!bestCase.metadata.tags) {
      bestCase.metadata.tags = [];
    }

    const newTags: string[] = [];
    if (!bestCase.metadata.tags.includes('multi-score')) {
      newTags.push('multi-score');
    }
    if (!bestCase.metadata.tags.includes('v2.0')) {
      newTags.push('v2.0');
    }

    // 점수 기반 태그
    const scoreTier = Math.floor(bestCase.totalScore / 10) * 10;
    const scoreTag = `score-${scoreTier}`;
    if (!bestCase.metadata.tags.includes(scoreTag)) {
      newTags.push(scoreTag);
    }

    // 우수 영역 태그
    for (const category of bestCase.excellentIn || []) {
      const excellentTag = `excellent-${category}`;
      if (!bestCase.metadata.tags.includes(excellentTag)) {
        newTags.push(excellentTag);
      }
    }

    if (newTags.length > 0) {
      bestCase.metadata.tags.push(...newTags);
      changes.push(`Added tags: ${newTags.join(', ')}`);
    }

    return {
      id: bestCase.id,
      success: true,
      oldVersion: versionCheck.version,
      newVersion: '2.0',
      changes
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      id: bestCase.id,
      success: false,
      oldVersion: versionCheck.version,
      newVersion: '2.0',
      changes,
      error: errorMessage
    };
  }
}

/**
 * 모든 BestCase 버전 체크 및 마이그레이션
 */
export async function migrateAllBestCases(options: {
  dryRun?: boolean;
  verbose?: boolean;
} = {}): Promise<{
  total: number;
  needsMigration: number;
  migrated: number;
  failed: number;
  skipped: number;
  outdatedScoringVersion: number;
  results: MigrationResult[];
}> {
  const storage = new BestCaseStorage(BESTCASE_STORAGE_PATH);
  const allCases = await storage.list();

  console.log(`\n🔍 Checking ${allCases.length} BestCases for version compatibility...`);
  console.log(`   Current Scoring Version: ${SCORING_VERSION}\n`);

  const results: MigrationResult[] = [];
  let needsMigration = 0;
  let migrated = 0;
  let failed = 0;
  let skipped = 0;
  let outdatedScoringVersion = 0;

  for (const bestCase of allCases) {
    const versionCheck = checkBestCaseVersion(bestCase);

    if (options.verbose) {
      console.log(`📦 ${bestCase.id}`);
      console.log(`   Version: ${versionCheck.version}`);
      console.log(`   Scoring Version: ${versionCheck.scoringVersion || 'N/A'}`);
      console.log(`   Needs Migration: ${versionCheck.needsMigration}`);
      if (versionCheck.scoringVersionOutdated) {
        console.log(`   ⚠️ Scoring version outdated (${versionCheck.scoringVersion} → ${SCORING_VERSION})`);
      }
      if (versionCheck.missingFields.length > 0) {
        console.log(`   Missing Fields: ${versionCheck.missingFields.join(', ')}`);
      }
    }

    if (versionCheck.scoringVersionOutdated) {
      outdatedScoringVersion++;
    }

    if (!versionCheck.needsMigration) {
      skipped++;
      if (options.verbose) {
        console.log(`   ✅ Already v2.0 with current scoring version\n`);
      }
      continue;
    }

    needsMigration++;

    if (options.dryRun) {
      if (versionCheck.scoringVersionOutdated) {
        console.log(`   ⚠️ [DRY RUN] Would re-analyze (scoring version ${versionCheck.scoringVersion || 'N/A'} → ${SCORING_VERSION})`);
      } else {
        console.log(`   ⚠️ [DRY RUN] Would migrate from ${versionCheck.version} to 2.0`);
      }
      continue;
    }

    // 실제 마이그레이션 (형식만 변환, 점수 재계산은 AI 분석 필요)
    const result = await migrateBestCase(bestCase);
    results.push(result);

    if (result.success) {
      // 저장
      await storage.save(bestCase);
      migrated++;
      console.log(`   ✅ Migrated: ${result.changes.join(', ')}`);
    } else {
      failed++;
      console.log(`   ❌ Failed: ${result.error}`);
    }

    if (options.verbose) {
      console.log('');
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Total BestCases: ${allCases.length}`);
  console.log(`   Already up-to-date: ${skipped}`);
  console.log(`   Needs Migration: ${needsMigration}`);
  console.log(`   Outdated Scoring Version: ${outdatedScoringVersion}`);
  if (!options.dryRun) {
    console.log(`   Successfully Migrated: ${migrated}`);
    console.log(`   Failed: ${failed}`);
  } else {
    console.log(`   [DRY RUN] No changes made`);
  }

  if (outdatedScoringVersion > 0) {
    console.log(`\n⚠️ ${outdatedScoringVersion} BestCase(s) need AI re-analysis due to scoring version change.`);
    console.log(`   Run cronjob or manual scan to re-calculate scores with v${SCORING_VERSION} logic.`);
  }

  return {
    total: allCases.length,
    needsMigration,
    migrated,
    failed,
    skipped,
    outdatedScoringVersion,
    results
  };
}

/**
 * CLI 실행
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log('🔄 BestCase Version Migration Tool');
  console.log('===================================');
  console.log(`Storage Path: ${BESTCASE_STORAGE_PATH}`);
  console.log(`Current Scoring Version: ${SCORING_VERSION}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Verbose: ${verbose}`);

  const result = await migrateAllBestCases({ dryRun, verbose });

  if (result.needsMigration > 0 && !dryRun) {
    console.log('\n✅ Migration completed!');
    console.log('Run cronjob or manual scan to re-analyze projects with AI.');
  } else if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply migrations.');
  } else {
    console.log('\n✅ All BestCases are already v2.0!');
  }
}

// CLI로 실행될 때만 main 호출
if (process.argv[1]?.includes('migrate-bestcases')) {
  main().catch(console.error);
}

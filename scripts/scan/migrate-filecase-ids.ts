/**
 * FileCase ID 마이그레이션 스크립트
 *
 * 기존 타임스탬프 기반 ID를 결정적 ID로 마이그레이션합니다.
 *
 * 기존 ID 형식: project--path-to-file-vue-1234567890123
 * 새 ID 형식:   project--path-to-file-vue
 *
 * 사용법:
 *   npx tsx scripts/scan/migrate-filecase-ids.ts --dry-run  # 테스트
 *   npx tsx scripts/scan/migrate-filecase-ids.ts            # 실행
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';

const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';
const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationResult {
  oldId: string;
  newId: string;
  status: 'migrated' | 'skipped' | 'conflict' | 'error';
  message?: string;
}

/**
 * 파일 경로에서 결정적 ID 생성 (새 방식)
 */
function filePathToId(projectName: string, filePath: string): string {
  const sanitizedProject = projectName.replace(/[\/\\]/g, '-');
  const sanitizedPath = filePath.replace(/[\/\\]/g, '-').replace(/\./g, '-');
  return `${sanitizedProject}--${sanitizedPath}`;
}

/**
 * 기존 ID에서 타임스탬프 제거
 *
 * 기존 형식: project--path-to-file-vue-1234567890123
 * 새 형식:   project--path-to-file-vue
 */
function removeTimestampFromId(oldId: string): string | null {
  // 마지막 부분이 13자리 숫자(타임스탬프)인지 확인
  const parts = oldId.split('-');
  const lastPart = parts[parts.length - 1];

  // 13자리 숫자이고 타임스탬프 범위 내 (2020년 이후)
  if (/^\d{13}$/.test(lastPart) && parseInt(lastPart) > 1577836800000) {
    return parts.slice(0, -1).join('-');
  }

  return null; // 타임스탬프 없음
}

async function migrate(): Promise<void> {
  console.log('===========================================');
  console.log('FileCase ID Migration Script (v3.0)');
  console.log('===========================================');
  console.log(`Storage path: ${BESTCASE_STORAGE_PATH}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  // 스토리지 디렉토리 확인
  try {
    await fs.access(BESTCASE_STORAGE_PATH);
  } catch {
    console.log('⚠️  Storage directory not found. Creating...');
    if (!DRY_RUN) {
      await fs.mkdir(BESTCASE_STORAGE_PATH, { recursive: true });
    }
    console.log('✅ No files to migrate.');
    return;
  }

  // 모든 JSON 파일 검색
  const files = await fs.readdir(BESTCASE_STORAGE_PATH);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} FileCase files`);
  console.log('');

  const results: MigrationResult[] = [];
  const newIdMap = new Map<string, string[]>(); // newId -> [oldIds]

  // 1단계: 분석
  console.log('Phase 1: Analyzing files...');
  for (const file of jsonFiles) {
    const oldId = file.replace('.json', '');
    const newId = removeTimestampFromId(oldId);

    if (!newId) {
      // 이미 새 형식 ID
      results.push({
        oldId,
        newId: oldId,
        status: 'skipped',
        message: 'Already using deterministic ID'
      });
      continue;
    }

    // 충돌 감지
    if (!newIdMap.has(newId)) {
      newIdMap.set(newId, []);
    }
    newIdMap.get(newId)!.push(oldId);
  }

  // 2단계: 충돌 해결 및 마이그레이션
  console.log('Phase 2: Migration...');
  for (const file of jsonFiles) {
    const oldId = file.replace('.json', '');
    const newId = removeTimestampFromId(oldId);

    if (!newId) {
      continue; // 이미 처리됨
    }

    const conflictingIds = newIdMap.get(newId)!;

    if (conflictingIds.length > 1) {
      // 충돌: 가장 최신 타임스탬프만 유지
      const timestamps = conflictingIds.map(id => {
        const parts = id.split('-');
        return { id, timestamp: parseInt(parts[parts.length - 1]) };
      }).sort((a, b) => b.timestamp - a.timestamp);

      const latestId = timestamps[0].id;

      if (oldId === latestId) {
        // 최신 파일 유지
        results.push({
          oldId,
          newId,
          status: 'migrated',
          message: `Kept as latest (${timestamps.length} duplicates found)`
        });

        if (!DRY_RUN) {
          const oldPath = join(BESTCASE_STORAGE_PATH, `${oldId}.json`);
          const newPath = join(BESTCASE_STORAGE_PATH, `${newId}.json`);

          // 파일 읽기 및 ID 업데이트
          const content = JSON.parse(await fs.readFile(oldPath, 'utf-8'));
          content.id = newId;

          // 새 파일 저장
          await fs.writeFile(newPath, JSON.stringify(content, null, 2));

          // 구 파일 삭제
          await fs.unlink(oldPath);
        }
      } else {
        // 중복 파일 삭제
        results.push({
          oldId,
          newId,
          status: 'conflict',
          message: `Removed as duplicate (newer version exists: ${latestId})`
        });

        if (!DRY_RUN) {
          const oldPath = join(BESTCASE_STORAGE_PATH, `${oldId}.json`);
          await fs.unlink(oldPath);
        }
      }
    } else {
      // 충돌 없음
      results.push({
        oldId,
        newId,
        status: 'migrated',
        message: 'Renamed to deterministic ID'
      });

      if (!DRY_RUN) {
        const oldPath = join(BESTCASE_STORAGE_PATH, `${oldId}.json`);
        const newPath = join(BESTCASE_STORAGE_PATH, `${newId}.json`);

        // 새 ID로 파일이 이미 존재하는지 확인
        try {
          await fs.access(newPath);
          // 이미 존재: 비교 후 최신 유지
          const oldContent = JSON.parse(await fs.readFile(oldPath, 'utf-8'));
          const existingContent = JSON.parse(await fs.readFile(newPath, 'utf-8'));

          // analyzedAt 비교
          if (new Date(oldContent.analyzedAt) > new Date(existingContent.analyzedAt)) {
            oldContent.id = newId;
            await fs.writeFile(newPath, JSON.stringify(oldContent, null, 2));
          }
          await fs.unlink(oldPath);
        } catch {
          // 새 경로에 파일 없음: 이름 변경
          const content = JSON.parse(await fs.readFile(oldPath, 'utf-8'));
          content.id = newId;
          await fs.writeFile(newPath, JSON.stringify(content, null, 2));
          await fs.unlink(oldPath);
        }
      }
    }
  }

  // 3단계: 결과 보고
  console.log('');
  console.log('===========================================');
  console.log('Migration Results');
  console.log('===========================================');

  const migrated = results.filter(r => r.status === 'migrated');
  const skipped = results.filter(r => r.status === 'skipped');
  const conflicts = results.filter(r => r.status === 'conflict');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ Migrated: ${migrated.length}`);
  console.log(`⏭️  Skipped (already new format): ${skipped.length}`);
  console.log(`🔄 Duplicates removed: ${conflicts.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log('');

  if (migrated.length > 0) {
    console.log('Migrated files:');
    migrated.forEach(r => {
      console.log(`  ${r.oldId} → ${r.newId}`);
      if (r.message) {
        console.log(`    ${r.message}`);
      }
    });
    console.log('');
  }

  if (conflicts.length > 0) {
    console.log('Removed duplicates:');
    conflicts.forEach(r => {
      console.log(`  ${r.oldId}`);
      if (r.message) {
        console.log(`    ${r.message}`);
      }
    });
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(r => {
      console.log(`  ${r.oldId}: ${r.message}`);
    });
    console.log('');
  }

  if (DRY_RUN) {
    console.log('🔍 This was a DRY RUN. No changes were made.');
    console.log('   Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Migration completed successfully.');
  }
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

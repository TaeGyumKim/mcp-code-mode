#!/usr/bin/env tsx
/**
 * BestCase 검증 및 정리 스크립트
 *
 * 기능:
 * 1. .bestcases 디렉토리의 모든 JSON 파일 검사
 * 2. 양식에 맞지 않거나 오래된 BestCase 마이그레이션 또는 삭제
 * 3. 삭제/마이그레이션 로그 출력
 * 4. 백업 기능 지원
 *
 * 환경 변수:
 * - BESTCASE_RETENTION_DAYS: 보존 기간 (기본: 90일, 0이면 무제한)
 * - SKIP_BESTCASE_VALIDATION: true면 검증 생략
 * - BESTCASE_BACKUP_ON_VALIDATE: true면 삭제 전 백업
 * - BESTCASE_MIGRATE_OLD_FORMAT: true면 구 버전 자동 마이그레이션 (기본: true)
 */

import * as fs from 'fs';
import * as path from 'path';

// 환경 변수 읽기
const RETENTION_DAYS = parseInt(process.env.BESTCASE_RETENTION_DAYS || '90');
const SKIP_VALIDATION = process.env.SKIP_BESTCASE_VALIDATION === 'true';
const BACKUP_ON_VALIDATE = process.env.BESTCASE_BACKUP_ON_VALIDATE === 'true';
const MIGRATE_OLD_FORMAT = process.env.BESTCASE_MIGRATE_OLD_FORMAT !== 'false';  // 기본: true

interface BestCaseValidation {
  isValid: boolean;
  needsMigration?: boolean;
  reason?: string;
}

/**
 * 구 버전 BestCase를 새 버전으로 마이그레이션
 */
function migrateLegacyBestCase(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    let modified = false;

    // patterns가 없으면 추가
    if (!data.patterns) {
      data.patterns = {
        metadata: {},
        scores: {}
      };
      modified = true;
    }

    // patterns.metadata가 없으면 추가
    if (!data.patterns.metadata) {
      data.patterns.metadata = {};
      modified = true;
    }

    // patterns.scores가 없으면 추가
    if (!data.patterns.scores) {
      data.patterns.scores = {};
      modified = true;
    }

    // files 배열의 각 항목에 metadata/score 추가
    if (Array.isArray(data.files)) {
      data.files = data.files.map((file: any) => {
        if (!file.metadata) {
          file.metadata = {
            linesOfCode: 0,
            complexity: 0,
            dependencies: []
          };
          modified = true;
        }
        if (typeof file.score !== 'number') {
          file.score = 0;
          modified = true;
        }
        return file;
      });
    }

    // 수정사항이 있으면 파일 저장
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.log(`   ⚠️ 마이그레이션 실패: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * FileCase vs BestCase 구분
 * FileCase: 개별 파일 분석 결과 (filePath, fileType, scores 직접 포함)
 * BestCase: 프로젝트 우수 사례 모음 (category, patterns, files 배열 포함)
 */
function detectFileType(data: any): 'filecase' | 'bestcase' | 'unknown' {
  // FileCase: filePath와 scores가 직접 있음
  if (data.filePath && data.scores && typeof data.scores === 'object') {
    return 'filecase';
  }

  // BestCase: category와 files 배열이 있음
  if (data.category && Array.isArray(data.files)) {
    return 'bestcase';
  }

  return 'unknown';
}

/**
 * FileCase 파일 검증 (개별 파일 분석)
 */
function validateFileCase(data: any, filePath: string): BestCaseValidation {
  // 1. 필수 필드 체크
  if (!data.id || !data.projectName || !data.filePath) {
    return { isValid: false, reason: 'FileCase 필수 필드 누락 (id, projectName, filePath)' };
  }

  // 2. scores 필드 체크
  if (!data.scores || typeof data.scores !== 'object') {
    return { isValid: false, reason: 'FileCase scores 필드 누락 또는 형식 오류' };
  }

  // 3. metadata 필드 체크
  if (!data.metadata || !data.metadata.createdAt) {
    return { isValid: false, reason: 'FileCase metadata 필드 누락' };
  }

  // 4. 날짜 체크 (보존 기간)
  if (RETENTION_DAYS > 0 && data.metadata.createdAt) {
    const createdDate = new Date(data.metadata.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > RETENTION_DAYS) {
      return { isValid: false, reason: `${RETENTION_DAYS}일 이상 오래됨 (${diffDays}일)` };
    }
  }

  return { isValid: true };
}

/**
 * BestCase 파일 검증 (프로젝트 우수 사례)
 */
function validateBestCaseFormat(data: any, filePath: string): BestCaseValidation {
  // 1. 필수 필드 체크
  if (!data.id || !data.projectName || !data.category) {
    return { isValid: false, reason: 'BestCase 필수 필드 누락 (id, projectName, category)' };
  }

  // 2. patterns 구조 체크 (새 버전)
  if (!data.patterns) {
    if (MIGRATE_OLD_FORMAT) {
      return { isValid: true, needsMigration: true, reason: 'patterns 필드 누락 (마이그레이션 필요)' };
    }
    return { isValid: false, reason: 'patterns 필드 누락 (구 버전)' };
  }

  // 3. metadata 필드 체크 (새 버전)
  if (!data.patterns.metadata) {
    if (MIGRATE_OLD_FORMAT) {
      return { isValid: true, needsMigration: true, reason: 'patterns.metadata 필드 누락 (마이그레이션 필요)' };
    }
    return { isValid: false, reason: 'patterns.metadata 필드 누락 (구 버전)' };
  }

  // 4. scores 필드 체크 (새 버전)
  if (!data.patterns.scores) {
    if (MIGRATE_OLD_FORMAT) {
      return { isValid: true, needsMigration: true, reason: 'patterns.scores 필드 누락 (마이그레이션 필요)' };
    }
    return { isValid: false, reason: 'patterns.scores 필드 누락 (구 버전)' };
  }

  // 5. files 배열 체크
  if (!Array.isArray(data.files)) {
    return { isValid: false, reason: 'files 배열 누락' };
  }

  // 6. files에 metadata/score 있는지 체크 (새 버전)
  if (data.files.length > 0) {
    const firstFile = data.files[0];
    if (!firstFile.metadata || typeof firstFile.score !== 'number') {
      if (MIGRATE_OLD_FORMAT) {
        return { isValid: true, needsMigration: true, reason: 'files에 metadata/score 필드 누락 (마이그레이션 필요)' };
      }
      return { isValid: false, reason: 'files에 metadata/score 필드 누락 (구 버전)' };
    }
  }

  // 7. 날짜 체크 (보존 기간)
  if (RETENTION_DAYS > 0 && data.createdAt) {
    const createdDate = new Date(data.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > RETENTION_DAYS) {
      return { isValid: false, reason: `${RETENTION_DAYS}일 이상 오래됨 (${diffDays}일)` };
    }
  }

  return { isValid: true };
}

/**
 * 파일 검증 (FileCase와 BestCase 자동 구분)
 */
function validateBestCase(filePath: string): BestCaseValidation {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const fileType = detectFileType(data);

    if (fileType === 'filecase') {
      return validateFileCase(data, filePath);
    } else if (fileType === 'bestcase') {
      return validateBestCaseFormat(data, filePath);
    } else {
      return { isValid: false, reason: '알 수 없는 파일 형식 (FileCase/BestCase 아님)' };
    }
  } catch (error) {
    return { isValid: false, reason: `JSON 파싱 에러: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 백업 디렉토리 생성 및 파일 백업
 */
function backupBestCase(filePath: string, backupPath: string): boolean {
  try {
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const fileName = path.basename(filePath);
    const backupFilePath = path.join(backupPath, fileName);

    fs.copyFileSync(filePath, backupFilePath);
    return true;
  } catch (error) {
    console.log(`   ⚠️ 백업 실패: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * BestCase 디렉토리 정리
 */
async function cleanBestCases(bestcasePath: string) {
  console.log('='.repeat(60));
  console.log('🔍 BestCase 검증 및 정리 시작');
  console.log('='.repeat(60));
  console.log(`📁 경로: ${bestcasePath}`);
  console.log(`📅 보존 기간: ${RETENTION_DAYS === 0 ? '무제한' : `${RETENTION_DAYS}일`}`);
  console.log(`🔄 마이그레이션: ${MIGRATE_OLD_FORMAT ? '활성화' : '비활성화'}`);
  console.log(`💾 백업: ${BACKUP_ON_VALIDATE ? '활성화' : '비활성화'}`);
  console.log('');

  if (SKIP_VALIDATION) {
    console.log('⏭️ SKIP_BESTCASE_VALIDATION=true → 검증 생략');
    console.log('');
    return { total: 0, deleted: 0, valid: 0, migrated: 0 };
  }

  if (!fs.existsSync(bestcasePath)) {
    console.log('⚠️ BestCase 디렉토리가 존재하지 않습니다. 생성합니다...');
    fs.mkdirSync(bestcasePath, { recursive: true });
    console.log('✅ 디렉토리 생성 완료');
    return { total: 0, deleted: 0, valid: 0, migrated: 0 };
  }

  const files = fs.readdirSync(bestcasePath);
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('index.json'));

  console.log(`📊 총 ${jsonFiles.length}개의 BestCase 파일 발견`);
  console.log('');

  let deletedCount = 0;
  let validCount = 0;
  let migratedCount = 0;
  const deletedFiles: Array<{ file: string; reason: string }> = [];
  const migratedFiles: string[] = [];

  const backupPath = BACKUP_ON_VALIDATE
    ? path.join(path.dirname(bestcasePath), '.bestcases_backup')
    : '';

  for (const file of jsonFiles) {
    const filePath = path.join(bestcasePath, file);
    const validation = validateBestCase(filePath);

    if (validation.needsMigration && MIGRATE_OLD_FORMAT) {
      console.log(`🔄 마이그레이션: ${file}`);
      console.log(`   사유: ${validation.reason}`);

      const success = migrateLegacyBestCase(filePath);
      if (success) {
        migratedCount++;
        migratedFiles.push(file);
        validCount++;
        console.log(`   ✅ 마이그레이션 완료`);
      } else {
        console.log(`   ❌ 마이그레이션 실패 → 삭제`);
        if (BACKUP_ON_VALIDATE) {
          backupBestCase(filePath, backupPath);
        }
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          deletedFiles.push({ file, reason: '마이그레이션 실패' });
        } catch (error) {
          console.log(`   ⚠️ 삭제 실패: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } else if (!validation.isValid) {
      console.log(`❌ 삭제: ${file}`);
      console.log(`   사유: ${validation.reason}`);

      if (BACKUP_ON_VALIDATE) {
        backupBestCase(filePath, backupPath);
      }

      try {
        fs.unlinkSync(filePath);
        deletedCount++;
        deletedFiles.push({ file, reason: validation.reason || '알 수 없음' });
      } catch (error) {
        console.log(`   ⚠️ 삭제 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      validCount++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📈 검증 결과');
  console.log('='.repeat(60));
  console.log(`✅ 유효: ${validCount}개`);
  console.log(`🔄 마이그레이션: ${migratedCount}개`);
  console.log(`❌ 삭제: ${deletedCount}개`);
  console.log('');

  if (migratedFiles.length > 0) {
    console.log('🔄 마이그레이션된 파일 목록:');
    migratedFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');
  }

  if (deletedFiles.length > 0) {
    console.log('🗑️ 삭제된 파일 목록:');
    deletedFiles.forEach(({ file, reason }, index) => {
      console.log(`   ${index + 1}. ${file}`);
      console.log(`      → ${reason}`);
    });
    console.log('');

    if (BACKUP_ON_VALIDATE && backupPath) {
      console.log(`💾 백업 위치: ${backupPath}`);
      console.log('');
    }
  }

  return { total: jsonFiles.length, deleted: deletedCount, valid: validCount, migrated: migratedCount };
}

/**
 * 메인 실행
 */
async function main() {
  const bestcasePath = process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';

  console.log('');
  console.log('🚀 BestCase 검증 도구 시작');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('');

  const result = await cleanBestCases(bestcasePath);

  console.log('='.repeat(60));
  console.log('✨ 검증 완료');
  console.log('='.repeat(60));
  console.log('');

  // Exit Code 규칙:
  // - 0: 유효한 BestCase가 있고 삭제된 파일 없음 → 스캔 불필요
  // - 1: 유효한 BestCase가 없거나 삭제된 파일 있음 → AI 스캔 필요
  // - 2: 실행 중 에러 발생
  const needsScan = result.valid === 0 || result.deleted > 0;

  if (needsScan) {
    if (result.valid === 0) {
      console.log('ℹ️ 유효한 BestCase가 없습니다. AI 스캔이 필요합니다.');
    } else if (result.deleted > 0) {
      console.log(`ℹ️ ${result.deleted}개 파일이 삭제되었습니다. AI 재스캔이 필요합니다.`);
    }
  } else {
    console.log('ℹ️ 모든 BestCase가 유효합니다. AI 스캔을 건너뜁니다.');
    if (result.migrated > 0) {
      console.log(`ℹ️ ${result.migrated}개 파일이 마이그레이션되었습니다.`);
    }
  }
  console.log('');

  process.exit(needsScan ? 1 : 0);
}

main().catch(error => {
  console.error('❌ 에러 발생:', error);
  process.exit(2);
});

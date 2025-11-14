#!/usr/bin/env tsx
/**
 * BestCase 검증 및 정리 스크립트
 *
 * 기능:
 * 1. .bestcases 디렉토리의 모든 JSON 파일 검사
 * 2. 양식에 맞지 않거나 오래된 BestCase 삭제
 * 3. 삭제된 파일 로그 출력
 */

import * as fs from 'fs';
import * as path from 'path';

interface BestCaseValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * BestCase 파일 검증
 */
function validateBestCase(filePath: string): BestCaseValidation {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 1. 필수 필드 체크
    if (!data.id || !data.projectName || !data.category) {
      return { isValid: false, reason: '필수 필드 누락 (id, projectName, category)' };
    }

    // 2. patterns 구조 체크 (새 버전)
    if (!data.patterns) {
      return { isValid: false, reason: 'patterns 필드 누락' };
    }

    // 3. metadata 필드 체크 (새 버전)
    if (!data.patterns.metadata) {
      return { isValid: false, reason: 'patterns.metadata 필드 누락 (구 버전)' };
    }

    // 4. scores 필드 체크 (새 버전)
    if (!data.patterns.scores) {
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
        return { isValid: false, reason: 'files에 metadata/score 필드 누락 (구 버전)' };
      }
    }

    // 7. 날짜 체크 (30일 이상 오래된 경우)
    if (data.createdAt) {
      const createdDate = new Date(data.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        return { isValid: false, reason: `30일 이상 오래됨 (${diffDays}일)` };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: `JSON 파싱 에러: ${error instanceof Error ? error.message : String(error)}` };
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
  console.log('');

  if (!fs.existsSync(bestcasePath)) {
    console.log('⚠️ BestCase 디렉토리가 존재하지 않습니다. 생성합니다...');
    fs.mkdirSync(bestcasePath, { recursive: true });
    console.log('✅ 디렉토리 생성 완료');
    return { total: 0, deleted: 0, valid: 0 };
  }

  const files = fs.readdirSync(bestcasePath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`📊 총 ${jsonFiles.length}개의 BestCase 파일 발견`);
  console.log('');

  let deletedCount = 0;
  let validCount = 0;
  const deletedFiles: Array<{ file: string; reason: string }> = [];

  for (const file of jsonFiles) {
    const filePath = path.join(bestcasePath, file);
    const validation = validateBestCase(filePath);

    if (!validation.isValid) {
      console.log(`❌ 삭제: ${file}`);
      console.log(`   사유: ${validation.reason}`);

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
  console.log(`❌ 삭제: ${deletedCount}개`);
  console.log('');

  if (deletedFiles.length > 0) {
    console.log('🗑️ 삭제된 파일 목록:');
    deletedFiles.forEach(({ file, reason }, index) => {
      console.log(`   ${index + 1}. ${file}`);
      console.log(`      → ${reason}`);
    });
    console.log('');
  }

  return { total: jsonFiles.length, deleted: deletedCount, valid: validCount };
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
      console.log('ℹ️ 삭제된 BestCase가 있습니다. AI 재스캔이 필요합니다.');
    }
  } else {
    console.log('ℹ️ 모든 BestCase가 유효합니다. AI 스캔을 건너뜁니다.');
  }
  console.log('');

  process.exit(needsScan ? 1 : 0);
}

main().catch(error => {
  console.error('❌ 에러 발생:', error);
  process.exit(2);
});

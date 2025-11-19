/**
 * 기존 FileCase의 fileRole 필드 수정
 *
 * 버그: inferFileRole이 'pages/'만 찾고 경로 시작을 못 찾음
 * 결과: 모든 파일이 fileRole = "other"
 *
 * 해결: inferFileRole 수정 후 기존 파일들 업데이트
 */

import { FileCaseStorage, inferFileRole } from '../../packages/bestcase-db/dist/index.js';

const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';

async function fixFileRoles() {
  console.log('📝 FileRole 수정 시작...\n');

  const storage = new FileCaseStorage(BESTCASE_STORAGE_PATH);
  const allCases = await storage.list();

  console.log(`총 ${allCases.length}개 파일 검사 중...\n`);

  let updatedCount = 0;
  const roleChanges: { [key: string]: number } = {};

  for (const fileCase of allCases) {
    // 새로운 fileRole 계산
    const newRole = inferFileRole(fileCase.filePath);

    // 변경 필요한 경우만 업데이트
    if (fileCase.fileRole !== newRole) {
      const oldRole = fileCase.fileRole;

      // 통계 업데이트
      const changeKey = `${oldRole} → ${newRole}`;
      roleChanges[changeKey] = (roleChanges[changeKey] || 0) + 1;

      // FileCase 업데이트
      fileCase.fileRole = newRole;
      await storage.save(fileCase);

      updatedCount++;

      if (updatedCount % 100 === 0) {
        console.log(`진행 중... ${updatedCount}개 업데이트 완료`);
      }
    }
  }

  console.log(`\n✅ 업데이트 완료: ${updatedCount}개 파일 수정\n`);

  if (Object.keys(roleChanges).length > 0) {
    console.log('변경 내역:');
    Object.entries(roleChanges)
      .sort((a, b) => b[1] - a[1])
      .forEach(([change, count]) => {
        console.log(`  ${change.padEnd(30)} ${count.toString().padStart(4)}개`);
      });
  }

  // 최종 통계
  console.log('\n최종 Role 분포:');
  const roleDistribution: { [key: string]: number } = {};
  for (const fileCase of allCases) {
    roleDistribution[fileCase.fileRole] = (roleDistribution[fileCase.fileRole] || 0) + 1;
  }

  Object.entries(roleDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([role, count]) => {
      console.log(`  ${role.padEnd(15)} ${count.toString().padStart(4)}개`);
    });
}

fixFileRoles().catch(console.error);

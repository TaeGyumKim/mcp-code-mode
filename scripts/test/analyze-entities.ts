/**
 * 데이터베이스의 엔티티 데이터 분석
 *
 * 목적: RAG 검색이 0 결과를 반환하는 이유 파악
 */

import { FileCaseStorage } from '../../packages/bestcase-db/dist/index.js';

const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || '/projects';
const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;

async function analyzeEntities() {
  console.log('📊 Entity Analysis Report');
  console.log('='.repeat(80));

  const storage = new FileCaseStorage(BESTCASE_STORAGE_PATH);
  const allCases = await storage.loadAll();

  console.log(`\n총 파일 케이스: ${allCases.length}개\n`);

  // 1. 엔티티 분포 분석
  const entityCounts = new Map<string, number>();
  const filesWithNoEntities: string[] = [];
  const filesWithBadEntities: string[] = [];

  for (const fileCase of allCases) {
    if (!fileCase.analysis.entities || fileCase.analysis.entities.length === 0) {
      filesWithNoEntities.push(fileCase.filePath);
      continue;
    }

    for (const entity of fileCase.analysis.entities) {
      // Windows 경로 패턴 감지 (나쁜 엔티티)
      if (/[A-Z]:\\|\\01\.Work/.test(entity)) {
        filesWithBadEntities.push(fileCase.filePath);
        break;
      }

      entityCounts.set(entity, (entityCounts.get(entity) || 0) + 1);
    }
  }

  console.log('📌 엔티티 없는 파일:', filesWithNoEntities.length);
  console.log('❌ 잘못된 엔티티(Windows 경로):', filesWithBadEntities.length);
  console.log('✅ 정상 엔티티 파일:', allCases.length - filesWithNoEntities.length - filesWithBadEntities.length);

  // 2. 가장 많이 나타나는 엔티티 Top 20
  const sortedEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('\n📋 Top 20 엔티티:\n');
  sortedEntities.forEach(([entity, count], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${entity.padEnd(30)} (${count}개 파일)`);
  });

  // 3. 샘플 파일 5개의 엔티티 상세 출력
  console.log('\n🔍 샘플 파일 엔티티 (최근 5개):\n');
  const recentFiles = allCases.slice(-5);
  recentFiles.forEach((fc, index) => {
    console.log(`${index + 1}. ${fc.filePath}`);
    console.log(`   역할: ${fc.fileRole}`);
    console.log(`   엔티티: ${fc.analysis.entities.join(', ') || '(없음)'}`);
    console.log(`   키워드: ${fc.keywords.slice(0, 5).join(', ')}...`);
    console.log();
  });

  // 4. "Projects" 엔티티 포함 파일 확인
  const filesWithProjects = allCases.filter(fc =>
    fc.analysis.entities.some(e => e.toLowerCase() === 'projects')
  );

  console.log(`📦 "Projects" 엔티티 포함 파일: ${filesWithProjects.length}개`);
  if (filesWithProjects.length > 0) {
    console.log('\n샘플 (최대 5개):');
    filesWithProjects.slice(0, 5).forEach(fc => {
      console.log(`  - ${fc.filePath}`);
      console.log(`    엔티티: [${fc.analysis.entities.join(', ')}]`);
    });
  }

  // 5. "NoticeManagement" 엔티티 포함 파일 확인
  const filesWithNotice = allCases.filter(fc =>
    fc.analysis.entities.some(e => e.toLowerCase().includes('noticemanagement'))
  );

  console.log(`\n📄 "NoticeManagement" 엔티티 포함 파일: ${filesWithNotice.length}개`);
  if (filesWithNotice.length > 0) {
    console.log('\n샘플:');
    filesWithNotice.forEach(fc => {
      console.log(`  - ${fc.filePath}`);
      console.log(`    엔티티: [${fc.analysis.entities.join(', ')}]`);
    });
  }

  // 6. 권장사항
  console.log('\n' + '='.repeat(80));
  console.log('💡 권장사항:\n');

  if (filesWithBadEntities.length > 0) {
    console.log(`❌ ${filesWithBadEntities.length}개 파일에 잘못된 엔티티가 있습니다.`);
    console.log('   → 데이터베이스 재스캔 필요: FORCE_REANALYZE=true npm run scan\n');
  }

  if (filesWithProjects.length > 0) {
    console.log(`⚠️  ${filesWithProjects.length}개 파일에 "Projects" 엔티티가 있습니다.`);
    console.log('   → 서버 재시작 후 재스캔 필요\n');
  }

  if (filesWithNotice.length === 0) {
    console.log('⚠️  "NoticeManagement" 엔티티를 가진 파일이 없습니다.');
    console.log('   → 검색 쿼리가 매칭될 파일이 없음\n');
  }
}

analyzeEntities().catch(console.error);

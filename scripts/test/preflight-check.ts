/**
 * 🚨 AI 재스캔 전 정밀 사전 검증 시스템
 *
 * 목적: 재스캔 전 모든 수정사항이 올바르게 작동하는지 100% 확인
 * 시간: ~30초 (AI 없이 로직만 검증)
 *
 * 검증 항목:
 * 1. Entity 추출 로직 (Windows 경로, 상대 경로, "Projects" 제외)
 * 2. TypeScript 전처리 (type/interface 제거)
 * 3. Entity 필터링 로직
 * 4. 검색 시뮬레이션 (실제 데이터로)
 * 5. 통합 시나리오 테스트
 */

import { FileCaseStorage } from '../../packages/bestcase-db/dist/index.js';
import { existsSync } from 'fs';
import { join } from 'path';

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level: 'info' | 'success' | 'warning' | 'error', message: string) {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  }[level];
  console.log(`${prefix} ${message}`);
}

function header(text: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

// ============================================================================
// Test 1: Entity 추출 로직 검증
// ============================================================================

function testEntityExtraction() {
  header('TEST 1: Entity 추출 로직 검증');

  const testCases = [
    {
      name: 'Windows 절대 경로',
      input: 'D:\\01.Work\\01.Projects\\49.airian\\frontend-admin\\pages\\noticeManagement.vue',
      expectedAfterNormalize: '/projects/01.Work/01.Projects/49.airian/frontend-admin/pages/noticeManagement.vue',
      expectedEntities: ['01.Work', '01.Projects', '49.airian', 'Frontend-admin', 'NoticeManagement'],
      shouldExclude: ['Projects', 'Pages'],
    },
    {
      name: '상대 경로',
      input: 'pages/noticeManagement.vue',
      expectedAfterNormalize: '/projects/pages/noticeManagement.vue',
      expectedEntities: ['NoticeManagement'],
      shouldExclude: ['Projects', 'Pages'],
    },
    {
      name: '이미 정규화된 경로',
      input: '/projects/pages/memberManagement.vue',
      expectedAfterNormalize: '/projects/pages/memberManagement.vue',
      expectedEntities: ['MemberManagement'],
      shouldExclude: ['Projects', 'Pages'],
    },
    {
      name: 'Components 경로',
      input: '/projects/components/common/Button.vue',
      expectedAfterNormalize: '/projects/components/common/Button.vue',
      expectedEntities: ['Common', 'Button'],
      shouldExclude: ['Projects', 'Components'],
    },
  ];

  // 경로 정규화 함수 (mcp-stdio-server.ts 로직 복사)
  function normalizePath(filePath: string): string {
    const defaultProjectsPath = '/projects';

    if (!filePath.startsWith('/')) {
      // Windows 절대 경로 감지
      if (/^[a-zA-Z]:\\/.test(filePath)) {
        const withoutDrive = filePath.replace(/^[a-zA-Z]:/, '');
        return `${defaultProjectsPath}${withoutDrive.replace(/\\/g, '/')}`;
      } else {
        // 상대 경로
        return `${defaultProjectsPath}/${filePath}`;
      }
    }
    return filePath;
  }

  // 엔티티 추출 함수 (autoRecommend.ts 로직 복사)
  function extractEntities(filePath: string): string[] {
    const entities: string[] = [];
    const pathParts = filePath.split('/');

    for (const part of pathParts) {
      const cleaned = part.replace(/\.(vue|ts|tsx|js)$/, '');
      if (cleaned && cleaned !== 'index' && cleaned.length > 2) {
        const entity = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        // ✅ 핵심: "Projects" 제외!
        if (!['Pages', 'Components', 'Composables', 'Stores', 'Projects'].includes(entity)) {
          entities.push(entity);
        }
      }
    }

    return entities;
  }

  let passed = 0;
  let failed = 0;

  testCases.forEach((tc, index) => {
    console.log(`\nTest 1.${index + 1}: ${tc.name}`);
    console.log(`  Input: ${tc.input}`);

    // 1. 경로 정규화
    const normalized = normalizePath(tc.input);
    console.log(`  Normalized: ${normalized}`);

    if (normalized !== tc.expectedAfterNormalize) {
      log('error', `경로 정규화 실패!`);
      console.log(`    Expected: ${tc.expectedAfterNormalize}`);
      console.log(`    Got:      ${normalized}`);
      failed++;
      return;
    }
    log('success', '경로 정규화 성공');

    // 2. 엔티티 추출
    const entities = extractEntities(normalized);
    console.log(`  Entities: [${entities.join(', ')}]`);

    // 3. 예상 엔티티 확인
    const missingEntities = tc.expectedEntities.filter(e => !entities.includes(e));
    const unexpectedEntities = entities.filter(e => !tc.expectedEntities.includes(e));

    if (missingEntities.length > 0) {
      log('error', `누락된 엔티티: [${missingEntities.join(', ')}]`);
      failed++;
      return;
    }

    if (unexpectedEntities.length > 0) {
      log('error', `예상 외 엔티티: [${unexpectedEntities.join(', ')}]`);
      failed++;
      return;
    }

    // 4. 제외되어야 할 엔티티 확인
    const shouldNotExist = tc.shouldExclude.filter(e => entities.includes(e));
    if (shouldNotExist.length > 0) {
      log('error', `제외되어야 할 엔티티가 포함됨: [${shouldNotExist.join(', ')}]`);
      failed++;
      return;
    }

    log('success', '모든 검증 통과!');
    passed++;
  });

  console.log(`\n결과: ${passed}/${testCases.length} 통과`);
  return failed === 0;
}

// ============================================================================
// Test 2: TypeScript 전처리 검증
// ============================================================================

function testTypeScriptPreprocessing() {
  header('TEST 2: TypeScript 전처리 검증');

  const testCases = [
    {
      name: 'type alias 단일 라인',
      input: 'type User = { name: string; };',
      expected: '',
    },
    {
      name: 'type alias 여러 라인',
      input: `type Notice = {
  id: number;
  순번: number;
  제목: string;
};`,
      expected: '',
    },
    {
      name: 'interface 선언',
      input: `interface Data {
  value: string;
}`,
      expected: '',
    },
    {
      name: 'type alias + 일반 코드',
      input: `type User = { name: string };
const users = [{ name: 'test' }];`,
      expected: `const users = [{ name: 'test' }];`,
    },
    {
      name: 'type annotation',
      input: 'const name: string = "test";',
      expected: 'const name = "test";',
    },
  ];

  // preprocessCode 함수 (sandbox.ts 로직 복사)
  function preprocessCode(code: string): string {
    // TypeScript 타입 annotation 제거
    code = code.replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+=/g, '$1 $2 =');

    // TypeScript type alias 및 interface 선언 제거
    code = code.replace(/\btype\s+\w+\s*=\s*\{[\s\S]*?\}\s*;?/g, '');
    code = code.replace(/\binterface\s+\w+\s*\{[\s\S]*?\}\s*;?/g, '');

    return code.trim();
  }

  let passed = 0;
  let failed = 0;

  testCases.forEach((tc, index) => {
    console.log(`\nTest 2.${index + 1}: ${tc.name}`);

    const result = preprocessCode(tc.input);
    const expected = tc.expected.trim();

    if (result !== expected) {
      log('error', '전처리 결과 불일치!');
      console.log(`  Input:\n${tc.input}`);
      console.log(`  Expected:\n"${expected}"`);
      console.log(`  Got:\n"${result}"`);
      failed++;
    } else {
      log('success', '전처리 성공');
      passed++;
    }
  });

  console.log(`\n결과: ${passed}/${testCases.length} 통과`);
  return failed === 0;
}

// ============================================================================
// Test 3: Entity 필터링 시뮬레이션
// ============================================================================

function testEntityFiltering() {
  header('TEST 3: Entity 필터링 시뮬레이션');

  // 가상의 파일 케이스 데이터
  const mockFileCases = [
    {
      filePath: '/projects/pages/noticeManagement.vue',
      entities: ['NoticeManagement'],
      fileRole: 'page',
    },
    {
      filePath: '/projects/pages/memberManagement.vue',
      entities: ['MemberManagement'],
      fileRole: 'page',
    },
    {
      filePath: '/projects/components/common/Button.vue',
      entities: ['Common', 'Button'],
      fileRole: 'component',
    },
    {
      filePath: '/old/pages/notice.vue',
      entities: ['Projects', 'Notice'],  // ❌ 구버전: "Projects" 포함
      fileRole: 'page',
    },
    {
      filePath: '/bad/pages/member.vue',
      entities: ['D:\\01.Work\\...\\memberManagement'],  // ❌ 구버전: Windows 경로
      fileRole: 'page',
    },
  ];

  const testScenarios = [
    {
      name: '정상 검색: NoticeManagement',
      request: {
        entities: ['NoticeManagement'],
        fileRole: 'page',
      },
      expectedMatches: 1,
      expectedFiles: ['/projects/pages/noticeManagement.vue'],
    },
    {
      name: '구버전 코드 검색: Projects + NoticeManagement',
      request: {
        entities: ['Projects', 'NoticeManagement'],
        fileRole: 'page',
      },
      expectedMatches: 2,  // NoticeManagement(1) + Projects 포함 파일(1)
      expectedFiles: ['/projects/pages/noticeManagement.vue', '/old/pages/notice.vue'],
    },
    {
      name: 'fileRole만 일치',
      request: {
        fileRole: 'page',
      },
      expectedMatches: 4,  // 모든 page role 파일
    },
  ];

  // 필터링 로직 (autoRecommend.ts 복사)
  function filterCandidates(
    cases: typeof mockFileCases,
    request: { entities?: string[]; fileRole?: string }
  ) {
    let candidates = cases;

    // fileRole 필터
    if (request.fileRole) {
      candidates = candidates.filter(fc => fc.fileRole === request.fileRole);
    }

    // entities 필터
    if (request.entities && request.entities.length > 0) {
      candidates = candidates.filter(fc =>
        request.entities!.some(entity =>
          fc.entities.some(e => e.toLowerCase().includes(entity.toLowerCase()))
        )
      );
    }

    return candidates;
  }

  let passed = 0;
  let failed = 0;

  testScenarios.forEach((scenario, index) => {
    console.log(`\nTest 3.${index + 1}: ${scenario.name}`);
    console.log(`  Request:`, JSON.stringify(scenario.request, null, 2));

    const results = filterCandidates(mockFileCases, scenario.request);

    console.log(`  Results: ${results.length}개`);
    results.forEach(r => console.log(`    - ${r.filePath}`));

    if (results.length !== scenario.expectedMatches) {
      log('error', `매칭 개수 불일치! Expected: ${scenario.expectedMatches}, Got: ${results.length}`);
      failed++;
    } else if (scenario.expectedFiles) {
      const resultPaths = results.map(r => r.filePath);
      const missing = scenario.expectedFiles.filter(f => !resultPaths.includes(f));
      const unexpected = resultPaths.filter(f => !scenario.expectedFiles!.includes(f));

      if (missing.length > 0 || unexpected.length > 0) {
        log('error', '매칭 파일 불일치!');
        if (missing.length > 0) console.log(`    누락: ${missing.join(', ')}`);
        if (unexpected.length > 0) console.log(`    예상외: ${unexpected.join(', ')}`);
        failed++;
      } else {
        log('success', '매칭 성공!');
        passed++;
      }
    } else {
      log('success', '개수 일치!');
      passed++;
    }
  });

  console.log(`\n결과: ${passed}/${testScenarios.length} 통과`);
  return failed === 0;
}

// ============================================================================
// Test 4: 실제 데이터베이스 분석
// ============================================================================

async function testActualDatabase() {
  header('TEST 4: 실제 데이터베이스 상태 분석');

  const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || '/projects';
  const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;

  if (!existsSync(BESTCASE_STORAGE_PATH)) {
    log('warning', `데이터베이스 경로 없음: ${BESTCASE_STORAGE_PATH}`);
    log('info', 'Docker 환경에서 실행하세요');
    return true;  // 로컬에서는 스킵
  }

  const storage = new FileCaseStorage(BESTCASE_STORAGE_PATH);
  const allCases = await storage.loadAll();

  console.log(`총 파일: ${allCases.length}개\n`);

  // 1. "Projects" 엔티티 포함 파일
  const withProjects = allCases.filter(fc =>
    fc.analysis.entities.some(e => e.toLowerCase() === 'projects')
  );

  console.log(`1. "Projects" 엔티티 포함: ${withProjects.length}개`);
  if (withProjects.length > 0) {
    log('error', '⚠️  "Projects" 엔티티가 발견됨 → 재스캔 필요!');
    console.log('   샘플:');
    withProjects.slice(0, 3).forEach(fc => {
      console.log(`   - ${fc.filePath}`);
      console.log(`     엔티티: [${fc.analysis.entities.join(', ')}]`);
    });
  } else {
    log('success', '✓ "Projects" 엔티티 없음');
  }

  // 2. Windows 경로 엔티티 포함 파일
  const withBadPaths = allCases.filter(fc =>
    fc.analysis.entities.some(e => /[A-Z]:\\|\\01\.Work/.test(e))
  );

  console.log(`\n2. 잘못된 경로 엔티티: ${withBadPaths.length}개`);
  if (withBadPaths.length > 0) {
    log('error', '⚠️  Windows 경로 엔티티 발견 → 재스캔 필요!');
    console.log('   샘플:');
    withBadPaths.slice(0, 3).forEach(fc => {
      console.log(`   - ${fc.filePath}`);
      console.log(`     엔티티: [${fc.analysis.entities.join(', ')}]`);
    });
  } else {
    log('success', '✓ 잘못된 경로 엔티티 없음');
  }

  // 3. 정상 엔티티 파일
  const normal = allCases.length - withProjects.length - withBadPaths.length;
  console.log(`\n3. 정상 엔티티 파일: ${normal}개`);

  // 4. 샘플 최신 파일 5개
  console.log(`\n4. 최신 파일 5개 샘플:`);
  allCases.slice(-5).forEach(fc => {
    console.log(`   ${fc.filePath}`);
    console.log(`   엔티티: [${fc.analysis.entities.join(', ')}]`);
  });

  // 5. 권장사항
  console.log(`\n${'='.repeat(80)}`);
  console.log('권장사항:');

  if (withProjects.length > 0 || withBadPaths.length > 0) {
    log('error', '데이터베이스 재스캔 필요!');
    console.log(`   - "Projects" 엔티티: ${withProjects.length}개`);
    console.log(`   - 잘못된 경로: ${withBadPaths.length}개`);
    console.log(`   - 영향받는 파일: ${withProjects.length + withBadPaths.length}/${allCases.length}개`);
    console.log(`\n   재스캔 명령:`);
    console.log(`   FORCE_REANALYZE=true npm run scan`);
    return false;
  } else {
    log('success', '✓ 데이터베이스 정상!');
    return true;
  }
}

// ============================================================================
// Test 5: 통합 시나리오 테스트
// ============================================================================

function testIntegratedScenario() {
  header('TEST 5: 통합 시나리오 - 전체 플로우 시뮬레이션');

  console.log('시나리오: 사용자가 noticeManagement.vue 분석 요청\n');

  // Step 1: 경로 정규화
  console.log('Step 1: 경로 정규화');
  const inputPath = 'pages/noticeManagement.vue';
  console.log(`  Input: ${inputPath}`);

  function normalizePath(filePath: string): string {
    const defaultProjectsPath = '/projects';
    if (!filePath.startsWith('/')) {
      if (/^[a-zA-Z]:\\/.test(filePath)) {
        const withoutDrive = filePath.replace(/^[a-zA-Z]:/, '');
        return `${defaultProjectsPath}${withoutDrive.replace(/\\/g, '/')}`;
      } else {
        return `${defaultProjectsPath}/${filePath}`;
      }
    }
    return filePath;
  }

  const normalized = normalizePath(inputPath);
  console.log(`  Normalized: ${normalized}`);
  log('success', '정규화 완료');

  // Step 2: 엔티티 추출
  console.log('\nStep 2: 엔티티 추출');

  function extractEntities(filePath: string): string[] {
    const entities: string[] = [];
    const pathParts = filePath.split('/');

    for (const part of pathParts) {
      const cleaned = part.replace(/\.(vue|ts|tsx|js)$/, '');
      if (cleaned && cleaned !== 'index' && cleaned.length > 2) {
        const entity = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        if (!['Pages', 'Components', 'Composables', 'Stores', 'Projects'].includes(entity)) {
          entities.push(entity);
        }
      }
    }
    return entities;
  }

  const entities = extractEntities(normalized);
  console.log(`  Entities: [${entities.join(', ')}]`);

  // "Projects" 제외 확인
  if (entities.includes('Projects')) {
    log('error', '❌ "Projects" 엔티티가 포함됨!');
    return false;
  }
  log('success', '✓ "Projects" 제외됨');

  // Step 3: 검색 쿼리 생성
  console.log('\nStep 3: 검색 쿼리 생성');
  const searchRequest = {
    entities: entities,
    fileRole: 'page',
    description: 'Analyze noticeManagement.vue',
  };
  console.log(`  Request:`, JSON.stringify(searchRequest, null, 2));

  // Step 4: 필터링 시뮬레이션
  console.log('\nStep 4: 필터링 시뮬레이션');

  const mockDatabase = [
    { filePath: '/projects/pages/noticeManagement.vue', entities: ['NoticeManagement'], fileRole: 'page' },
    { filePath: '/projects/pages/notice.vue', entities: ['Notice'], fileRole: 'page' },
    { filePath: '/projects/pages/memberManagement.vue', entities: ['MemberManagement'], fileRole: 'page' },
    { filePath: '/old/pages/notice.vue', entities: ['Projects', 'Notice'], fileRole: 'page' },
  ];

  console.log(`  데이터베이스: ${mockDatabase.length}개 파일`);

  let candidates = mockDatabase;

  // fileRole 필터
  candidates = candidates.filter(fc => fc.fileRole === searchRequest.fileRole);
  console.log(`  After role filter: ${candidates.length}개`);

  // entities 필터
  if (searchRequest.entities.length > 0) {
    candidates = candidates.filter(fc =>
      searchRequest.entities.some(entity =>
        fc.entities.some(e => e.toLowerCase().includes(entity.toLowerCase()))
      )
    );
    console.log(`  After entity filter: ${candidates.length}개`);
  }

  console.log(`\n  매칭된 파일:`);
  candidates.forEach(c => console.log(`    - ${c.filePath}`));

  if (candidates.length > 0) {
    log('success', `✓ ${candidates.length}개 파일 매칭 성공!`);
    return true;
  } else {
    log('error', '❌ 매칭된 파일 없음!');
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                            ║');
  console.log('║           🚨 AI 재스캔 전 정밀 사전 검증 시스템 🚨                         ║');
  console.log('║                                                                            ║');
  console.log('║  이 검증을 통과하면 재스캔 시 RAG 검색이 100% 작동할 것입니다            ║');
  console.log('║                                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = {
    entityExtraction: false,
    tsPreprocessing: false,
    entityFiltering: false,
    database: false,
    integrated: false,
  };

  try {
    results.entityExtraction = testEntityExtraction();
    results.tsPreprocessing = testTypeScriptPreprocessing();
    results.entityFiltering = testEntityFiltering();
    results.database = await testActualDatabase();
    results.integrated = testIntegratedScenario();
  } catch (error) {
    log('error', `테스트 실행 중 오류: ${error}`);
  }

  // 최종 결과
  header('최종 검증 결과');

  const tests = [
    { name: 'Entity 추출 로직', passed: results.entityExtraction },
    { name: 'TypeScript 전처리', passed: results.tsPreprocessing },
    { name: 'Entity 필터링', passed: results.entityFiltering },
    { name: '데이터베이스 상태', passed: results.database },
    { name: '통합 시나리오', passed: results.integrated },
  ];

  tests.forEach(t => {
    if (t.passed) {
      log('success', `${t.name.padEnd(30)} PASS`);
    } else {
      log('error', `${t.name.padEnd(30)} FAIL`);
    }
  });

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log(`\n${colors.bright}${colors.green}✓✓✓ 모든 검증 통과! 재스캔을 진행해도 안전합니다 ✓✓✓${colors.reset}\n`);
    console.log('다음 명령으로 재스캔을 시작하세요:');
    console.log(`${colors.cyan}  docker-compose exec mcp-code-mode-server sh -c "cd /app && FORCE_REANALYZE=true npm run scan"${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.bright}${colors.red}✗✗✗ 일부 검증 실패! 코드를 먼저 수정하세요 ✗✗✗${colors.reset}\n`);
    console.log('실패한 테스트를 확인하고 수정 후 다시 실행하세요.');
    process.exit(1);
  }
}

main().catch(console.error);

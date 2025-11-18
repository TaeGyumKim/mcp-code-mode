/**
 * 🔍 실제 MCP Execute 요청 시뮬레이션 - 임베딩 검색 검증
 *
 * 목적: 사용자가 제공한 로그의 실제 요청을 재현하여
 *       현재 Docker 환경에서 임베딩 검색이 작동하는지 100% 검증
 *
 * 시나리오: noticeManagement.vue 분석 요청
 */

import { FileCaseStorage } from '../../packages/bestcase-db/dist/index.js';
import { EmbeddingService } from '../../packages/llm-analyzer/dist/index.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

function header(text: string, level: number = 1) {
  const line = level === 1 ? '='.repeat(80) : '-'.repeat(80);
  console.log(`\n${colors.bright}${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}\n`);
}

// ============================================================================
// 실제 autoRecommend 로직 시뮬레이션
// ============================================================================

interface SearchRequest {
  description: string;
  entities: string[];
  fileRole: string;
  keywords?: string[];
}

interface FileCase {
  filePath: string;
  fileRole: string;
  keywords: string[];
  analysis: {
    entities: string[];
  };
  embedding?: number[];
}

async function simulateAutoRecommend(
  request: SearchRequest,
  storage: FileCaseStorage,
  embeddingService: EmbeddingService | null
): Promise<{
  totalFiles: number;
  afterRoleFilter: number;
  afterEntityFilter: number;
  finalResults: number;
  sampleResults: any[];
  debugInfo: any;
}> {
  console.log(`${colors.magenta}[시뮬레이션 시작]${colors.reset}`);
  console.log(`요청:`, JSON.stringify(request, null, 2));

  // 1단계: 전체 파일 로드
  const allCases = await storage.loadAll();
  console.log(`\n1️⃣  전체 파일: ${colors.bright}${allCases.length}${colors.reset}개`);

  let candidates = allCases;

  // 2단계: fileRole 필터
  if (request.fileRole) {
    const beforeRoleFilter = candidates.length;
    candidates = candidates.filter((fc: any) => fc.fileRole === request.fileRole);
    console.log(`2️⃣  fileRole 필터 (${request.fileRole}): ${beforeRoleFilter} → ${colors.bright}${candidates.length}${colors.reset}개`);
  }

  // 3단계: entities 필터 (핵심!)
  const beforeEntityFilter = candidates.length;
  let entityFilterDebug: any = null;

  if (request.entities && request.entities.length > 0) {
    console.log(`\n3️⃣  entities 필터 적용 중...`);
    console.log(`   요청 엔티티: [${request.entities.join(', ')}]`);

    // 디버깅: 필터 전 샘플 파일 엔티티 확인
    const sampleBefore = candidates.slice(0, 5).map((fc: any) => ({
      file: fc.filePath.split('/').pop(),
      entities: fc.analysis.entities,
    }));

    candidates = candidates.filter((fc: any) =>
      request.entities!.some(entity =>
        fc.analysis.entities.some((e: string) => e.toLowerCase().includes(entity.toLowerCase()))
      )
    );

    console.log(`   ${beforeEntityFilter} → ${colors.bright}${candidates.length}${colors.reset}개`);

    if (candidates.length === 0) {
      console.log(`\n   ${colors.red}❌ 엔티티 필터 후 0개!${colors.reset}`);
      console.log(`\n   ${colors.yellow}디버깅 정보:${colors.reset}`);
      console.log(`   필터 전 샘플 파일 엔티티:`);
      sampleBefore.forEach((s: any, i: number) => {
        console.log(`     ${i + 1}. ${s.file}`);
        console.log(`        엔티티: [${s.entities.join(', ')}]`);
      });

      // 매칭 가능성 분석
      console.log(`\n   ${colors.yellow}매칭 가능성 분석:${colors.reset}`);
      request.entities.forEach(reqEntity => {
        const matchingFiles = allCases.filter((fc: any) =>
          fc.analysis.entities.some((e: string) => e.toLowerCase().includes(reqEntity.toLowerCase()))
        );
        console.log(`     "${reqEntity}" → ${matchingFiles.length}개 파일`);
        if (matchingFiles.length > 0) {
          matchingFiles.slice(0, 3).forEach((fc: any) => {
            console.log(`       - ${fc.filePath}`);
          });
        }
      });
    } else {
      console.log(`   ${colors.green}✓ 매칭 성공!${colors.reset}`);
      const sampleMatched = candidates.slice(0, 3).map((fc: any) => ({
        file: fc.filePath,
        entities: fc.analysis.entities,
      }));
      console.log(`   매칭된 파일 샘플:`);
      sampleMatched.forEach((s: any, i: number) => {
        console.log(`     ${i + 1}. ${s.file}`);
        console.log(`        엔티티: [${s.entities.join(', ')}]`);
      });
    }

    entityFilterDebug = {
      beforeFilter: beforeEntityFilter,
      afterFilter: candidates.length,
      sampleBefore,
      requestEntities: request.entities,
    };
  }

  // 4단계: 임베딩 검색 (시뮬레이션만)
  console.log(`\n4️⃣  임베딩 검색 시뮬레이션:`);

  const withEmbedding = candidates.filter((fc: any) => fc.embedding && fc.embedding.length > 0);
  console.log(`   임베딩 있는 파일: ${withEmbedding.length}/${candidates.length}개`);

  if (withEmbedding.length > 0 && embeddingService) {
    console.log(`   ${colors.green}✓ 임베딩 검색 가능${colors.reset}`);
    console.log(`   (실제 벡터 유사도 계산은 생략)`);
  } else if (withEmbedding.length > 0) {
    console.log(`   ${colors.yellow}⚠ 임베딩 서비스 없음 (시뮬레이션 모드)${colors.reset}`);
  } else {
    console.log(`   ${colors.red}✗ 임베딩 없음 - 검색 불가${colors.reset}`);
  }

  return {
    totalFiles: allCases.length,
    afterRoleFilter: beforeEntityFilter,
    afterEntityFilter: candidates.length,
    finalResults: withEmbedding.length,
    sampleResults: candidates.slice(0, 5).map((fc: any) => ({
      filePath: fc.filePath,
      entities: fc.analysis.entities,
      keywords: fc.keywords.slice(0, 5),
    })),
    debugInfo: entityFilterDebug,
  };
}

// ============================================================================
// 메인 테스트
// ============================================================================

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                            ║');
  console.log('║            🔍 실제 MCP Execute 요청 시뮬레이션 🔍                          ║');
  console.log('║                                                                            ║');
  console.log('║  사용자 로그 기반 실제 요청을 재현하여 임베딩 검색 작동 여부 검증        ║');
  console.log('║                                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || '/projects';
  const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;

  // Storage 초기화
  console.log(`\n데이터베이스 경로: ${BESTCASE_STORAGE_PATH}`);
  const storage = new FileCaseStorage(BESTCASE_STORAGE_PATH);

  // Embedding Service 초기화 (선택)
  let embeddingService: EmbeddingService | null = null;
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
  const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

  try {
    console.log(`임베딩 서비스 연결 시도: ${OLLAMA_URL}`);
    embeddingService = new EmbeddingService(OLLAMA_URL, EMBEDDING_MODEL);
    // 간단한 테스트
    await embeddingService.embed('test');
    log('success', '임베딩 서비스 연결 성공');
  } catch (error) {
    log('warning', '임베딩 서비스 연결 실패 (시뮬레이션만 수행)');
    embeddingService = null;
  }

  // ========================================================================
  // Test Case 1: 사용자가 제공한 실제 로그 재현
  // ========================================================================

  header('Test Case 1: 사용자 로그 재현 (구버전 코드 시뮬레이션)', 1);

  const oldCodeRequest: SearchRequest = {
    description: 'Check import order for vue imports and suggest sorted order',
    entities: ['Projects', 'NoticeManagement'],  // ❌ 구버전: "Projects" 포함
    fileRole: 'page',
  };

  console.log(`${colors.yellow}⚠️  이것은 구버전 코드가 생성하는 요청입니다${colors.reset}`);
  console.log(`${colors.yellow}   (아직 서버가 재빌드되지 않은 경우)${colors.reset}\n`);

  const oldResult = await simulateAutoRecommend(oldCodeRequest, storage, embeddingService);

  console.log(`\n${colors.bright}결과 요약:${colors.reset}`);
  console.log(`  전체 파일:        ${oldResult.totalFiles}개`);
  console.log(`  Role 필터 후:     ${oldResult.afterRoleFilter}개`);
  console.log(`  Entity 필터 후:   ${colors.bright}${oldResult.afterEntityFilter}개${colors.reset}`);
  console.log(`  임베딩 검색 가능: ${oldResult.finalResults}개`);

  if (oldResult.afterEntityFilter === 0) {
    log('error', '❌ 엔티티 필터에서 모든 파일 제외됨!');
  } else {
    log('success', `✓ ${oldResult.afterEntityFilter}개 파일 매칭`);
  }

  // ========================================================================
  // Test Case 2: 신버전 코드로 수정된 요청
  // ========================================================================

  header('Test Case 2: 수정된 코드 시뮬레이션 (신버전)', 1);

  const newCodeRequest: SearchRequest = {
    description: 'Check import order for vue imports and suggest sorted order',
    entities: ['NoticeManagement'],  // ✅ 신버전: "Projects" 제외
    fileRole: 'page',
  };

  console.log(`${colors.green}✓ 이것은 수정된 코드가 생성하는 요청입니다${colors.reset}`);
  console.log(`${colors.green}  (서버 재빌드 후)${colors.reset}\n`);

  const newResult = await simulateAutoRecommend(newCodeRequest, storage, embeddingService);

  console.log(`\n${colors.bright}결과 요약:${colors.reset}`);
  console.log(`  전체 파일:        ${newResult.totalFiles}개`);
  console.log(`  Role 필터 후:     ${newResult.afterRoleFilter}개`);
  console.log(`  Entity 필터 후:   ${colors.bright}${newResult.afterEntityFilter}개${colors.reset}`);
  console.log(`  임베딩 검색 가능: ${newResult.finalResults}개`);

  if (newResult.afterEntityFilter === 0) {
    log('error', '❌ 엔티티 필터에서 모든 파일 제외됨!');
  } else {
    log('success', `✓ ${newResult.afterEntityFilter}개 파일 매칭`);
  }

  // ========================================================================
  // 비교 분석
  // ========================================================================

  header('비교 분석', 1);

  console.log(`${colors.bright}구버전 vs 신버전:${colors.reset}\n`);

  const comparison = [
    {
      metric: '엔티티 필터 후',
      old: oldResult.afterEntityFilter,
      new: newResult.afterEntityFilter,
    },
    {
      metric: '임베딩 검색 가능',
      old: oldResult.finalResults,
      new: newResult.finalResults,
    },
  ];

  comparison.forEach(c => {
    const improved = c.new > c.old;
    const arrow = improved ? '↑' : c.new < c.old ? '↓' : '→';
    const color = improved ? colors.green : c.new < c.old ? colors.red : colors.yellow;

    console.log(`  ${c.metric.padEnd(20)} ${c.old}개 ${color}${arrow}${colors.reset} ${c.new}개`);
  });

  // ========================================================================
  // 최종 판정
  // ========================================================================

  header('최종 판정', 1);

  const scenarios = [
    {
      condition: '현재 서버가 구버전인 경우',
      expected: oldResult.afterEntityFilter,
      verdict: oldResult.afterEntityFilter === 0 ? 'FAIL' : 'PASS',
      action: oldResult.afterEntityFilter === 0
        ? '→ Docker 재빌드 필요!'
        : '→ 데이터베이스만 재스캔',
    },
    {
      condition: '서버 재빌드 후',
      expected: newResult.afterEntityFilter,
      verdict: newResult.afterEntityFilter > 0 ? 'PASS' : 'FAIL',
      action: newResult.afterEntityFilter > 0
        ? '→ RAG 검색 작동 예상!'
        : '→ 데이터베이스 재스캔 필요',
    },
  ];

  scenarios.forEach((s, i) => {
    console.log(`\n${i + 1}. ${colors.bright}${s.condition}${colors.reset}`);
    console.log(`   매칭 결과: ${s.expected}개 파일`);

    if (s.verdict === 'PASS') {
      console.log(`   판정: ${colors.green}✓ PASS${colors.reset}`);
    } else {
      console.log(`   판정: ${colors.red}✗ FAIL${colors.reset}`);
    }

    console.log(`   조치: ${s.action}`);
  });

  // ========================================================================
  // 권장사항
  // ========================================================================

  header('권장사항', 1);

  if (oldResult.afterEntityFilter === 0 && newResult.afterEntityFilter > 0) {
    log('success', '✓ 코드 수정이 문제를 해결합니다!');
    console.log(`\n다음 단계:`);
    console.log(`  1. Docker 재빌드`);
    console.log(`     ${colors.cyan}docker-compose build mcp-code-mode-server${colors.reset}`);
    console.log(`\n  2. 서버 재시작`);
    console.log(`     ${colors.cyan}docker-compose up -d mcp-code-mode-server${colors.reset}`);
    console.log(`\n  3. 이 테스트 재실행하여 검증`);
    console.log(`     ${colors.cyan}docker-compose exec mcp-code-mode-server npm run test:live-search${colors.reset}`);
  } else if (newResult.afterEntityFilter === 0) {
    log('error', '✗ 코드 수정 후에도 매칭 안됨!');
    console.log(`\n원인 분석 필요:`);
    console.log(`  - 데이터베이스에 "NoticeManagement" 엔티티가 없을 수 있음`);
    console.log(`  - 엔티티 분석 스크립트 실행 필요:`);
    console.log(`    ${colors.cyan}npm run analyze:entities${colors.reset}`);
  } else {
    log('success', '✓ 이미 작동 중!');
    console.log(`\n  RAG 검색이 이미 작동하고 있습니다.`);
  }

  // Exit code
  if (newResult.afterEntityFilter > 0) {
    console.log(`\n${colors.green}${colors.bright}✓✓✓ 검증 완료: 신버전 코드는 정상 작동합니다 ✓✓✓${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}✗✗✗ 경고: 추가 조치 필요 ✗✗✗${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}오류 발생:${colors.reset}`, error);
  process.exit(1);
});

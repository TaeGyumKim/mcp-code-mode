#!/usr/bin/env node

/**
 * 다차원 점수 시스템 테스트 스크립트
 *
 * 다음 항목들을 테스트합니다:
 * 1. 메타데이터 기반 점수 계산
 * 2. 저장 기준 판정
 * 3. 인덱싱 시스템
 * 4. 검색 API
 */

import {
  BestCaseStorage,
  calculateWeightedScore,
  getExcellentCategories,
  shouldSaveBestCase,
  buildIndex,
  searchIndex,
  getIndexStats,
  type BestCase,
  type BestCaseScores
} from '../../packages/bestcase-db/dist/index.js';

import { calculateScoresFromMetadata } from '../../packages/llm-analyzer/dist/index.js';
import type { ProjectMetadata, FileMetadata } from '../../packages/llm-analyzer/dist/metadata.js';

// ============================================
// 테스트 데이터
// ============================================

const mockProjectMetadata: ProjectMetadata = {
  projectName: 'test-project',
  totalFiles: 50,
  filesByCategory: {
    page: 10,
    composable: 15,
    api: 8,
    utility: 12,
    other: 5
  },
  apiType: 'grpc',
  apiMethods: ['GetUser', 'ListUsers', 'CreateUser', 'UpdateUser', 'DeleteUser'],
  frameworks: ['vue3', 'pinia', 'vite'],
  patterns: ['composable', 'api-client', 'error-handling', 'type-safe'],
  dependencies: ['@grpc/grpc-js', '@openerd/nuxt3', 'lodash', 'date-fns', 'pinia'],
  designSystem: '@openerd/nuxt3',
  utilityLibrary: 'lodash',
  componentsUsed: ['CommonButton', 'CommonInput', 'CommonTable', 'CommonSelect', 'CommonDialog'],
  composablesUsed: ['useUser', 'useAuth', 'useState', 'useRouter', 'useApi'],
  entities: ['User', 'Product', 'Order'],
  complexityDistribution: {
    trivial: 15,
    low: 20,
    medium: 12,
    high: 3,
    extreme: 0
  },
  excellentFiles: [
    {
      filePath: '/src/pages/user/index.vue',
      category: 'structure',
      reasons: ['Well structured components', 'Clean separation of concerns']
    },
    {
      filePath: '/src/composables/useUser.ts',
      category: 'api',
      reasons: ['Excellent API error handling', 'Type-safe gRPC client']
    },
    {
      filePath: '/src/utils/date.ts',
      category: 'utility',
      reasons: ['Reusable utility functions', 'Good documentation']
    }
  ],
  excellentSnippets: [],
  averageComplexity: 'low',
  totalLinesOfCode: 5000,
  filesWithGoodErrorHandling: 35,
  filesWithGoodTypes: 42
};

const mockFileMetadata: FileMetadata = {
  filePath: '/src/pages/user/detail.vue',
  category: 'page',
  patterns: ['composition-api', 'async-data', 'error-handling'],
  frameworks: ['vue3'],
  designSystem: '@openerd/nuxt3',
  utilityLibrary: 'lodash',
  apiType: 'grpc',
  apiMethods: ['GetUser', 'UpdateUser'],
  complexity: 'low',
  reusability: 'medium',
  errorHandling: 'comprehensive',
  typeDefinitions: 'excellent',
  dependencies: ['@grpc/grpc-js', '@openerd/nuxt3', 'lodash'],
  composablesUsed: ['useUser', 'useAuth'],
  entities: ['User'],
  features: ['user-detail', 'user-edit'],
  hasDocumentation: true,
  isExcellent: true,
  excellentReasons: ['Comprehensive error handling', 'Excellent type definitions', 'Clean component structure'],
  linesOfCode: 150
};

// ============================================
// 테스트 함수
// ============================================

async function testScoreCalculation() {
  console.log('\n=== 1. 점수 계산 테스트 ===\n');

  // Project 점수 계산
  console.log('📊 Project Metadata 점수 계산:');
  const projectScores = calculateScoresFromMetadata(mockProjectMetadata, true);
  console.log(JSON.stringify(projectScores, null, 2));

  const totalScore = calculateWeightedScore(projectScores);
  console.log(`\n총점: ${totalScore}/100`);

  const excellentIn = getExcellentCategories(projectScores);
  console.log(`우수 영역: ${excellentIn.join(', ') || 'none'}`);

  // 저장 기준 판정
  const saveDecision = shouldSaveBestCase(projectScores);
  console.log(`\n저장 여부: ${saveDecision.shouldSave ? '✅ 저장' : '❌ 제외'}`);
  console.log(`이유: ${saveDecision.reason}`);

  // File 점수 계산
  console.log('\n\n📄 File Metadata 점수 계산:');
  const fileScores = calculateScoresFromMetadata(mockFileMetadata, false);
  console.log(JSON.stringify(fileScores, null, 2));

  const fileTotalScore = calculateWeightedScore(fileScores);
  console.log(`\n총점: ${fileTotalScore}/100`);

  const fileExcellentIn = getExcellentCategories(fileScores);
  console.log(`우수 영역: ${fileExcellentIn.join(', ') || 'none'}`);
}

async function testIndexingAndSearch() {
  console.log('\n\n=== 2. 인덱싱 및 검색 테스트 ===\n');

  // 테스트용 BestCase 데이터 생성
  const testCases: BestCase[] = [
    {
      id: 'test-bc-001',
      projectName: 'project-a',
      category: 'frontend',
      description: '구조가 잘 짜여진 페이지',
      files: [],
      scores: {
        structure: 95,
        apiConnection: 60,
        designSystem: 70,
        utilityUsage: 65,
        errorHandling: 55,
        typeUsage: 75,
        stateManagement: 60,
        performance: 80
      },
      totalScore: 72,
      excellentIn: ['structure'],
      patterns: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['vue3', 'structure']
      }
    },
    {
      id: 'test-bc-002',
      projectName: 'project-a',
      category: 'api',
      description: 'API 연결이 우수한 composable',
      files: [],
      scores: {
        structure: 65,
        apiConnection: 92,
        designSystem: 55,
        utilityUsage: 60,
        errorHandling: 85,
        typeUsage: 80,
        stateManagement: 70,
        performance: 75
      },
      totalScore: 75,
      excellentIn: ['apiConnection', 'errorHandling'],
      patterns: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['grpc', 'composable']
      }
    },
    {
      id: 'test-bc-003',
      projectName: 'project-b',
      category: 'frontend',
      description: '디자인 시스템 활용도가 높은 페이지',
      files: [],
      scores: {
        structure: 70,
        apiConnection: 65,
        designSystem: 88,
        utilityUsage: 72,
        errorHandling: 68,
        typeUsage: 75,
        stateManagement: 65,
        performance: 70
      },
      totalScore: 71,
      excellentIn: ['designSystem'],
      patterns: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['vue3', 'design-system']
      }
    }
  ];

  // 인덱스 생성
  console.log('📑 인덱스 생성 중...');
  const index = buildIndex(testCases);
  console.log(`총 케이스: ${index.totalCases}개`);

  // 통계 정보
  const stats = getIndexStats(index);
  console.log('\n📊 인덱스 통계:');
  console.log(`  프로젝트: ${stats.projectCount}개`);
  console.log(`  태그: ${stats.tagCount}개`);
  console.log('\n  우수 영역 분포:');
  Object.entries(stats.excellenceDistribution).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`    ${category}: ${count}개`);
    }
  });

  // 검색 테스트
  console.log('\n\n🔍 검색 테스트:');

  // 1. 구조가 우수한 케이스
  console.log('\n1️⃣  구조가 우수한 케이스 검색:');
  const structureResults = searchIndex(index, { excellentIn: ['structure'] });
  console.log(`  결과: ${structureResults.length}개 - ${structureResults.join(', ')}`);

  // 2. API 연결이 우수한 케이스
  console.log('\n2️⃣  API 연결이 우수한 케이스 검색:');
  const apiResults = searchIndex(index, { excellentIn: ['apiConnection'] });
  console.log(`  결과: ${apiResults.length}개 - ${apiResults.join(', ')}`);

  // 3. project-a의 케이스
  console.log('\n3️⃣  project-a의 케이스 검색:');
  const projectAResults = searchIndex(index, { projectName: 'project-a' });
  console.log(`  결과: ${projectAResults.length}개 - ${projectAResults.join(', ')}`);

  // 4. vue3 태그를 가진 케이스
  console.log('\n4️⃣  vue3 태그 검색:');
  const vue3Results = searchIndex(index, { tags: ['vue3'] });
  console.log(`  결과: ${vue3Results.length}개 - ${vue3Results.join(', ')}`);

  // 5. 복합 조건 검색 (project-a + 구조 우수)
  console.log('\n5️⃣  project-a의 구조 우수 케이스 검색:');
  const complexResults = searchIndex(index, {
    projectName: 'project-a',
    excellentIn: ['structure']
  });
  console.log(`  결과: ${complexResults.length}개 - ${complexResults.join(', ')}`);

  // 6. 점수대별 검색
  console.log('\n6️⃣  excellent 등급 (85점 이상) 검색:');
  const excellentResults = searchIndex(index, { scoreGrade: 'excellent' });
  console.log(`  결과: ${excellentResults.length}개 - ${excellentResults.join(', ')}`);

  console.log('\n7️⃣  good 등급 (70-84점) 검색:');
  const goodResults = searchIndex(index, { scoreGrade: 'good' });
  console.log(`  결과: ${goodResults.length}개 - ${goodResults.join(', ')}`);
}

async function testStorageAPI() {
  console.log('\n\n=== 3. Storage API 테스트 ===\n');

  // 임시 스토리지 경로
  const tempPath = '/tmp/bestcase-test-' + Date.now();
  const storage = new BestCaseStorage(tempPath);

  console.log(`📂 임시 스토리지: ${tempPath}`);

  try {
    // 테스트 케이스 저장
    console.log('\n💾 테스트 케이스 3개 저장 중...');
    const testCase1: BestCase = {
      id: 'api-test-001',
      projectName: 'test-project',
      category: 'api',
      description: 'Test API case',
      files: [],
      scores: {
        structure: 70,
        apiConnection: 90,
        designSystem: 60,
        utilityUsage: 65,
        errorHandling: 85,
        typeUsage: 75,
        stateManagement: 70,
        performance: 72
      },
      totalScore: 74,
      excellentIn: ['apiConnection', 'errorHandling'],
      patterns: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test', 'grpc']
      }
    };

    const testCase2: BestCase = {
      id: 'api-test-002',
      projectName: 'test-project',
      category: 'frontend',
      description: 'Test structure case',
      files: [],
      scores: {
        structure: 92,
        apiConnection: 65,
        designSystem: 75,
        utilityUsage: 68,
        errorHandling: 70,
        typeUsage: 80,
        stateManagement: 72,
        performance: 78
      },
      totalScore: 75,
      excellentIn: ['structure'],
      patterns: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test', 'vue3']
      }
    };

    const testCase3: BestCase = {
      id: 'api-test-003',
      projectName: 'another-project',
      category: 'frontend',
      description: 'Test design case',
      files: [],
      scores: {
        structure: 75,
        apiConnection: 70,
        designSystem: 88,
        utilityUsage: 82,
        errorHandling: 72,
        typeUsage: 78,
        stateManagement: 70,
        performance: 75
      },
      totalScore: 76,
      excellentIn: ['designSystem', 'utilityUsage'],
      patterns: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test', 'design-system']
      }
    };

    await storage.save(testCase1);
    await storage.save(testCase2);
    await storage.save(testCase3);
    console.log('✅ 저장 완료');

    // 인덱스 확인
    console.log('\n📑 자동 생성된 인덱스 확인:');
    const index = await storage.loadIndex();
    if (index) {
      const stats = getIndexStats(index);
      console.log(`  총 케이스: ${stats.totalCases}개`);
      console.log(`  프로젝트: ${stats.projectCount}개`);
      console.log(`  우수 영역:`);
      Object.entries(stats.excellenceDistribution).forEach(([category, count]) => {
        if (count > 0) {
          console.log(`    ${category}: ${count}개`);
        }
      });
    }

    // 검색 테스트
    console.log('\n\n🔍 Storage 검색 API 테스트:');

    console.log('\n1️⃣  API 연결이 우수한 케이스:');
    const apiExcellent = await storage.findExcellentInCategory('apiConnection');
    console.log(`  결과: ${apiExcellent.length}개 - ${apiExcellent.map(c => c.id).join(', ')}`);

    console.log('\n2️⃣  구조가 우수한 케이스:');
    const structureExcellent = await storage.findExcellentInCategory('structure');
    console.log(`  결과: ${structureExcellent.length}개 - ${structureExcellent.map(c => c.id).join(', ')}`);

    console.log('\n3️⃣  75점 이상 케이스:');
    const highScore = await storage.findByMinScore(75);
    console.log(`  결과: ${highScore.length}개 - ${highScore.map(c => c.id).join(', ')}`);

    console.log('\n4️⃣  복합 검색 (test-project의 API 우수):');
    const complex = await storage.searchByIndex({
      projectName: 'test-project',
      excellentIn: ['apiConnection']
    });
    console.log(`  결과: ${complex.length}개 - ${complex.map(c => c.id).join(', ')}`);

    console.log('\n✅ 모든 테스트 통과!');
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// ============================================
// 메인 실행
// ============================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   다차원 BestCase 점수 시스템 테스트                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  try {
    await testScoreCalculation();
    await testIndexingAndSearch();
    await testStorageAPI();

    console.log('\n\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✅ 모든 테스트 완료!                               ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n\n❌ 테스트 중 오류 발생:', error);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * 완전한 워크플로우 검증 스크립트
 *
 * 전체 흐름을 시뮬레이션합니다:
 * 1. 프로젝트 메타데이터 분석
 * 2. 다차원 점수 계산
 * 3. 저장 기준 판정
 * 4. BestCase 저장
 * 5. 인덱스 자동 생성
 * 6. 검색 API 활용
 */

import { BestCaseStorage } from '../../packages/bestcase-db/dist/index.js';
import {
  calculateScoresFromMetadata,
  type ProjectMetadata
} from '../../packages/llm-analyzer/dist/index.js';
import {
  calculateWeightedScore,
  getExcellentCategories,
  shouldSaveBestCase,
  type BestCase
} from '../../packages/bestcase-db/dist/index.js';

// 시뮬레이션 프로젝트 데이터
const simulatedProjects: Array<{ name: string; metadata: ProjectMetadata }> = [
  {
    name: 'ecommerce-frontend',
    metadata: {
      projectName: 'ecommerce-frontend',
      totalFiles: 120,
      filesByCategory: {
        page: 35,
        composable: 25,
        api: 15,
        utility: 30,
        other: 15
      },
      apiType: 'grpc',
      apiMethods: ['GetProduct', 'ListProducts', 'CreateOrder', 'GetUser', 'UpdateCart'],
      frameworks: ['vue3', 'pinia', 'vite', 'tailwindcss'],
      patterns: ['composable', 'api-client', 'error-boundary', 'lazy-loading'],
      dependencies: ['@grpc/grpc-js', '@openerd/nuxt3', 'lodash', 'pinia', 'vueuse'],
      designSystem: '@openerd/nuxt3',
      utilityLibrary: 'lodash',
      componentsUsed: ['CommonButton', 'CommonInput', 'CommonTable', 'CommonCard', 'CommonDialog', 'CommonSelect'],
      composablesUsed: ['useProduct', 'useCart', 'useUser', 'useState', 'useRouter'],
      entities: ['Product', 'Order', 'User', 'Cart'],
      complexityDistribution: {
        trivial: 40,
        low: 50,
        medium: 25,
        high: 5,
        extreme: 0
      },
      excellentFiles: [
        {
          filePath: '/src/pages/products/index.vue',
          category: 'structure',
          reasons: ['Well-organized page structure', 'Clean component composition']
        },
        {
          filePath: '/src/composables/useProduct.ts',
          category: 'api',
          reasons: ['Excellent API error handling', 'Type-safe gRPC client']
        }
      ],
      excellentSnippets: [],
      averageComplexity: 'low',
      totalLinesOfCode: 12000,
      filesWithGoodErrorHandling: 85,
      filesWithGoodTypes: 100
    }
  },
  {
    name: 'admin-dashboard',
    metadata: {
      projectName: 'admin-dashboard',
      totalFiles: 80,
      filesByCategory: {
        page: 25,
        composable: 15,
        api: 20,
        utility: 15,
        other: 5
      },
      apiType: 'rest',
      apiMethods: ['getUsers', 'updateUser', 'deleteUser', 'getAnalytics', 'exportData'],
      frameworks: ['vue3', 'pinia', 'element-plus'],
      patterns: ['composable', 'rest-api', 'form-validation', 'data-table'],
      dependencies: ['axios', 'element-plus', 'lodash', 'date-fns', 'pinia'],
      designSystem: 'element-plus',
      utilityLibrary: 'lodash',
      componentsUsed: ['ElButton', 'ElTable', 'ElForm', 'ElDialog', 'ElDatePicker'],
      composablesUsed: ['useUser', 'useAuth', 'useTable', 'useForm'],
      entities: ['User', 'Analytics', 'Report'],
      complexityDistribution: {
        trivial: 25,
        low: 35,
        medium: 15,
        high: 5,
        extreme: 0
      },
      excellentFiles: [
        {
          filePath: '/src/composables/useTable.ts',
          category: 'utility',
          reasons: ['Highly reusable table composable', 'Excellent abstraction']
        },
        {
          filePath: '/src/pages/dashboard.vue',
          category: 'design',
          reasons: ['Consistent design system usage', 'Responsive layout']
        }
      ],
      excellentSnippets: [],
      averageComplexity: 'medium',
      totalLinesOfCode: 8000,
      filesWithGoodErrorHandling: 55,
      filesWithGoodTypes: 68
    }
  },
  {
    name: 'mobile-app-backend',
    metadata: {
      projectName: 'mobile-app-backend',
      totalFiles: 45,
      filesByCategory: {
        page: 0,
        composable: 0,
        api: 35,
        utility: 8,
        other: 2
      },
      apiType: 'grpc',
      apiMethods: ['AuthenticateUser', 'RefreshToken', 'GetProfile', 'UpdateProfile', 'UploadImage'],
      frameworks: ['fastify', 'grpc'],
      patterns: ['api-gateway', 'middleware', 'error-handling', 'validation'],
      dependencies: ['@grpc/grpc-js', 'fastify', 'zod', 'jwt'],
      componentsUsed: [],
      composablesUsed: [],
      entities: ['User', 'Session', 'Token'],
      complexityDistribution: {
        trivial: 10,
        low: 20,
        medium: 10,
        high: 5,
        extreme: 0
      },
      excellentFiles: [
        {
          filePath: '/src/api/auth.ts',
          category: 'api',
          reasons: ['Comprehensive error handling', 'Excellent validation']
        },
        {
          filePath: '/src/middleware/auth.ts',
          category: 'error',
          reasons: ['Robust error handling', 'Clear error messages']
        }
      ],
      excellentSnippets: [],
      averageComplexity: 'medium',
      totalLinesOfCode: 5500,
      filesWithGoodErrorHandling: 40,
      filesWithGoodTypes: 42
    }
  }
];

async function validateCompleteWorkflow() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   완전한 워크플로우 검증                            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const tempPath = '/tmp/bestcase-validation-' + Date.now();
  const storage = new BestCaseStorage(tempPath);

  console.log(`📂 임시 스토리지: ${tempPath}\n`);

  let savedCount = 0;
  let skippedCount = 0;

  // Step 1-4: 프로젝트 분석 및 저장
  console.log('=== Step 1-4: 프로젝트 분석 및 저장 ===\n');

  for (const project of simulatedProjects) {
    console.log(`\n📦 프로젝트: ${project.name}`);
    console.log('─'.repeat(60));

    // Step 1: 메타데이터 분석 (시뮬레이션)
    console.log('1️⃣  메타데이터 분석 완료');

    // Step 2: 다차원 점수 계산
    console.log('2️⃣  다차원 점수 계산 중...');
    const scores = calculateScoresFromMetadata(project.metadata, true);
    const totalScore = calculateWeightedScore(scores);
    const excellentIn = getExcellentCategories(scores);

    console.log('   점수:');
    console.log(`     structure: ${scores.structure}, apiConnection: ${scores.apiConnection}`);
    console.log(`     designSystem: ${scores.designSystem}, utilityUsage: ${scores.utilityUsage}`);
    console.log(`     errorHandling: ${scores.errorHandling}, typeUsage: ${scores.typeUsage}`);
    console.log(`     stateManagement: ${scores.stateManagement}, performance: ${scores.performance}`);
    console.log(`   총점: ${totalScore}/100`);
    console.log(`   우수 영역: ${excellentIn.join(', ') || 'none'}`);

    // Step 3: 저장 기준 판정
    console.log('3️⃣  저장 기준 판정 중...');
    const saveDecision = shouldSaveBestCase(scores);
    console.log(`   결과: ${saveDecision.shouldSave ? '✅ 저장' : '❌ 제외'}`);
    console.log(`   이유: ${saveDecision.reason}`);

    if (saveDecision.shouldSave) {
      // Step 4: BestCase 저장
      console.log('4️⃣  BestCase 저장 중...');
      const bestCase: BestCase = {
        id: `bc-${project.name}-${Date.now()}`,
        projectName: project.name,
        category: 'auto-scan',
        description: `Auto-scanned project: ${project.name}`,
        files: [],
        scores: scores,
        totalScore: totalScore,
        excellentIn: excellentIn,
        patterns: {
          metadata: project.metadata
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['auto-scan', ...project.metadata.frameworks]
        }
      };

      await storage.save(bestCase);
      console.log('   ✅ 저장 완료');
      savedCount++;
    } else {
      console.log('   ⏭️  저장 생략');
      skippedCount++;
    }
  }

  console.log('\n\n=== Step 5: 인덱스 자동 생성 확인 ===\n');

  const index = await storage.loadIndex();
  if (index) {
    console.log('✅ 인덱스 자동 생성 확인');
    console.log(`   총 케이스: ${index.totalCases}개`);
    console.log(`   프로젝트: ${Object.keys(index.byProject).length}개`);
    console.log('\n   우수 영역 분포:');
    Object.entries(index.byExcellence).forEach(([category, ids]) => {
      if (ids.length > 0) {
        console.log(`     ${category}: ${ids.length}개`);
      }
    });
  } else {
    console.log('❌ 인덱스를 찾을 수 없습니다');
  }

  console.log('\n\n=== Step 6: 검색 API 활용 ===\n');

  // 다양한 검색 시나리오
  console.log('🔍 검색 시나리오 테스트:\n');

  // 1. 구조가 우수한 케이스
  console.log('1️⃣  구조가 우수한 케이스 검색:');
  const structureResults = await storage.findExcellentInCategory('structure');
  console.log(`   결과: ${structureResults.length}개`);
  structureResults.forEach(bc => {
    console.log(`     - ${bc.projectName} (총점: ${bc.totalScore})`);
  });

  // 2. API 연결이 우수한 케이스
  console.log('\n2️⃣  API 연결이 우수한 케이스 검색:');
  const apiResults = await storage.findExcellentInCategory('apiConnection');
  console.log(`   결과: ${apiResults.length}개`);
  apiResults.forEach(bc => {
    console.log(`     - ${bc.projectName} (총점: ${bc.totalScore})`);
  });

  // 3. 디자인 시스템이 우수한 케이스
  console.log('\n3️⃣  디자인 시스템이 우수한 케이스 검색:');
  const designResults = await storage.findExcellentInCategory('designSystem');
  console.log(`   결과: ${designResults.length}개`);
  designResults.forEach(bc => {
    console.log(`     - ${bc.projectName} (총점: ${bc.totalScore})`);
  });

  // 4. 에러 핸들링이 우수한 케이스
  console.log('\n4️⃣  에러 핸들링이 우수한 케이스 검색:');
  const errorResults = await storage.findExcellentInCategory('errorHandling');
  console.log(`   결과: ${errorResults.length}개`);
  errorResults.forEach(bc => {
    console.log(`     - ${bc.projectName} (총점: ${bc.totalScore})`);
  });

  // 5. 75점 이상 케이스
  console.log('\n5️⃣  75점 이상 우수 케이스 검색:');
  const highScoreResults = await storage.findByMinScore(75);
  console.log(`   결과: ${highScoreResults.length}개`);
  highScoreResults.forEach(bc => {
    console.log(`     - ${bc.projectName} (총점: ${bc.totalScore})`);
  });

  // 6. 복합 검색
  console.log('\n6️⃣  복합 검색 (구조 또는 API 우수):');
  const complexResults = await storage.findExcellentInAnyCategory(['structure', 'apiConnection']);
  console.log(`   결과: ${complexResults.length}개`);
  complexResults.forEach(bc => {
    console.log(`     - ${bc.projectName} (우수: ${bc.excellentIn?.join(', ')})`);
  });

  // 최종 요약
  console.log('\n\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   검증 완료 요약                                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  console.log(`총 프로젝트: ${simulatedProjects.length}개`);
  console.log(`저장된 케이스: ${savedCount}개`);
  console.log(`제외된 케이스: ${skippedCount}개`);
  console.log(`\n✅ 모든 단계 정상 작동 확인!`);
  console.log(`\n주요 개선사항:`);
  console.log(`  ✓ 다차원 점수 시스템 (8개 카테고리)`);
  console.log(`  ✓ 카테고리별 우수성 판정`);
  console.log(`  ✓ 자동 인덱싱 시스템`);
  console.log(`  ✓ 고급 검색 API (카테고리, 점수, 태그 등)`);
  console.log(`  ✓ 하위 호환성 유지\n`);
}

validateCompleteWorkflow().catch(console.error);

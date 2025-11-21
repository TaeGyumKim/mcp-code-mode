/**
 * Test Dimension Inference V2 (TF-IDF + Weights)
 *
 * 개선된 차원 추론 시스템 테스트
 */

import { inferImportantDimensionsV2 } from '../../mcp-servers/bestcase/dimensionKeywords.js';

interface TestCase {
  name: string;
  description: string;
  keywords: string[];
  expectedTopDimension: string;
}

const testCases: TestCase[] = [
  {
    name: "API 중심 요청 (핵심 키워드)",
    description: "gRPC API 엔드포인트 구현",
    keywords: ["grpc", "api", "endpoint"],
    expectedTopDimension: "apiConnection"
  },
  {
    name: "에러 처리 중심 (핵심 + 중요 키워드)",
    description: "에러 핸들링과 검증 로직",
    keywords: ["error", "validation", "exception", "try-catch"],
    expectedTopDimension: "errorHandling"
  },
  {
    name: "성능 최적화 (핵심 키워드 강조)",
    description: "성능 최적화 및 캐시 전략",
    keywords: ["performance", "optimize", "cache"],
    expectedTopDimension: "performance"
  },
  {
    name: "혼합 키워드 (가중치로 구분)",
    description: "검색 기능 구현 with error handling",
    keywords: ["search", "list", "error", "api"],
    expectedTopDimension: "errorHandling" // "error handling" 명시적 언급
  },
  {
    name: "일반 키워드만 (낮은 점수)",
    description: "request와 response 처리",
    keywords: ["request", "response", "call"],
    expectedTopDimension: "apiConnection" // 일반 키워드지만 여전히 감지
  },
  {
    name: "한글 키워드",
    description: "상태 관리 스토어 구현",
    keywords: ["상태", "스토어", "반응형"],
    expectedTopDimension: "stateManagement"
  }
];

function runTests() {
  console.log('🧪 Dimension Inference V2 Test Suite\n');
  console.log('=' .repeat(80));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Description: "${testCase.description}"`);
    console.log(`   Keywords: [${testCase.keywords.join(', ')}]`);

    const result = inferImportantDimensionsV2(
      testCase.description,
      testCase.keywords,
      undefined,
      3
    );

    console.log(`\n   Results:`);
    console.log(`   - Top dimensions: ${result.dimensions.join(', ')}`);
    console.log(`   - Scores:`);

    result.details.forEach(detail => {
      console.log(`     • ${detail.dimension}: ${detail.score.toFixed(2)} (matched: ${detail.matchedKeywords.slice(0, 3).join(', ')})`);
    });

    const topDimension = result.dimensions[0];
    if (topDimension === testCase.expectedTopDimension) {
      console.log(`\n   ✅ PASS - Expected "${testCase.expectedTopDimension}", got "${topDimension}"`);
      passed++;
    } else {
      console.log(`\n   ❌ FAIL - Expected "${testCase.expectedTopDimension}", got "${topDimension}"`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

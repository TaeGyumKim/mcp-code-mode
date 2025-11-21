/**
 * Dynamic Threshold Logic Test
 *
 * 수정된 동적 임계값 계산 로직 검증
 */

interface TestCase {
  name: string;
  avg: number;
  originalThreshold: number;
  floor: number;
  expectedThreshold: number;
}

const testCases: TestCase[] = [
  {
    name: "평균이 임계값에 근접 (74 vs 75)",
    avg: 74,
    originalThreshold: 75,
    floor: 50,
    expectedThreshold: 74 * 0.95 // 70.3
  },
  {
    name: "평균이 임계값보다 훨씬 낮음 (60 vs 75)",
    avg: 60,
    originalThreshold: 75,
    floor: 50,
    expectedThreshold: 60 * 0.95 // 57
  },
  {
    name: "평균이 floor에 근접 (52 vs 50 floor)",
    avg: 52,
    originalThreshold: 75,
    floor: 50,
    expectedThreshold: 50 // 52 * 0.95 = 49.4 → floor로 제한되어 50
  },
  {
    name: "평균이 floor보다 낮음",
    avg: 45,
    originalThreshold: 75,
    floor: 50,
    expectedThreshold: 50 // floor로 제한
  },
  {
    name: "평균이 임계값보다 높음 (조정 없음)",
    avg: 80,
    originalThreshold: 75,
    floor: 50,
    expectedThreshold: 75 // 조정 안 됨
  }
];

function calculateEffectiveThreshold(
  avg: number,
  originalThreshold: number,
  floor: number
): number {
  if (avg < originalThreshold) {
    const relaxedThreshold = Math.max(avg * 0.95, floor);
    if (relaxedThreshold < originalThreshold) {
      return relaxedThreshold;
    }
  }
  return originalThreshold;
}

console.log('🧪 Dynamic Threshold Fix Test\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\n📝 Test: ${testCase.name}`);
  console.log(`   Input: avg=${testCase.avg}, threshold=${testCase.originalThreshold}, floor=${testCase.floor}`);

  const result = calculateEffectiveThreshold(
    testCase.avg,
    testCase.originalThreshold,
    testCase.floor
  );

  const expected = testCase.expectedThreshold;
  const tolerance = 0.5; // 0.5점 오차 허용
  const isPassing = Math.abs(result - expected) < tolerance;

  console.log(`   Expected: ${expected.toFixed(2)}`);
  console.log(`   Got: ${result.toFixed(2)}`);
  console.log(`   ${isPassing ? '✅' : '❌'} ${isPassing ? 'PASS' : 'FAIL'}`);

  if (isPassing) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

// 추가 검증: 임계값이 절대 상향 조정되지 않는지 확인
console.log('\n🔍 Additional Validation: Threshold Never Increases\n');

let violations = 0;
for (let avg = 50; avg <= 100; avg += 5) {
  const originalThreshold = 75;
  const floor = 50;
  const effective = calculateEffectiveThreshold(avg, originalThreshold, floor);

  if (effective > originalThreshold) {
    console.log(`❌ VIOLATION: avg=${avg} → threshold increased to ${effective}`);
    violations++;
  }
}

if (violations === 0) {
  console.log('✅ No violations: Threshold never increases above original');
} else {
  console.log(`❌ ${violations} violations found!`);
  failed++;
}

console.log('\n' + '='.repeat(80));

if (failed > 0) {
  process.exit(1);
}

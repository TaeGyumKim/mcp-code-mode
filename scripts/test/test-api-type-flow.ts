/**
 * API Type 감지 전체 흐름 테스트
 *
 * package.json → extractProjectContext → detectApiType 흐름 검증
 */

import { extractProjectContext } from '../../packages/ai-runner/dist/projectContext.js';
import * as path from 'path';

async function testApiTypeDetection() {
  console.log('🧪 API Type 감지 흐름 테스트\n');
  console.log('='.repeat(80));

  // 1. 현재 프로젝트 경로에서 테스트
  const currentProjectPath = process.cwd();
  console.log(`\n📂 테스트 대상: ${currentProjectPath}`);
  console.log('-'.repeat(80));

  try {
    const context = await extractProjectContext(currentProjectPath);

    console.log('\n✅ 프로젝트 컨텍스트 추출 완료:');
    console.log(JSON.stringify({
      hasPackageJson: context.hasPackageJson,
      apiInfo: context.apiInfo,
      designSystem: context.designSystemInfo.detected,
      utilityLibrary: context.utilityLibraryInfo.detected,
      recommendedPlan: context.recommendedPlan
    }, null, 2));

    console.log('\n' + '='.repeat(80));

    if (context.apiInfo.type === 'unknown') {
      console.log('\n⚠️  API Type이 unknown입니다.');
      console.log('위 로그에서 [detectApiType] 메시지를 확인하여 원인을 파악하세요.');
      console.log('\n가능한 원인:');
      console.log('1. package.json에 API 관련 패키지가 없음');
      console.log('2. 패키지 이름이 패턴과 일치하지 않음');
      console.log('3. package.json을 찾지 못함');
    } else {
      console.log(`\n✅ API Type 감지 성공: ${context.apiInfo.type}`);
      console.log('감지된 패키지:', context.apiInfo.packages);
    }

  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  }
}

testApiTypeDetection();

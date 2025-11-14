/**
 * 외부 프로젝트 컨텍스트 추출 예제
 *
 * ✅ 이제 명시적으로 프로젝트 경로를 지정해야 합니다
 */

(async () => {
  // 1. ✅ 외부 프로젝트 경로 지정 (Docker 환경)
  const projectPath = '/projects/49.airian/frontend-admin';

  console.log('📊 프로젝트 컨텍스트 추출 시작...');
  console.log(`   경로: ${projectPath}`);

  // 2. ✅ extractProjectContext에 명시적으로 경로 전달
  const context = await metadata.extractProjectContext(projectPath);

  console.log('\n✅ 프로젝트 분석 완료!\n');

  // 3. API 정보 출력
  console.log('🔧 API 정보:');
  console.log(`   타입: ${context.apiInfo.type}`);
  console.log(`   신뢰도: ${context.apiInfo.confidence}`);
  if (context.apiInfo.packages.length > 0) {
    console.log(`   패키지: ${context.apiInfo.packages.join(', ')}`);
  }

  // 4. 디자인 시스템 정보
  console.log('\n🎨 디자인 시스템:');
  if (context.designSystemInfo.detected.length > 0) {
    console.log(`   감지됨: ${context.designSystemInfo.detected.join(', ')}`);
    console.log(`   권장: ${context.designSystemInfo.recommended || 'N/A'}`);
  } else {
    console.log('   감지되지 않음');
  }

  // 5. 유틸리티 라이브러리 정보
  console.log('\n🛠️  유틸리티 라이브러리:');
  if (context.utilityLibraryInfo.detected.length > 0) {
    console.log(`   감지됨: ${context.utilityLibraryInfo.detected.join(', ')}`);
    console.log(`   권장: ${context.utilityLibraryInfo.recommended || 'N/A'}`);
  } else {
    console.log('   감지되지 않음');
  }

  // 6. 로컬 패키지 정보
  console.log('\n📦 로컬 패키지:');
  if (context.localPackagesInfo.hasConfig) {
    console.log(`   설정 파일: 있음`);
    console.log(`   총 패키지: ${context.localPackagesInfo.packages.length}개`);
    const unanalyzed = context.localPackagesInfo.packages.filter(p => !p.analyzed);
    if (unanalyzed.length > 0) {
      console.log(`   미분석: ${unanalyzed.length}개`);
    }
  } else {
    console.log('   설정 파일: 없음');
  }

  // 7. 권장 작업 계획
  if (context.recommendedPlan.length > 0) {
    console.log('\n📋 권장 작업 계획:');
    context.recommendedPlan.forEach((plan, index) => {
      console.log(`   ${index + 1}. ${plan}`);
    });
  }

  // 8. 반환
  return {
    success: true,
    context,
    summary: {
      apiType: context.apiInfo.type,
      designSystems: context.designSystemInfo.detected,
      utilityLibraries: context.utilityLibraryInfo.detected,
      hasLocalPackages: context.localPackagesInfo.hasConfig
    }
  };
})()

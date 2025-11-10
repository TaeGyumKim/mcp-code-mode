/**
 * 고급 프로젝트 스캔 with 점수 시스템
 * 
 * API 연결 품질과 openerd-nuxt3 컴포넌트 사용도를 분석하여 점수 산출
 */

const PROJECT_NAME = '50.dktechin/frontend'; // 분석할 프로젝트
const projectsBasePath = 'D:/01.Work/01.Projects';
const targetPath = `${projectsBasePath}/${PROJECT_NAME}`;

try {
  console.log('========================================');
  console.log('🔍 Advanced Project Analysis with Scoring');
  console.log(`📁 Project: ${PROJECT_NAME}`);
  console.log('========================================\n');

  // 1. 파일 스캔
  console.log('📊 Step 1: Scanning files...');
  const vueFiles = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*.vue',
    recursive: true
  });

  const tsFiles = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*.ts',
    recursive: true
  });

  const allFiles = [...vueFiles.files, ...tsFiles.files];
  const fileList = allFiles.filter(f => !f.isDirectory);
  
  console.log(`  ✓ Vue files: ${vueFiles.files.filter(f => !f.isDirectory).length}`);
  console.log(`  ✓ TS files: ${tsFiles.files.filter(f => !f.isDirectory).length}\n`);

  // 2. package.json 분석
  console.log('📦 Step 2: Analyzing dependencies...');
  let pkg = {};
  try {
    const pkgContent = await filesystem.readFile({ path: `${targetPath}/package.json` });
    pkg = JSON.parse(pkgContent.content);
  } catch (e) {
    console.log('  ⚠️ package.json not found\n');
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // 3. API 분석
  console.log('🔌 Step 3: Analyzing API connections...');
  
  // OpenAPI 감지
  const hasOpenApi = Object.keys(deps).some(dep => 
    dep.includes('openapi') || dep.includes('swagger') || dep.includes('@~/openapi')
  );
  
  // gRPC 감지
  const hasGrpc = Object.keys(deps).some(dep => 
    dep.includes('grpc') || dep.includes('proto') || dep.includes('@grpc')
  );
  
  // REST API 감지
  const hasRestApi = Object.keys(deps).some(dep =>
    dep.includes('axios') || dep.includes('fetch')
  );

  console.log(`  ${hasOpenApi ? '✓' : '✗'} OpenAPI detected`);
  console.log(`  ${hasGrpc ? '✓' : '✗'} gRPC detected`);
  console.log(`  ${hasRestApi ? '✓' : '✗'} REST API detected\n`);

  // 4. API 사용 패턴 분석
  console.log('🔧 Step 4: Analyzing API usage patterns...');
  
  // composables에서 API 클라이언트 검색
  const composablesFiles = fileList.filter(f => f.path.includes('composables'));
  let hasApiComposable = false;
  let hasErrorHandling = false;
  let hasTypeSafety = false;

  for (const file of composablesFiles.slice(0, 5)) {
    try {
      const content = await filesystem.readFile({ path: file.path });
      const text = content.content.toLowerCase();
      
      if (text.includes('usebackendclient') || text.includes('api')) {
        hasApiComposable = true;
      }
      if (text.includes('catch') || text.includes('error')) {
        hasErrorHandling = true;
      }
      if (text.includes('type ') || text.includes('interface ')) {
        hasTypeSafety = true;
      }
    } catch (e) {
      // Skip file read errors
    }
  }

  console.log(`  ${hasApiComposable ? '✓' : '✗'} API Composable found`);
  console.log(`  ${hasErrorHandling ? '✓' : '✗'} Error handling found`);
  console.log(`  ${hasTypeSafety ? '✓' : '✗'} Type safety found\n`);

  // 5. openerd-nuxt3 컴포넌트 사용 분석
  console.log('🎨 Step 5: Analyzing openerd-nuxt3 components...');
  
  const componentUsage = {
    CommonTable: 0,
    CommonPaginationTable: 0,
    CommonButton: 0,
    CommonLayout: 0,
    CommonModal: 0
  };

  const composableUsage = {
    usePaging: 0,
    useBackendClient: 0,
    useModalState: 0
  };

  for (const file of fileList) {
    if (!file.name.endsWith('.vue') && !file.name.endsWith('.ts')) continue;
    
    try {
      const content = await filesystem.readFile({ path: file.path });
      const text = content.content;
      
      // 컴포넌트 사용 카운트
      for (const comp of Object.keys(componentUsage)) {
        const matches = text.match(new RegExp(comp, 'g'));
        if (matches) componentUsage[comp] += matches.length;
      }
      
      // Composable 사용 카운트
      for (const comp of Object.keys(composableUsage)) {
        const matches = text.match(new RegExp(comp, 'g'));
        if (matches) composableUsage[comp] += matches.length;
      }
    } catch (e) {
      // Skip file read errors
    }
  }

  console.log('  Component Usage:');
  for (const [comp, count] of Object.entries(componentUsage)) {
    if (count > 0) console.log(`    - ${comp}: ${count} times`);
  }
  
  console.log('  Composable Usage:');
  for (const [comp, count] of Object.entries(composableUsage)) {
    if (count > 0) console.log(`    - ${comp}: ${count} times`);
  }
  console.log('');

  // 6. Tailwind 분석
  console.log('🎨 Step 6: Analyzing Tailwind CSS...');
  
  let hasTailwindConfig = false;
  let usesUtilityClasses = false;

  try {
    await filesystem.readFile({ path: `${targetPath}/tailwind.config.js` });
    hasTailwindConfig = true;
  } catch (e) {
    try {
      await filesystem.readFile({ path: `${targetPath}/tailwind.config.ts` });
      hasTailwindConfig = true;
    } catch (e2) {
      // No tailwind config
    }
  }

  // Vue 파일에서 Tailwind 유틸리티 클래스 확인
  for (const file of fileList.filter(f => f.name.endsWith('.vue')).slice(0, 3)) {
    try {
      const content = await filesystem.readFile({ path: file.path });
      if (content.content.includes('class=') && 
          (content.content.includes('flex') || content.content.includes('grid') || content.content.includes('bg-'))) {
        usesUtilityClasses = true;
        break;
      }
    } catch (e) {
      // Skip
    }
  }

  console.log(`  ${hasTailwindConfig ? '✓' : '✗'} Tailwind config found`);
  console.log(`  ${usesUtilityClasses ? '✓' : '✗'} Utility classes used\n`);

  // 7. 점수 계산
  console.log('📈 Step 7: Calculating scores...\n');

  const patterns = {
    stats: {
      totalFiles: fileList.length,
      vueFiles: vueFiles.files.filter(f => !f.isDirectory).length,
      tsFiles: tsFiles.files.filter(f => !f.isDirectory).length
    },
    apiInfo: {
      hasOpenApi,
      hasGrpc,
      hasRestApi,
      apiType: hasOpenApi ? 'OpenAPI' : (hasGrpc ? 'gRPC' : (hasRestApi ? 'REST' : 'none'))
    },
    apiUsage: {
      hasApiComposable,
      hasErrorHandling,
      hasTypeSafety
    },
    componentUsage,
    composableUsage,
    tailwindUsage: {
      hasTailwindConfig,
      usesUtilityClasses
    },
    codePatterns: {
      framework: deps['nuxt'] ? 'Nuxt 3' : 'Unknown',
      usesTypescript: tsFiles.files.filter(f => !f.isDirectory).length > 0,
      usesVue: vueFiles.files.filter(f => !f.isDirectory).length > 0
    }
  };

  // API 점수
  let apiScore = 0;
  if (hasOpenApi) apiScore += 40;
  else if (hasGrpc) apiScore += 35;
  else if (hasRestApi) apiScore += 25;
  
  if (hasApiComposable) apiScore += 10;
  if (hasErrorHandling) apiScore += 5;
  if (hasTypeSafety) apiScore += 5;

  // 컴포넌트 점수
  let componentScore = 0;
  const coreComponents = ['CommonTable', 'CommonPaginationTable', 'CommonButton', 'CommonLayout', 'CommonModal'];
  const usedCoreComponents = coreComponents.filter(comp => componentUsage[comp] > 0);
  componentScore += (usedCoreComponents.length / coreComponents.length) * 50;
  
  if (hasTailwindConfig) componentScore += 10;
  if (usesUtilityClasses) componentScore += 10;
  
  const totalUsage = Object.values(componentUsage).reduce((sum, count) => sum + count, 0);
  componentScore += Math.min(20, Math.floor(totalUsage / 5) * 2);
  
  const openerdComposables = ['usePaging', 'useBackendClient', 'useModalState'];
  const usedComposables = openerdComposables.filter(comp => composableUsage[comp] > 0);
  componentScore += (usedComposables.length / openerdComposables.length) * 10;

  const totalScore = Math.round((apiScore + componentScore) / 2);
  
  let tier = 'D';
  const avgScore = (apiScore + componentScore) / 2;
  if (avgScore >= 80) tier = 'S';
  else if (avgScore >= 60) tier = 'A';
  else if (avgScore >= 40) tier = 'B';
  else if (avgScore >= 20) tier = 'C';

  patterns.scores = {
    total: totalScore,
    api: Math.round(apiScore),
    component: Math.round(componentScore),
    tier
  };

  console.log('========================================');
  console.log('📊 SCORING RESULTS');
  console.log('========================================');
  console.log(`  🏆 Total Score: ${totalScore}/100 (Tier ${tier})`);
  console.log(`  🔌 API Score: ${Math.round(apiScore)}/100`);
  console.log(`  🎨 Component Score: ${Math.round(componentScore)}/100`);
  console.log('========================================\n');

  // 8. BestCase 저장
  console.log('💾 Step 8: Saving BestCase...');
  
  const sampleFiles = [];
  const vueComponents = fileList.filter(f => f.path.includes('components') && f.name.endsWith('.vue')).slice(0, 3);
  
  for (const file of vueComponents) {
    try {
      const content = await filesystem.readFile({ path: file.path });
      sampleFiles.push({
        path: file.name,
        content: content.content,
        purpose: 'Vue Component Sample'
      });
    } catch (e) {
      console.log(`  ⚠️ Failed to read: ${file.name}`);
    }
  }

  const result = await bestcase.saveBestCase({
    projectName: PROJECT_NAME,
    category: 'advanced-scan',
    description: `${PROJECT_NAME} - Advanced Analysis with Scoring (Tier ${tier})`,
    files: sampleFiles,
    patterns: patterns,
    tags: ['advanced', 'scored', tier, patterns.apiInfo.apiType, new Date().toISOString().split('T')[0]]
  });

  console.log(`  ✅ BestCase saved: ${result.id}`);
  console.log(`  📁 Location: ${result.filePath}\n`);
  
  console.log('✨ Analysis completed successfully!\n');

} catch (error) {
  console.log('❌ Error:', error.message);
}

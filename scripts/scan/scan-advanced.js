// 고급 프로젝트 스캐너 - Vue/TS 파일, gRPC/OpenAPI, 코드 패턴 분석

const PROJECT_NAME = '50.dktechin/frontend';
const projectsBasePath = 'D:/01.Work/01.Projects';
const targetPath = `${projectsBasePath}/${PROJECT_NAME}`;

console.log('🔍 고급 프로젝트 분석 시작');
console.log('📁 프로젝트:', PROJECT_NAME);
console.log('📂 경로:', targetPath);
console.log('');
console.log('='.repeat(60));
console.log('');

try {
  // 1단계: 전체 파일 스캔
  console.log('1️⃣ 전체 파일 스캔...');
  const allFiles = await filesystem.searchFiles({
    path: targetPath,
    recursive: true
  });
  
  console.log(`  발견: ${allFiles.files.length}개`);
  
  // 파일 분류
  const fileCategories = {
    vue: [],
    ts: [],
    js: [],
    config: [],
    api: [],
    composables: [],
    components: [],
    pages: [],
    server: [],
    proto: [],
    other: []
  };
  
  const stats = {
    total: 0,
    dirs: 0,
    byExtension: {}
  };
  
  allFiles.files.forEach(f => {
    if (f.isDirectory) {
      stats.dirs++;
      return;
    }
    
    stats.total++;
    const ext = f.name.split('.').pop() || 'no-ext';
    stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
    
    const path = f.path.toLowerCase();
    
    // 카테고리 분류
    if (ext === 'vue') fileCategories.vue.push(f);
    else if (ext === 'ts') {
      fileCategories.ts.push(f);
      if (path.includes('/api/') || path.includes('/server/')) fileCategories.api.push(f);
      if (path.includes('/composables/')) fileCategories.composables.push(f);
    }
    else if (ext === 'js') fileCategories.js.push(f);
    else if (path.includes('config') || ['json', 'yml', 'yaml'].includes(ext)) fileCategories.config.push(f);
    
    if (path.includes('/components/')) fileCategories.components.push(f);
    if (path.includes('/pages/')) fileCategories.pages.push(f);
    if (path.includes('/server/')) fileCategories.server.push(f);
    if (ext === 'proto') fileCategories.proto.push(f);
  });
  
  console.log('  ✓ 파일 분류 완료');
  console.log('');
  
  // 2단계: 주요 설정 파일 읽기
  console.log('2️⃣ 설정 파일 분석...');
  const configFiles = {};
  const configNames = [
    'package.json',
    'nuxt.config.ts',
    'nuxt.config.js',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.js',
    'app.vue'
  ];
  
  for (const name of configNames) {
    try {
      const content = await filesystem.readFile({
        path: `${targetPath}/${name}`
      });
      configFiles[name] = content.content;
      console.log(`  ✓ ${name}`);
    } catch (e) {
      // 파일 없음
    }
  }
  
  console.log('');
  
  // 3단계: 의존성 및 API 타입 감지
  console.log('3️⃣ 의존성 및 API 분석...');
  const apiInfo = {
    hasGrpc: false,
    hasOpenApi: false,
    grpcPackages: [],
    openApiPackages: [],
    otherApis: []
  };
  
  if (configFiles['package.json']) {
    try {
      const pkg = JSON.parse(configFiles['package.json']);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };
      
      // gRPC 감지
      const grpcKeywords = ['grpc', 'proto', '@grpc', 'protobuf'];
      Object.keys(allDeps).forEach(dep => {
        if (grpcKeywords.some(kw => dep.toLowerCase().includes(kw))) {
          apiInfo.hasGrpc = true;
          apiInfo.grpcPackages.push(dep);
        }
      });
      
      // OpenAPI 감지
      const openApiKeywords = ['openapi', 'swagger', '@~/openapi'];
      Object.keys(allDeps).forEach(dep => {
        if (openApiKeywords.some(kw => dep.toLowerCase().includes(kw))) {
          apiInfo.hasOpenApi = true;
          apiInfo.openApiPackages.push(dep);
        }
      });
      
      // 기타 API 클라이언트
      const apiKeywords = ['axios', 'fetch', 'apollo', 'graphql'];
      Object.keys(allDeps).forEach(dep => {
        if (apiKeywords.some(kw => dep.toLowerCase().includes(kw))) {
          if (!apiInfo.otherApis.includes(dep)) {
            apiInfo.otherApis.push(dep);
          }
        }
      });
      
      console.log(`  gRPC: ${apiInfo.hasGrpc ? '✓' : '✗'} ${apiInfo.grpcPackages.join(', ')}`);
      console.log(`  OpenAPI: ${apiInfo.hasOpenApi ? '✓' : '✗'} ${apiInfo.openApiPackages.join(', ')}`);
      console.log(`  기타 API: ${apiInfo.otherApis.join(', ')}`);
      
    } catch (e) {
      console.log('  ⚠️  package.json 파싱 실패');
    }
  }
  
  console.log('');
  
  // 4단계: 샘플 코드 수집 (Vue, TS)
  console.log('4️⃣ 샘플 코드 수집...');
  const sampleCode = {
    components: [],
    composables: [],
    api: [],
    pages: []
  };
  
  // Vue 컴포넌트 샘플 (최대 3개)
  const sampleComponents = fileCategories.components.slice(0, 3);
  for (const comp of sampleComponents) {
    try {
      const content = await filesystem.readFile({ path: comp.path });
      sampleCode.components.push({
        name: comp.name,
        path: comp.path.replace(targetPath + '/', ''),
        content: content.content.substring(0, 1000) // 처음 1000자만
      });
      console.log(`  ✓ 컴포넌트: ${comp.name}`);
    } catch (e) {}
  }
  
  // Composables 샘플 (최대 3개)
  const sampleComposables = fileCategories.composables.slice(0, 3);
  for (const comp of sampleComposables) {
    try {
      const content = await filesystem.readFile({ path: comp.path });
      sampleCode.composables.push({
        name: comp.name,
        path: comp.path.replace(targetPath + '/', ''),
        content: content.content.substring(0, 1000)
      });
      console.log(`  ✓ Composable: ${comp.name}`);
    } catch (e) {}
  }
  
  // API 샘플 (최대 3개)
  const sampleApi = fileCategories.api.slice(0, 3);
  for (const api of sampleApi) {
    try {
      const content = await filesystem.readFile({ path: api.path });
      sampleCode.api.push({
        name: api.name,
        path: api.path.replace(targetPath + '/', ''),
        content: content.content.substring(0, 1000)
      });
      console.log(`  ✓ API: ${api.name}`);
    } catch (e) {}
  }
  
  console.log('');
  
  // 5단계: 코드 패턴 분석
  console.log('5️⃣ 코드 패턴 분석...');
  const patterns = {
    usesCompositionApi: false,
    usesOptionsApi: false,
    usesPinia: false,
    usesVueRouter: false,
    usesTypescript: fileCategories.ts.length > 0,
    framework: 'unknown',
    uiLibrary: 'unknown'
  };
  
  if (configFiles['package.json']) {
    try {
      const pkg = JSON.parse(configFiles['package.json']);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps['nuxt']) patterns.framework = 'Nuxt 3';
      else if (deps['next']) patterns.framework = 'Next.js';
      else if (deps['vue']) patterns.framework = 'Vue 3';
      else if (deps['react']) patterns.framework = 'React';
      
      if (deps['pinia'] || deps['@pinia/nuxt']) patterns.usesPinia = true;
      if (deps['vue-router']) patterns.usesVueRouter = true;
      
      if (deps['element-plus']) patterns.uiLibrary = 'Element Plus';
      else if (deps['vuetify']) patterns.uiLibrary = 'Vuetify';
      else if (deps['ant-design-vue']) patterns.uiLibrary = 'Ant Design Vue';
      
    } catch (e) {}
  }
  
  console.log(`  프레임워크: ${patterns.framework}`);
  console.log(`  TypeScript: ${patterns.usesTypescript ? '✓' : '✗'}`);
  console.log(`  Pinia: ${patterns.usesPinia ? '✓' : '✗'}`);
  console.log(`  UI 라이브러리: ${patterns.uiLibrary}`);
  console.log('');
  
  // 6단계: BestCase 저장
  console.log('='.repeat(60));
  console.log('');
  console.log('💾 고급 BestCase 저장 중...');
  
  const result = await bestcase.saveBestCase({
    projectName: PROJECT_NAME,
    category: 'advanced-scan',
    description: `${PROJECT_NAME} 프로젝트 고급 분석 (Vue/TS 샘플 포함)`,
    files: Object.entries(configFiles).map(([name, content]) => ({
      path: name,
      content: content,
      purpose: '설정 파일'
    })),
    patterns: {
      stats: {
        totalFiles: stats.total,
        totalDirs: stats.dirs,
        vueFiles: fileCategories.vue.length,
        tsFiles: fileCategories.ts.length,
        jsFiles: fileCategories.js.length,
        components: fileCategories.components.length,
        pages: fileCategories.pages.length,
        api: fileCategories.api.length,
        composables: fileCategories.composables.length
      },
      fileTypes: stats.byExtension,
      apiInfo: apiInfo,
      codePatterns: patterns,
      sampleCode: sampleCode,
      projectStructure: {
        hasComponents: fileCategories.components.length > 0,
        hasPages: fileCategories.pages.length > 0,
        hasServer: fileCategories.server.length > 0,
        hasComposables: fileCategories.composables.length > 0
      }
    },
    tags: [
      'advanced-scan',
      patterns.framework.toLowerCase().replace(/\s+/g, '-'),
      apiInfo.hasGrpc ? 'grpc' : null,
      apiInfo.hasOpenApi ? 'openapi' : null,
      patterns.usesTypescript ? 'typescript' : 'javascript'
    ].filter(Boolean)
  });
  
  console.log('');
  console.log('🎉 고급 BestCase 저장 완료!');
  console.log('');
  console.log(`📌 ID: ${result.id}`);
  console.log(`📁 프로젝트: ${PROJECT_NAME}`);
  console.log(`📊 통계:`);
  console.log(`  - Vue 파일: ${fileCategories.vue.length}개`);
  console.log(`  - TS 파일: ${fileCategories.ts.length}개`);
  console.log(`  - 컴포넌트: ${fileCategories.components.length}개`);
  console.log(`  - API 파일: ${fileCategories.api.length}개`);
  console.log(`  - 샘플 코드: ${Object.values(sampleCode).flat().length}개`);
  console.log('');
  console.log('✨ 이제 LLM이 프로젝트 패턴과 샘플 코드를 참고할 수 있습니다!');
  
} catch (error) {
  console.log('');
  console.log('❌ 오류:', error.message);
}

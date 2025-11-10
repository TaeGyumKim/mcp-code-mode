// 간단한 고급 스캔 테스트
const PROJECT_NAME = '03.nuxt3_starter';
const projectsBasePath = 'D:/01.Work/01.Projects';
const targetPath = `${projectsBasePath}/${PROJECT_NAME}`;

console.log('🔍 간단한 고급 분석 테스트');
console.log('📁 프로젝트:', PROJECT_NAME);
console.log('');

try {
  // 1. Vue 파일 찾기
  console.log('1️⃣ Vue 파일 검색...');
  const vueFiles = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*.vue',
    recursive: true
  });
  console.log(`  발견: ${vueFiles.files.filter(f => !f.isDirectory).length}개`);
  console.log('');
  
  // 2. TypeScript 파일 찾기
  console.log('2️⃣ TypeScript 파일 검색...');
  const tsFiles = await filesystem.searchFiles({
    path: targetPath,
    pattern: '*.ts',
    recursive: true
  });
  console.log(`  발견: ${tsFiles.files.filter(f => !f.isDirectory).length}개`);
  console.log('');
  
  // 3. package.json 읽기
  console.log('3️⃣ package.json 읽기...');
  const pkg = await filesystem.readFile({
    path: `${targetPath}/package.json`
  });
  
  const pkgData = JSON.parse(pkg.content);
  const allDeps = {
    ...pkgData.dependencies || {},
    ...pkgData.devDependencies || {}
  };
  
  // gRPC 체크
  const hasGrpc = Object.keys(allDeps).some(dep => 
    dep.includes('grpc') || dep.includes('proto')
  );
  
  // OpenAPI 체크
  const hasOpenApi = Object.keys(allDeps).some(dep => 
    dep.includes('openapi') || dep.includes('swagger')
  );
  
  console.log(`  gRPC: ${hasGrpc ? '✓' : '✗'}`);
  console.log(`  OpenAPI: ${hasOpenApi ? '✓' : '✗'}`);
  console.log('');
  
  // 4. 샘플 Vue 파일 읽기 (첫 번째)
  const firstVue = vueFiles.files.find(f => !f.isDirectory && f.name.endsWith('.vue'));
  if (firstVue) {
    console.log('4️⃣ Vue 샘플 읽기:', firstVue.name);
    const vueContent = await filesystem.readFile({ path: firstVue.path });
    console.log(`  크기: ${vueContent.content.length} bytes`);
    console.log(`  미리보기: ${vueContent.content.substring(0, 200)}...`);
    console.log('');
  }
  
  console.log('✅ 테스트 완료!');
  
} catch (error) {
  console.log('❌ 오류:', error.message);
}

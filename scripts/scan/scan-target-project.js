// 특정 프로젝트를 분석하고 BestCase로 저장
// 사용법: 스크립트 수정하여 PROJECT_NAME 변경

const PROJECT_NAME = '03.nuxt3_starter'; // 여기를 원하는 프로젝트명으로 변경
const projectsBasePath = 'D:/01.Work/01.Projects';
const targetPath = `${projectsBasePath}/${PROJECT_NAME}`;

console.log('🎯 타겟 프로젝트:', PROJECT_NAME);
console.log('📂 경로:', targetPath);
console.log('');

try {
  // 1단계: 프로젝트 전체 파일 스캔
  console.log('📡 프로젝트 스캔 중...');
  
  const allFiles = await filesystem.searchFiles({
    path: targetPath,
    recursive: true
  });
  
  console.log(`발견: ${allFiles.files.length}개 항목`);
  console.log('');
  
  // 통계
  const stats = {
    files: 0,
    dirs: 0,
    byExtension: {},
    byDirectory: {}
  };
  
  allFiles.files.forEach(f => {
    if (f.isDirectory) {
      stats.dirs++;
      const dirName = f.name;
      stats.byDirectory[dirName] = (stats.byDirectory[dirName] || 0) + 1;
    } else {
      stats.files++;
      const ext = f.name.includes('.') ? f.name.split('.').pop() : 'no-ext';
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
    }
  });
  
  console.log(`📊 통계:`);
  console.log(`  파일: ${stats.files}개`);
  console.log(`  디렉토리: ${stats.dirs}개`);
  console.log('');
  
  console.log('📋 파일 타입 TOP 10:');
  Object.entries(stats.byExtension)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([ext, count]) => {
      console.log(`  .${ext}: ${count}개`);
    });
  
  console.log('');
  console.log('='.repeat(60));
  
  // 2단계: 주요 설정 파일 읽기
  console.log('');
  console.log('📝 주요 설정 파일 읽기...');
  console.log('');
  
  const importantFiles = [
    'package.json',
    'nuxt.config.ts',
    'nuxt.config.js',
    'tsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'app.vue',
    'App.vue',
    'index.html',
    'README.md',
    '.gitignore',
    'tailwind.config.js',
    'tailwind.config.ts',
    'postcss.config.js'
  ];
  
  const collectedFiles = [];
  let totalBytes = 0;
  
  for (const fileName of importantFiles) {
    try {
      const content = await filesystem.readFile({
        path: `${targetPath}/${fileName}`
      });
      
      collectedFiles.push({
        path: fileName,
        content: content.content,
        purpose: getFilePurpose(fileName)
      });
      
      totalBytes += content.size;
      console.log(`  ✓ ${fileName} (${formatBytes(content.size)})`);
      
    } catch (e) {
      // 파일 없음 - 무시
    }
  }
  
  console.log('');
  console.log(`✅ ${collectedFiles.length}개 파일 읽기 완료 (총 ${formatBytes(totalBytes)})`);
  
  // 3단계: package.json 분석
  const pkgFile = collectedFiles.find(f => f.path === 'package.json');
  if (pkgFile) {
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('📦 package.json 분석:');
    
    try {
      const pkg = JSON.parse(pkgFile.content);
      console.log(`  이름: ${pkg.name || 'N/A'}`);
      console.log(`  버전: ${pkg.version || 'N/A'}`);
      
      if (pkg.dependencies) {
        const deps = Object.keys(pkg.dependencies);
        console.log(`  의존성: ${deps.length}개`);
        
        // 주요 프레임워크 감지
        const frameworks = [];
        if (deps.includes('nuxt')) frameworks.push('Nuxt');
        if (deps.includes('next')) frameworks.push('Next.js');
        if (deps.includes('react')) frameworks.push('React');
        if (deps.includes('vue')) frameworks.push('Vue');
        if (deps.includes('svelte')) frameworks.push('Svelte');
        
        if (frameworks.length > 0) {
          console.log(`  프레임워크: ${frameworks.join(', ')}`);
        }
        
        // 주요 라이브러리
        const libs = [];
        if (deps.includes('typescript') || pkg.devDependencies?.typescript) libs.push('TypeScript');
        if (deps.includes('tailwindcss') || pkg.devDependencies?.tailwindcss) libs.push('Tailwind CSS');
        if (deps.includes('@pinia/nuxt') || deps.includes('pinia')) libs.push('Pinia');
        if (deps.includes('axios')) libs.push('Axios');
        
        if (libs.length > 0) {
          console.log(`  주요 라이브러리: ${libs.join(', ')}`);
        }
      }
      
      if (pkg.scripts) {
        const scripts = Object.keys(pkg.scripts);
        console.log(`  스크립트: ${scripts.join(', ')}`);
      }
      
    } catch (e) {
      console.log('  ⚠️  package.json 파싱 실패');
    }
  }
  
  // 4단계: BestCase 저장
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('💾 BestCase 저장 중...');
  
  const result = await bestcase.saveBestCase({
    projectName: PROJECT_NAME,
    category: 'project-structure',
    description: `${PROJECT_NAME} 프로젝트의 전체 구조 및 설정`,
    files: collectedFiles,
    patterns: {
      totalFiles: stats.files,
      totalDirs: stats.dirs,
      fileTypes: stats.byExtension,
      topExtensions: Object.entries(stats.byExtension)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ext, count]) => ({ ext, count })),
      structure: {
        hasPackageJson: collectedFiles.some(f => f.path === 'package.json'),
        hasNuxtConfig: collectedFiles.some(f => f.path.startsWith('nuxt.config')),
        hasTsConfig: collectedFiles.some(f => f.path === 'tsconfig.json'),
        hasViteConfig: collectedFiles.some(f => f.path.startsWith('vite.config')),
        hasTailwind: collectedFiles.some(f => f.path.startsWith('tailwind.config'))
      }
    },
    tags: [
      'full-scan',
      PROJECT_NAME,
      new Date().toISOString().split('T')[0]
    ]
  });
  
  console.log('');
  console.log('🎉 BestCase 저장 완료!');
  console.log('');
  console.log(`📌 ID: ${result.id}`);
  console.log(`📁 프로젝트: ${PROJECT_NAME}`);
  console.log(`📄 저장된 설정 파일: ${collectedFiles.length}개`);
  console.log(`📊 분석된 전체 파일: ${stats.files}개`);
  console.log(`💾 저장 위치: D:/01.Work/01.Projects/.bestcases/`);
  console.log('');
  console.log('💡 이제 다른 프로젝트에서 이 구조를 재사용할 수 있습니다!');
  
} catch (error) {
  console.log('');
  console.log('❌ 오류:', error.message);
}

function getFilePurpose(fileName) {
  const purposes = {
    'package.json': '프로젝트 의존성 및 스크립트',
    'nuxt.config.ts': 'Nuxt 설정 (TypeScript)',
    'nuxt.config.js': 'Nuxt 설정 (JavaScript)',
    'tsconfig.json': 'TypeScript 컴파일러 설정',
    'vite.config.ts': 'Vite 빌드 도구 설정 (TS)',
    'vite.config.js': 'Vite 빌드 도구 설정 (JS)',
    'app.vue': '루트 애플리케이션 컴포넌트',
    'App.vue': '루트 애플리케이션 컴포넌트',
    'index.html': 'HTML 엔트리 포인트',
    'README.md': '프로젝트 문서',
    '.gitignore': 'Git 제외 파일 목록',
    'tailwind.config.js': 'Tailwind CSS 설정',
    'tailwind.config.ts': 'Tailwind CSS 설정 (TS)',
    'postcss.config.js': 'PostCSS 설정'
  };
  return purposes[fileName] || '프로젝트 파일';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

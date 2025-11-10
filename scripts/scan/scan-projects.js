// D:\01.Work\01.Projects 프로젝트 탐색 및 BestCase 저장

const projectsBasePath = 'D:/01.Work/01.Projects';

console.log('📂 프로젝트 디렉토리 탐색:', projectsBasePath);
console.log('');

try {
  // 1단계: 프로젝트 목록 확인
  const projects = await filesystem.searchFiles({
    path: projectsBasePath,
    recursive: false
  });
  
  console.log(`발견된 항목: ${projects.files.length}개`);
  console.log('');
  
  // 디렉토리만 필터링
  const projectDirs = projects.files.filter(f => f.isDirectory);
  
  console.log(`📁 프로젝트 디렉토리: ${projectDirs.length}개`);
  console.log('');
  
  // 각 프로젝트 이름 출력
  projectDirs.slice(0, 20).forEach((dir, idx) => {
    console.log(`${idx + 1}. ${dir.name}`);
  });
  
  if (projectDirs.length > 20) {
    console.log(`... 외 ${projectDirs.length - 20}개 더`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  
  // 2단계: 특정 프로젝트 분석 (첫 번째 프로젝트 또는 지정된 프로젝트)
  if (projectDirs.length > 0) {
    // my-nuxt-app 찾기
    let targetProject = projectDirs.find(p => p.name === 'my-nuxt-app');
    
    if (!targetProject) {
      // 없으면 첫 번째 프로젝트 사용
      targetProject = projectDirs[0];
      console.log(`⚠️  'my-nuxt-app'을 찾을 수 없어 첫 번째 프로젝트를 사용합니다: ${targetProject.name}`);
    } else {
      console.log(`✓ 'my-nuxt-app' 프로젝트를 찾았습니다!`);
    }
    
    console.log('');
    console.log(`🔍 프로젝트 분석 중: ${targetProject.name}`);
    console.log(`경로: ${targetProject.path}`);
    console.log('');
    
    // 프로젝트 내 파일 검색
    const allFiles = await filesystem.searchFiles({
      path: targetProject.path,
      recursive: true
    });
    
    console.log(`총 파일/디렉토리: ${allFiles.files.length}개`);
    
    // 파일 타입별 통계
    const stats = {
      files: 0,
      dirs: 0,
      byExtension: {}
    };
    
    allFiles.files.forEach(f => {
      if (f.isDirectory) {
        stats.dirs++;
      } else {
        stats.files++;
        const ext = f.name.includes('.') ? f.name.split('.').pop() : 'no-ext';
        stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
      }
    });
    
    console.log(`  - 파일: ${stats.files}개`);
    console.log(`  - 디렉토리: ${stats.dirs}개`);
    console.log('');
    console.log('📊 파일 타입 분포:');
    
    const sortedExts = Object.entries(stats.byExtension)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedExts.forEach(([ext, count]) => {
      console.log(`  ${ext}: ${count}개`);
    });
    
    console.log('');
    console.log('='.repeat(60));
    
    // 3단계: 주요 설정 파일 읽기
    console.log('📝 주요 설정 파일 읽기 중...');
    console.log('');
    
    const importantFiles = [
      'package.json',
      'nuxt.config.ts',
      'nuxt.config.js',
      'tsconfig.json',
      'vite.config.ts',
      'app.vue',
      'README.md'
    ];
    
    const collectedFiles = [];
    
    for (const fileName of importantFiles) {
      try {
        const filePath = `${targetProject.path}/${fileName}`;
        const content = await filesystem.readFile({ path: filePath });
        
        collectedFiles.push({
          path: fileName,
          content: content.content,
          purpose: getFilePurpose(fileName)
        });
        
        console.log(`  ✓ ${fileName} (${content.size} bytes)`);
      } catch (e) {
        console.log(`  ✗ ${fileName} (없음)`);
      }
    }
    
    console.log('');
    console.log(`읽은 파일: ${collectedFiles.length}개`);
    
    // 4단계: BestCase 저장
    if (collectedFiles.length > 0) {
      console.log('');
      console.log('💾 BestCase 저장 중...');
      
      const result = await bestcase.saveBestCase({
        projectName: targetProject.name,
        category: 'auto-scan',
        description: `${targetProject.name} 프로젝트 자동 스캔 결과`,
        files: collectedFiles,
        patterns: {
          totalFiles: stats.files,
          totalDirs: stats.dirs,
          fileTypes: stats.byExtension,
          structure: sortedExts.reduce((acc, [ext, count]) => {
            acc[ext] = count;
            return acc;
          }, {})
        },
        tags: ['auto-scan', 'analyzed', new Date().toISOString().split('T')[0]]
      });
      
      console.log('');
      console.log('✅ BestCase 저장 완료!');
      console.log(`ID: ${result.id}`);
      console.log(`프로젝트: ${targetProject.name}`);
      console.log(`저장된 파일: ${collectedFiles.length}개`);
      console.log(`분석된 총 파일: ${stats.files}개`);
    }
    
  } else {
    console.log('⚠️  프로젝트를 찾을 수 없습니다.');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✨ 완료!');
  
} catch (error) {
  console.log('');
  console.log('❌ 오류 발생:', error.message);
  console.log('');
  console.log('💡 확인사항:');
  console.log(`  - 경로가 존재하는지: ${projectsBasePath}`);
  console.log('  - 읽기 권한이 있는지');
  console.log('  - 경로 구분자가 올바른지 (/ 사용)');
}

function getFilePurpose(fileName) {
  const purposes = {
    'package.json': '프로젝트 의존성 및 스크립트',
    'nuxt.config.ts': 'Nuxt 프레임워크 설정',
    'nuxt.config.js': 'Nuxt 프레임워크 설정',
    'tsconfig.json': 'TypeScript 컴파일러 설정',
    'vite.config.ts': 'Vite 빌드 도구 설정',
    'app.vue': '루트 애플리케이션 컴포넌트',
    'README.md': '프로젝트 문서'
  };
  return purposes[fileName] || '프로젝트 파일';
}

// D:\01.Work\01.Projects의 모든 프로젝트를 스캔하고 BestCase 저장

const projectsBasePath = 'D:/01.Work/01.Projects';

console.log('🚀 대량 프로젝트 스캔 시작');
console.log('📂 기본 경로:', projectsBasePath);
console.log('');
console.log('='.repeat(60));

let totalScanned = 0;
let totalSuccess = 0;
let totalFailed = 0;
const results = [];

try {
  // 1단계: 모든 프로젝트 목록 가져오기
  const allItems = await filesystem.searchFiles({
    path: projectsBasePath,
    recursive: false
  });
  
  const projectDirs = allItems.files
    .filter(f => f.isDirectory)
    .filter(f => {
      // 00 ~ 50 번대 프로젝트만 필터링
      const name = f.name;
      const match = name.match(/^(\d{2})\./);
      if (match) {
        const num = parseInt(match[1]);
        return num >= 0 && num <= 50;
      }
      return false;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  
  console.log(`\n📋 발견된 프로젝트: ${projectDirs.length}개`);
  console.log('');
  
  projectDirs.forEach((dir, idx) => {
    console.log(`${idx + 1}. ${dir.name}`);
  });
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('🔍 각 프로젝트 스캔 시작...');
  console.log('');
  
  // 2단계: 각 프로젝트 스캔
  for (let i = 0; i < projectDirs.length; i++) {
    const project = projectDirs[i];
    const projectNum = i + 1;
    
    console.log(`[${projectNum}/${projectDirs.length}] ${project.name}`);
    console.log('-'.repeat(60));
    
    totalScanned++;
    
    try {
      // 프로젝트 파일 스캔
      const allFiles = await filesystem.searchFiles({
        path: project.path,
        recursive: true
      });
      
      // 통계
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
      
      console.log(`  📊 파일: ${stats.files}개, 디렉토리: ${stats.dirs}개`);
      
      // 주요 설정 파일 읽기
      const importantFiles = [
        'package.json',
        'nuxt.config.ts',
        'nuxt.config.js',
        'tsconfig.json',
        'vite.config.ts',
        'vite.config.js',
        'app.vue',
        'README.md',
        '.gitignore'
      ];
      
      const collectedFiles = [];
      
      for (const fileName of importantFiles) {
        try {
          const content = await filesystem.readFile({
            path: `${project.path}/${fileName}`
          });
          
          collectedFiles.push({
            path: fileName,
            content: content.content,
            purpose: getFilePurpose(fileName)
          });
          
        } catch (e) {
          // 파일 없음 - 무시
        }
      }
      
      console.log(`  📄 설정 파일: ${collectedFiles.length}개`);
      
      // BestCase 저장
      if (collectedFiles.length > 0 || stats.files > 0) {
        const result = await bestcase.saveBestCase({
          projectName: project.name,
          category: 'bulk-scan',
          description: `${project.name} 프로젝트 자동 스캔 (대량 스캔)`,
          files: collectedFiles,
          patterns: {
            totalFiles: stats.files,
            totalDirs: stats.dirs,
            fileTypes: stats.byExtension,
            topExtensions: Object.entries(stats.byExtension)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([ext, count]) => ({ ext, count }))
          },
          tags: [
            'bulk-scan',
            'auto',
            new Date().toISOString().split('T')[0]
          ]
        });
        
        console.log(`  ✅ BestCase 저장: ${result.id.substring(0, 40)}...`);
        
        totalSuccess++;
        results.push({
          name: project.name,
          status: 'success',
          files: stats.files,
          configs: collectedFiles.length,
          id: result.id
        });
      } else {
        console.log(`  ⚠️  빈 프로젝트 - 스킵`);
        results.push({
          name: project.name,
          status: 'skipped',
          reason: 'empty'
        });
      }
      
    } catch (error) {
      console.log(`  ❌ 실패: ${error.message}`);
      totalFailed++;
      results.push({
        name: project.name,
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }
  
  // 3단계: 최종 리포트
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 스캔 완료 리포트');
  console.log('');
  console.log(`총 스캔: ${totalScanned}개`);
  console.log(`성공: ${totalSuccess}개`);
  console.log(`실패: ${totalFailed}개`);
  console.log('');
  
  // 성공한 프로젝트 목록
  const successResults = results.filter(r => r.status === 'success');
  if (successResults.length > 0) {
    console.log('✅ 성공한 프로젝트:');
    successResults.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.name} - ${r.files}개 파일, ${r.configs}개 설정`);
    });
    console.log('');
  }
  
  // 실패한 프로젝트 목록
  const failedResults = results.filter(r => r.status === 'failed');
  if (failedResults.length > 0) {
    console.log('❌ 실패한 프로젝트:');
    failedResults.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.name} - ${r.error}`);
    });
    console.log('');
  }
  
  // 스킵된 프로젝트
  const skippedResults = results.filter(r => r.status === 'skipped');
  if (skippedResults.length > 0) {
    console.log('⏭️  스킵된 프로젝트: ${skippedResults.length}개');
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('');
  console.log('🎉 모든 프로젝트 스캔 완료!');
  console.log(`💾 저장 위치: ${projectsBasePath}/.bestcases/`);
  console.log('');
  console.log('💡 이제 모든 프로젝트의 BestCase를 활용할 수 있습니다!');
  
} catch (error) {
  console.log('');
  console.log('❌ 전체 스캔 오류:', error.message);
}

function getFilePurpose(fileName) {
  const purposes = {
    'package.json': '프로젝트 의존성 및 스크립트',
    'nuxt.config.ts': 'Nuxt 설정',
    'nuxt.config.js': 'Nuxt 설정',
    'tsconfig.json': 'TypeScript 설정',
    'vite.config.ts': 'Vite 설정',
    'vite.config.js': 'Vite 설정',
    'app.vue': '루트 컴포넌트',
    'README.md': '프로젝트 문서',
    '.gitignore': 'Git 제외 목록'
  };
  return purposes[fileName] || '프로젝트 파일';
}

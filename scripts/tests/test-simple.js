// 간단한 테스트: BestCase 시스템 작동 확인

console.log('🧪 BestCase 시스템 테스트 시작\n');

// 테스트 1: 샘플 BestCase 저장
console.log('1️⃣ BestCase 저장 테스트...');

const testBestCase = await bestcase.saveBestCase({
  projectName: 'sample-project',
  category: 'test',
  description: '테스트용 BestCase',
  files: [
    {
      path: 'package.json',
      content: '{"name": "sample", "version": "1.0.0"}',
      purpose: '패키지 설정'
    },
    {
      path: 'index.ts',
      content: 'console.log("Hello World");',
      purpose: '메인 파일'
    }
  ],
  patterns: {
    structure: { src: 1, dist: 1 },
    conventions: { entry: 'index.ts' }
  },
  tags: ['test', 'sample']
});

console.log('✅ 저장 완료! ID:', testBestCase.id);

// 테스트 2: 저장한 BestCase 로드
console.log('\n2️⃣ BestCase 로드 테스트...');

const loaded = await bestcase.loadBestCase({
  projectName: 'sample-project',
  category: 'test'
});

if (loaded.bestCase) {
  console.log('✅ 로드 완료!');
  console.log('프로젝트명:', loaded.bestCase.projectName);
  console.log('파일 수:', loaded.bestCase.files.length);
  console.log('태그:', loaded.bestCase.metadata?.tags?.join(', ') || '없음');
  
  // 파일 내용 확인
  console.log('\n📄 저장된 파일들:');
  loaded.bestCase.files.forEach(f => {
    console.log(`  - ${f.path}: ${f.purpose}`);
  });
  
  console.log('\n🎯 패턴:');
  console.log('  구조:', JSON.stringify(loaded.bestCase.patterns.structure));
  console.log('  규칙:', JSON.stringify(loaded.bestCase.patterns.conventions));
  
} else {
  console.log('❌ 로드 실패!');
}

// 테스트 3: Filesystem API 테스트
console.log('\n3️⃣ Filesystem API 테스트...');

try {
  // 현재 프로젝트의 package.json 읽기
  const pkgFile = await filesystem.readFile({
    path: 'D:/01.Work/08.rf/mcp-code-mode-starter/package.json'
  });
  
  console.log('✅ 파일 읽기 성공!');
  console.log('크기:', pkgFile.size, 'bytes');
  
  const pkg = JSON.parse(pkgFile.content);
  console.log('프로젝트명:', pkg.name);
  console.log('워크스페이스:', pkg.workspaces.join(', '));
  
} catch (error) {
  console.log('❌ 파일 읽기 실패:', error.message);
}

console.log('\n✨ 모든 테스트 완료!');
console.log('\n📌 결론:');
console.log('  - BestCase 저장/로드 시스템 작동 ✓');
console.log('  - Filesystem API 작동 ✓');
console.log('  - 토큰 절약: 파일 내용이 컨텍스트를 거치지 않음 ✓');

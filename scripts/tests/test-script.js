// D:/01.Work/01.Projects/my-nuxt-app 프로젝트의 구조를 BestCase로 저장

const projectPath = 'D:/01.Work/01.Projects/my-nuxt-app';

console.log('프로젝트 스캔 시작:', projectPath);

// 프로젝트 구조 파악
const allFiles = await filesystem.searchFiles({
  path: projectPath,
  recursive: true
});

console.log(`총 ${allFiles.files.length}개 파일 발견`);

// 주요 설정 파일들 읽기
const importantFiles = [
  'package.json',
  'nuxt.config.ts',
  'nuxt.config.js',
  'tsconfig.json',
  'app.vue',
  '.gitignore',
  'README.md'
];

const collectedFiles = [];

for (const fileName of importantFiles) {
  try {
    const fileContent = await filesystem.readFile({
      path: `${projectPath}/${fileName}`
    });
    
    collectedFiles.push({
      path: fileName,
      content: fileContent.content,
      purpose: getPurpose(fileName)
    });
    
    console.log(`✓ ${fileName} 읽기 완료 (${fileContent.size} bytes)`);
  } catch (error) {
    console.log(`✗ ${fileName} 없음`);
  }
}

// 프로젝트 구조 분석
const structure = {
  directories: {},
  fileTypes: {}
};

for (const file of allFiles.files) {
  if (file.isDirectory) {
    const dirName = file.name;
    structure.directories[dirName] = (structure.directories[dirName] || 0) + 1;
  } else {
    const ext = file.name.split('.').pop() || 'none';
    structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
  }
}

console.log('프로젝트 구조 분석 완료');
console.log('디렉토리:', Object.keys(structure.directories).slice(0, 10));
console.log('파일 타입:', structure.fileTypes);

// BestCase 저장
const result = await bestcase.saveBestCase({
  projectName: 'my-nuxt-app',
  category: 'nuxt3-project',
  description: 'Nuxt3 프로젝트 표준 구조 및 설정',
  files: collectedFiles,
  patterns: {
    structure: structure,
    totalFiles: allFiles.files.length,
    conventions: {
      componentDir: 'components',
      pageDir: 'pages',
      apiDir: 'server/api',
      layoutDir: 'layouts',
      middlewareDir: 'middleware'
    }
  },
  tags: ['nuxt3', 'vue', 'typescript', 'ssr']
});

console.log('');
console.log('🎉 BestCase 저장 완료!');
console.log('ID:', result.id);
console.log('저장된 파일 수:', collectedFiles.length);
console.log('프로젝트 구조 패턴 저장됨');

function getPurpose(fileName) {
  const purposes = {
    'package.json': '프로젝트 의존성 및 스크립트 정의',
    'nuxt.config.ts': 'Nuxt 프레임워크 설정',
    'nuxt.config.js': 'Nuxt 프레임워크 설정',
    'tsconfig.json': 'TypeScript 컴파일러 설정',
    'app.vue': '루트 애플리케이션 컴포넌트',
    '.gitignore': 'Git 버전 관리 제외 파일 목록',
    'README.md': '프로젝트 문서'
  };
  return purposes[fileName] || '프로젝트 파일';
}

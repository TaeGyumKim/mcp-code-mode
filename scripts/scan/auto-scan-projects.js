/**
 * 자동 프로젝트 스캔 스크립트
 * Docker 컨테이너에서 주기적으로 실행되어 BestCase를 업데이트합니다.
 */

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PROJECTS_BASE_PATH = process.env.PROJECTS_PATH || '/projects';
const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || `${PROJECTS_BASE_PATH}/.bestcases`;

/**
 * 디렉토리가 Nuxt 프로젝트인지 확인
 */
function isNuxtProject(projectPath) {
  try {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return false;
    }
    
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Nuxt 관련 패키지 확인
    return deps['nuxt'] || deps['nuxt3'] || deps['@nuxt/core'];
  } catch (error) {
    return false;
  }
}

/**
 * 모든 Nuxt 프로젝트 자동 탐색
 */
function findAllNuxtProjects(basePath) {
  const nuxtProjects = [];
  
  try {
    const entries = readdirSync(basePath);
    
    for (const entry of entries) {
      // .bestcases 디렉토리는 스킵
      if (entry === '.bestcases' || entry.startsWith('.')) {
        continue;
      }
      
      const fullPath = join(basePath, entry);
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 디렉토리가 Nuxt 프로젝트인지 확인
          if (isNuxtProject(fullPath)) {
            nuxtProjects.push({
              name: entry,
              path: fullPath,
              category: 'auto-scan'
            });
            console.log('  ✓ Found Nuxt project: ' + entry);
          } else {
            // 하위 디렉토리도 확인 (1단계 깊이만)
            try {
              const subEntries = readdirSync(fullPath);
              for (const subEntry of subEntries) {
                if (subEntry.startsWith('.')) continue;
                
                const subPath = join(fullPath, subEntry);
                try {
                  const subStat = statSync(subPath);
                  if (subStat.isDirectory() && isNuxtProject(subPath)) {
                    nuxtProjects.push({
                      name: entry + '/' + subEntry,
                      path: subPath,
                      category: 'auto-scan'
                    });
                    console.log('  ✓ Found Nuxt project: ' + entry + '/' + subEntry);
                  }
                } catch (err) {
                  // 권한 문제 등으로 접근 불가한 경우 스킵
                }
              }
            } catch (err) {
              // 하위 디렉토리 읽기 실패 시 스킵
            }
          }
        }
      } catch (err) {
        // 파일 stat 실패 시 스킵
        continue;
      }
    }
  } catch (error) {
    console.log('⚠️ Error scanning projects directory:', error.message);
  }
  
  return nuxtProjects;
}

// 프로젝트 목록 동적 생성
console.log('🔍 Scanning for Nuxt projects in: ' + PROJECTS_BASE_PATH);
const PROJECTS_TO_SCAN = findAllNuxtProjects(PROJECTS_BASE_PATH);
console.log('📊 Found ' + PROJECTS_TO_SCAN.length + ' Nuxt project(s)\n');

/**
 * 프로젝트 스캔 코드 생성
 */
function generateScanCode(project) {
  return `
const PROJECT_NAME = '${project.name}';
const projectsBasePath = '${PROJECTS_BASE_PATH}';
const targetPath = '${project.path}';

try {
  console.log('========================================');
  console.log(\`🔍 Scanning: \${PROJECT_NAME}\`);
  console.log('========================================');

  // 1. Vue/TS 파일 스캔
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

  console.log(\`📊 Found \${fileList.length} files (Vue: \${vueFiles.files.filter(f => !f.isDirectory).length}, TS: \${tsFiles.files.filter(f => !f.isDirectory).length})\`);

  // 2. package.json 읽기
  let pkgContent = null;
  let pkg = {};
  try {
    pkgContent = await filesystem.readFile({ path: \`\${targetPath}/package.json\` });
    pkg = JSON.parse(pkgContent.content);
  } catch (e) {
    console.log('⚠️ package.json not found, skipping API detection');
  }

  // 3. API 감지
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const grpcKeywords = ['grpc', 'proto', '@grpc', 'protobuf'];
  const openApiKeywords = ['openapi', 'swagger', '@~/openapi'];

  const hasGrpc = Object.keys(deps).some(dep => 
    grpcKeywords.some(kw => dep.toLowerCase().includes(kw))
  );

  const hasOpenApi = Object.keys(deps).some(dep => 
    openApiKeywords.some(kw => dep.toLowerCase().includes(kw))
  );

  // 4. 프레임워크 감지
  let framework = 'unknown';
  if (deps['nuxt']) framework = 'Nuxt 3';
  else if (deps['next']) framework = 'Next.js';
  else if (deps['vue']) framework = 'Vue 3';
  else if (deps['react']) framework = 'React';

  // 5. API 사용 패턴 상세 분석
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

  // 6. openerd-nuxt3 컴포넌트 사용 분석
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

  // 7. Tailwind 분석
  let hasTailwindConfig = false;
  let usesUtilityClasses = false;

  try {
    await filesystem.readFile({ path: \`\${targetPath}/tailwind.config.js\` });
    hasTailwindConfig = true;
  } catch (e) {
    try {
      await filesystem.readFile({ path: \`\${targetPath}/tailwind.config.ts\` });
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

  // 8. 점수 계산
  let apiScore = 0;
  if (hasOpenApi) apiScore += 40;
  else if (hasGrpc) apiScore += 35;
  
  if (hasApiComposable) apiScore += 10;
  if (hasErrorHandling) apiScore += 5;
  if (hasTypeSafety) apiScore += 5;

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

  console.log(\`📊 Scores: Total=\${totalScore}/100 (Tier \${tier}), API=\${Math.round(apiScore)}/100, Component=\${Math.round(componentScore)}/100\`);

  // 9. 패턴 분석
  const patterns = {
    stats: {
      totalFiles: fileList.length,
      vueFiles: vueFiles.files.filter(f => !f.isDirectory).length,
      tsFiles: tsFiles.files.filter(f => !f.isDirectory).length
    },
    apiInfo: {
      hasGrpc,
      hasOpenApi,
      apiType: hasOpenApi ? 'OpenAPI' : (hasGrpc ? 'gRPC' : 'none')
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
      framework,
      usesTypescript: tsFiles.files.filter(f => !f.isDirectory).length > 0,
      usesVue: vueFiles.files.filter(f => !f.isDirectory).length > 0
    },
    scores: {
      total: totalScore,
      api: Math.round(apiScore),
      component: Math.round(componentScore),
      tier
    }
  };

  // 10. 샘플 파일 수집 (최대 3개)
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
      console.log(\`⚠️ Failed to read: \${file.name}\`);
    }
  }

  // 11. BestCase 저장
  const result = await bestcase.saveBestCase({
    projectName: PROJECT_NAME,
    category: '${project.category}',
    description: \`\${PROJECT_NAME} Advanced Scan - Auto Updated (Tier \${tier})\`,
    files: sampleFiles,
    patterns: patterns,
    tags: ['auto-scan', 'advanced', tier, framework.toLowerCase(), new Date().toISOString().split('T')[0]]
  });

  console.log(\`✅ BestCase saved: \${result.id}\`);
  console.log(\`📁 Location: \${result.filePath}\`);
  console.log('');

} catch (error) {
  console.log(\`❌ Error scanning \${PROJECT_NAME}:\`, error.message);
  console.log('');
}
`;
}

/**
 * 모든 프로젝트 스캔 실행
 */
async function scanAllProjects() {
  console.log('');
  console.log('🚀 Starting Auto BestCase Update');
  console.log('📅 Time: ' + new Date().toISOString());
  console.log('📂 Projects Base: ' + PROJECTS_BASE_PATH);
  console.log('💾 Storage: ' + BESTCASE_STORAGE_PATH);
  console.log('');

  for (const project of PROJECTS_TO_SCAN) {
    // 프로젝트 경로 존재 확인
    if (!existsSync(project.path)) {
      console.log('⚠️ Skipping ' + project.name + ': Path not found');
      console.log('');
      continue;
    }

    const code = generateScanCode(project);
    
    try {
      await runAgentScript({ 
        code, 
        timeoutMs: 60000 
      });
    } catch (error) {
      console.log('❌ Failed to scan ' + project.name + ':', error.message);
      console.log('');
    }
  }

  console.log('✨ Auto BestCase Update Completed');
  console.log('');
}

// 실행
scanAllProjects().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

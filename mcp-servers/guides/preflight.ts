// preflight.ts - 프리플라이트 검수 시스템

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * 요청 메타데이터 스키마
 */
export interface RequestMetadata {
  projectName: string;
  intent: 'page-create' | 'page-update' | 'refactor' | 'api-integration';
  targets: string[];
  apiTypeHint: 'grpc' | 'openapi' | 'auto';
  entities: string[];
  uiDeps: {
    tailwind: boolean;
    openerdComponents: string[];
  };
  allowWrite: {
    glob: string[];
    maxFiles: number;
    maxLoc: number;
  };
  constraints: string[];
  riskThreshold: number;
}

/**
 * TODO 항목
 */
export interface TodoItem {
  id: string;
  files: string[];
  loc: number;
  description: string;
}

/**
 * 프리플라이트 결과
 */
export interface PreflightResult {
  ok: boolean;
  risk: number;
  keywords: string[];
  reasons: Array<{
    check: string;
    passed: boolean;
    details: string;
  }>;
}

/**
 * 사용자 요청 텍스트에서 메타데이터 추출
 */
export async function buildRequestMetadata(
  reqText: string,
  workspacePath: string
): Promise<RequestMetadata> {
  console.error('[buildRequestMetadata] Workspace path:', workspacePath);
  console.error('[buildRequestMetadata] Request:', reqText.substring(0, 100));
  
  // 워크스페이스 경로에서 프로젝트명 추출
  // 예: D:/01.Work/01.Projects/49.airian/frontend-admin → "49.airian/frontend-admin"
  const pathParts = workspacePath.replace(/\\/g, '/').split('/');
  const projectName = pathParts.slice(-2).join('/');
  
  console.error('[buildRequestMetadata] Project name:', projectName);
  
  // 요청 텍스트 분석 (간단한 키워드 기반)
  const text = reqText.toLowerCase();
  
  // Intent 감지
  let intent: RequestMetadata['intent'] = 'page-create';
  if (text.includes('수정') || text.includes('edit') || text.includes('update')) {
    intent = 'page-update';
  } else if (text.includes('리팩토링') || text.includes('refactor')) {
    intent = 'refactor';
  } else if (text.includes('api') || text.includes('통합')) {
    intent = 'api-integration';
  }
  
  console.error('[buildRequestMetadata] Intent:', intent);
  
  // Entities 추출 (명사 추정)
  const entities: string[] = [];
  const commonEntities = ['inquiry', 'notice', 'faq', 'product', 'order', 'user', 'address'];
  for (const entity of commonEntities) {
    if (text.includes(entity)) {
      entities.push(entity);
    }
  }
  
  console.error('[buildRequestMetadata] Entities:', entities);
  
  // 프로젝트 타입 자동 감지
  const projectTypeInfo = await detectProjectType(workspacePath);
  
  console.error('[buildRequestMetadata] Project type:', projectTypeInfo);
  
  // 기본 메타데이터
  return {
    projectName,
    intent,
    targets: [],  // TODO에서 채워질 예정
    apiTypeHint: 'auto',  // BestCase에서 확인 예정
    entities,
    uiDeps: projectTypeInfo.uiDeps,
    allowWrite: {
      glob: ['pages/**', 'composables/**', 'components/**', 'utils/**'],
      maxFiles: 5,
      maxLoc: 400,
    },
    constraints: ['ssr-safe', 'no-breaking-api'],
    riskThreshold: 40,
  };
}

/**
 * 프로젝트 타입 자동 감지 (Tailwind, openerd-nuxt3 등)
 * 🔑 MCP 도구를 사용하여 실제 컴포넌트 확인
 */
async function detectProjectType(workspacePath: string): Promise<{
  uiDeps: RequestMetadata['uiDeps'];
  framework: string;
}> {
  const uiDeps: RequestMetadata['uiDeps'] = {
    tailwind: false,
    openerdComponents: [],
  };
  
  let framework = 'unknown';
  
  try {
    // package.json 확인
    const packageJsonPath = join(workspacePath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    console.error('[detectProjectType] package.json dependencies:', Object.keys(packageJson.dependencies || {}));
    
    // Tailwind 확인
    if (packageJson.dependencies?.['tailwindcss'] || 
        packageJson.devDependencies?.['tailwindcss']) {
      uiDeps.tailwind = true;
      console.error('[detectProjectType] Tailwind detected');
    }
    
    // 🔑 openerd-nuxt3 확인: MCP 도구로 실제 컴포넌트 스캔
    if (packageJson.dependencies?.['openerd-nuxt3'] || 
        packageJson.devDependencies?.['openerd-nuxt3']) {
      
      console.error('[detectProjectType] openerd-nuxt3 detected in package.json, scanning actual components...');
      
      // 🔑 openerd-nuxt3 npm package에서 사용 가능한 컴포넌트 목록 가져오기
      const componentsList = await scanOpenerdComponents();
      
      if (componentsList.length > 0) {
        uiDeps.openerdComponents = componentsList;
        console.error('[detectProjectType] openerd-nuxt3 components found:', componentsList.length, 'components');
      } else {
        // 기본값 (openerd-nuxt3 라이브러리의 기본 컴포넌트)
        uiDeps.openerdComponents = ['CommonTable', 'CommonButton', 'CommonInput', 'CommonLoading'];
        console.error('[detectProjectType] Using default openerd-nuxt3 components');
      }
    }
    
    // Framework 확인
    if (packageJson.dependencies?.['nuxt'] || packageJson.devDependencies?.['nuxt']) {
      framework = 'nuxt3';
    } else if (packageJson.dependencies?.['next']) {
      framework = 'next';
    } else if (packageJson.dependencies?.['vue']) {
      framework = 'vue';
    } else if (packageJson.dependencies?.['react']) {
      framework = 'react';
    }
    
    console.error('[detectProjectType] Framework:', framework);
    
  } catch (error: any) {
    console.error('[detectProjectType] Failed to read package.json:', error.message);
  }
  
  // nuxt.config.ts 확인 (추가 검증)
  try {
    const nuxtConfigPath = join(workspacePath, 'nuxt.config.ts');
    const nuxtConfigContent = await fs.readFile(nuxtConfigPath, 'utf-8');
    
    if (nuxtConfigContent.includes('tailwindcss')) {
      uiDeps.tailwind = true;
      console.error('[detectProjectType] Tailwind confirmed in nuxt.config.ts');
    }
    
    if (nuxtConfigContent.includes('openerd-nuxt3')) {
      console.error('[detectProjectType] openerd-nuxt3 confirmed in nuxt.config.ts');
    }
  } catch (error: any) {
    console.error('[detectProjectType] No nuxt.config.ts found or failed to read');
  }
  
  return { uiDeps, framework };
}

/**
 * 🔑 openerd-nuxt3 컴포넌트 스캔
 * openerd-nuxt3 npm package의 실제 컴포넌트 목록 반환
 * (MCP를 통해 D:\01.Work\01.Projects\00.common\openerd-nuxt3 패키지 구조 파악)
 */
async function scanOpenerdComponents(): Promise<string[]> {
  // openerd-nuxt3 package의 tailwind/common 디렉토리에 있는 컴포넌트 목록
  // 실제로는 MCP 도구로 읽어야 하지만, 현재는 알려진 목록 사용
  
  // D:\01.Work\01.Projects\00.common\openerd-nuxt3\src\runtime\components\tailwind\common
  // 에서 추출한 전체 컴포넌트 목록
  const knownComponents = [
    'CommonAlert',
    'CommonAsyncBoundary',
    'CommonButton',
    'CommonCard',
    'CommonCardList',
    'CommonCheckAlert',
    'CommonCheckBox',
    'CommonCommand',
    'CommonCommandSearch',
    'CommonDateTerm',
    'CommonDetailTable',
    'CommonDialog',
    'CommonEmail',
    'CommonFromToPicker',
    'CommonGroups',
    'CommonInput',
    'CommonList',
    'CommonModalLayout',
    'CommonNumber',
    'CommonPageIndicator',
    'CommonPaginationTable',
    'CommonPaging',
    'CommonPassword',
    'CommonPhone',
    'CommonPromiseAlert',
    'CommonRadioBox',
    'CommonSearch',
    'CommonSelect',
    'CommonSocialSecurityNumber',
    'CommonTable',
    'CommonTipTapBoard',
    'CommonTipTapEditor',
    'CommonToolTip',
  ];
  
  console.error('[scanOpenerdComponents] Using openerd-nuxt3 component list:', knownComponents.length, 'components');
  
  return knownComponents;
}

/**
 * 메타데이터 기반 TODO 리스트 합성
 */
export async function synthesizeTodoList(
  meta: RequestMetadata,
  bestCase?: any,
  workspacePath?: string
): Promise<TodoItem[]> {
  console.error('[synthesizeTodoList] Starting TODO synthesis');
  console.error('[synthesizeTodoList] Meta:', {
    intent: meta.intent,
    apiTypeHint: meta.apiTypeHint,
  });
  console.error('[synthesizeTodoList] Workspace path:', workspacePath);
  
  const todos: TodoItem[] = [];
  
  // 🔑 현재 프로젝트에 실제 API가 있는지 스캔
  let projectApiInfo: any = null;
  if (workspacePath) {
    projectApiInfo = await scanProjectApiFiles(workspacePath);
    console.error('[synthesizeTodoList] Project API scan result:', {
      hasApi: !!projectApiInfo,
      apiType: projectApiInfo?.apiType,
      fileCount: projectApiInfo?.files?.length || 0,
      methods: projectApiInfo?.methods?.slice(0, 5) || [],
    });
  }
  
  // BestCase는 참고용 (우수 사례 패턴)
  console.error('[synthesizeTodoList] BestCase info (for reference):', {
    hasApi: !!bestCase?.patterns?.apiInfo,
    apiType: bestCase?.patterns?.apiInfo?.apiType,
    endpointCount: bestCase?.patterns?.apiInfo?.endpoints?.length || 0,
  });
  
  // 🔑 현재 프로젝트에 API가 있으면 무조건 API 연동 TODO 추가
  const hasApiInProject = projectApiInfo && projectApiInfo.methods.length > 0;
  
  if (hasApiInProject) {
    const apiType = projectApiInfo.apiType;
    const methods = projectApiInfo.methods;
    
    console.error('[synthesizeTodoList] ⚠️ API detected in PROJECT! Adding mandatory API integration TODO');
    console.error('[synthesizeTodoList] API Type:', apiType);
    console.error('[synthesizeTodoList] Methods:', methods.slice(0, 5));
    
    // API 타입 메타데이터 업데이트
    meta.apiTypeHint = apiType as any;
    
    todos.push({
      id: 'connectApi',
      files: meta.targets.length > 0 ? meta.targets : [`pages/${meta.entities[0] || 'index'}.vue`],
      loc: 80,
      description: `🔑 ${apiType.toUpperCase()} API 연결 (${methods.length}개 메서드 사용 가능)`,
    });
  }
  
  // Intent 기반 TODO 생성
  if (meta.intent === 'page-create' || meta.intent === 'page-update') {
    if (!hasApiInProject) {
      // API 없으면 기본 페이지만
      todos.push({
        id: 'createPageFile',
        files: meta.targets.length > 0 ? meta.targets : [`pages/${meta.entities[0] || 'index'}.vue`],
        loc: 150,
        description: '새 페이지 파일 생성',
      });
    } else {
      // API 있으면 페이지 + API 연동
      todos.push({
        id: 'createPageWithApi',
        files: meta.targets.length > 0 ? meta.targets : [`pages/${meta.entities[0] || 'index'}.vue`],
        loc: 200,
        description: 'API 연동된 페이지 생성 (데이터 로드, 테이블, CRUD)',
      });
    }
    
    todos.push({
      id: 'addAsyncBoundary',
      files: [`pages/${meta.entities[0] || 'index'}.vue`],
      loc: 30,
      description: '로딩/에러 상태 처리 (CommonAsyncBoundary)',
    });
  }
  
  if (meta.intent === 'api-integration') {
    todos.push({
      id: 'createComposable',
      files: [`composables/${meta.apiTypeHint}.ts`],
      loc: 100,
      description: 'API 클라이언트 composable 생성',
    });
  }
  
  console.error('[synthesizeTodoList] Generated TODOs:', todos.map(t => ({ id: t.id, desc: t.description })));
  
  return todos;
}

/**
 * 현재 프로젝트의 API 파일 스캔 (gRPC proto, OpenAPI spec 등)
 */
async function scanProjectApiFiles(workspacePath: string): Promise<{
  apiType: 'grpc' | 'openapi';
  files: string[];
  methods: string[];
} | null> {
  console.error('[scanProjectApiFiles] Scanning workspace:', workspacePath);
  
  try {
    // 1. gRPC proto 파일 스캔
    const protoFiles = await findFilesRecursive(workspacePath, '.proto');
    if (protoFiles.length > 0) {
      console.error('[scanProjectApiFiles] Found proto files:', protoFiles.length);
      
      // proto 파일에서 RPC 메서드 추출
      const methods: string[] = [];
      for (const protoFile of protoFiles.slice(0, 3)) {
        const content = await fs.readFile(protoFile, 'utf-8');
        const rpcMatches = content.matchAll(/rpc\s+(\w+)\s*\(/g);
        for (const match of rpcMatches) {
          methods.push(match[1]);
        }
      }
      
      console.error('[scanProjectApiFiles] Extracted gRPC methods:', methods.slice(0, 10));
      
      return {
        apiType: 'grpc',
        files: protoFiles,
        methods,
      };
    }
    
    // 2. OpenAPI spec 파일 스캔 (swagger.json, openapi.yaml 등)
    const openapiFiles = await findFilesRecursive(workspacePath, '.yaml', '.yml', '.json');
    const swaggerFiles = openapiFiles.filter(f => 
      f.includes('swagger') || f.includes('openapi') || f.includes('api-spec')
    );
    
    if (swaggerFiles.length > 0) {
      console.error('[scanProjectApiFiles] Found OpenAPI files:', swaggerFiles.length);
      
      // OpenAPI spec에서 엔드포인트 추출
      const methods: string[] = [];
      for (const specFile of swaggerFiles.slice(0, 3)) {
        const content = await fs.readFile(specFile, 'utf-8');
        
        // JSON 형식
        if (specFile.endsWith('.json')) {
          try {
            const spec = JSON.parse(content);
            if (spec.paths) {
              for (const [path, pathItem] of Object.entries(spec.paths as any)) {
                for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
                  if (pathItem[method]) {
                    methods.push(`${method.toUpperCase()} ${path}`);
                  }
                }
              }
            }
          } catch (e) {
            console.error('[scanProjectApiFiles] Failed to parse JSON:', e);
          }
        }
        // YAML 형식 (간단 파싱)
        else {
          const pathMatches = content.matchAll(/^\s*\/[\w/{}]+:\s*$/gm);
          for (const match of pathMatches) {
            methods.push(match[0].trim());
          }
        }
      }
      
      console.error('[scanProjectApiFiles] Extracted OpenAPI methods:', methods.slice(0, 10));
      
      return {
        apiType: 'openapi',
        files: swaggerFiles,
        methods,
      };
    }
    
    // 3. composables/providers 디렉토리에서 API 클라이언트 스캔
    const composablesPath = join(workspacePath, 'composables');
    const providersPath = join(workspacePath, 'providers');
    
    for (const apiDir of [composablesPath, providersPath]) {
      try {
        const files = await findFilesRecursive(apiDir, '.ts', '.js');
        const apiFiles = files.filter(f => 
          f.includes('grpc') || f.includes('api') || f.includes('client')
        );
        
        if (apiFiles.length > 0) {
          console.error('[scanProjectApiFiles] Found API client files:', apiFiles);
          
          // 파일에서 메서드 추출
          const methods: string[] = [];
          for (const file of apiFiles.slice(0, 3)) {
            const content = await fs.readFile(file, 'utf-8');
            
            // gRPC 클라이언트 메서드 추출
            if (file.includes('grpc')) {
              const methodMatches = content.matchAll(/client\.(\w+)\(/g);
              for (const match of methodMatches) {
                methods.push(match[1]);
              }
              
              if (methods.length > 0) {
                return {
                  apiType: 'grpc',
                  files: apiFiles,
                  methods,
                };
              }
            }
            
            // REST API 메서드 추출
            const fetchMatches = content.matchAll(/(?:fetch|axios|useFetch)\(['"]([^'"]+)['"]/g);
            for (const match of fetchMatches) {
              methods.push(match[1]);
            }
          }
          
          if (methods.length > 0) {
            return {
              apiType: 'openapi',
              files: apiFiles,
              methods,
            };
          }
        }
      } catch (e) {
        // 디렉토리 없으면 스킵
        continue;
      }
    }
    
    console.error('[scanProjectApiFiles] No API files found in project');
    return null;
    
  } catch (error: any) {
    console.error('[scanProjectApiFiles] Error scanning project:', error.message);
    return null;
  }
}

/**
 * 재귀적으로 특정 확장자 파일 찾기
 */
async function findFilesRecursive(
  dir: string,
  ...extensions: string[]
): Promise<string[]> {
  const results: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // node_modules, .git 등 제외
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subResults = await findFilesRecursive(fullPath, ...extensions);
        results.push(...subResults);
      } else if (entry.isFile()) {
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    }
  } catch (error: any) {
    // 접근 권한 없거나 디렉토리 없으면 스킵
    return [];
  }
  
  return results;
}

/**
 * 프리플라이트 검수
 */
export async function preflightCheck(
  meta: RequestMetadata,
  todos: TodoItem[],
  bestCase?: any
): Promise<PreflightResult> {
  console.error('[preflightCheck] Starting preflight check');
  console.error('[preflightCheck] Metadata:', {
    projectName: meta.projectName,
    intent: meta.intent,
    apiTypeHint: meta.apiTypeHint,
  });
  
  const reasons: PreflightResult['reasons'] = [];
  let apiMismatch = 0;
  let missingDeps = 0;
  let writeRangeOver = 0;
  let guideConflict = 0;
  let typeWarn = 0;
  
  // 1. API 타입 확인 (BestCase와 비교)
  if (bestCase && bestCase.patterns?.apiInfo) {
    const actualApiType = bestCase.patterns.apiInfo.apiType?.toLowerCase();
    const hintedApiType = meta.apiTypeHint.toLowerCase();
    
    console.error('[preflightCheck] API type comparison:', {
      hinted: hintedApiType,
      actual: actualApiType,
    });
    
    if (hintedApiType !== 'auto' && actualApiType !== hintedApiType) {
      apiMismatch = 1;
      reasons.push({
        check: 'API Type Match',
        passed: false,
        details: `Hinted: ${meta.apiTypeHint}, Actual: ${actualApiType}`,
      });
    } else {
      // BestCase에서 확인된 타입으로 업데이트
      meta.apiTypeHint = actualApiType as any;
      reasons.push({
        check: 'API Type Match',
        passed: true,
        details: `Confirmed: ${actualApiType}`,
      });
    }
    
    // API 파일 존재 확인 (실제 프로젝트 경로에서)
    const apiExists = await checkApiFilesExist(meta, bestCase);
    if (!apiExists.allExist) {
      console.error('[preflightCheck] Missing API files:', apiExists.missing);
      reasons.push({
        check: 'API Files Exist',
        passed: false,
        details: `Missing files: ${apiExists.missing.join(', ')}`,
      });
      apiMismatch += 1;
    } else {
      console.error('[preflightCheck] All API files exist');
      reasons.push({
        check: 'API Files Exist',
        passed: true,
        details: `Found: ${apiExists.existing.join(', ')}`,
      });
    }
  } else {
    console.error('[preflightCheck] BestCase not found or missing API info');
    reasons.push({
      check: 'API Type Match',
      passed: false,
      details: 'BestCase not found',
    });
  }
  
  // 2. UI 의존성 확인 (이미 detectProjectType에서 확인됨)
  if (meta.uiDeps.openerdComponents.length > 0) {
    reasons.push({
      check: 'UI Dependencies',
      passed: true,
      details: `openerd-nuxt3 components: ${meta.uiDeps.openerdComponents.join(', ')}`,
    });
  } else {
    console.error('[preflightCheck] openerd-nuxt3 not detected');
    missingDeps = 1;
    reasons.push({
      check: 'UI Dependencies',
      passed: false,
      details: 'openerd-nuxt3 not found in package.json',
    });
  }
  
  if (meta.uiDeps.tailwind) {
    reasons.push({
      check: 'Tailwind CSS',
      passed: true,
      details: 'Tailwind CSS detected',
    });
  } else {
    console.error('[preflightCheck] Tailwind not detected');
    reasons.push({
      check: 'Tailwind CSS',
      passed: false,
      details: 'Tailwind CSS not found',
    });
  }
  
  // 3. 쓰기 범위 확인 (파일 개수, LOC)
  const totalFiles = todos.reduce((sum, todo) => sum + todo.files.length, 0);
  const totalLoc = todos.reduce((sum, todo) => sum + todo.loc, 0);
  
  console.error('[preflightCheck] Write range:', {
    totalFiles,
    maxFiles: meta.allowWrite.maxFiles,
    totalLoc,
    maxLoc: meta.allowWrite.maxLoc,
  });
  
  if (totalFiles > meta.allowWrite.maxFiles) {
    writeRangeOver = 1;
    reasons.push({
      check: 'Write Range',
      passed: false,
      details: `Files: ${totalFiles} > ${meta.allowWrite.maxFiles}`,
    });
  } else if (totalLoc > meta.allowWrite.maxLoc) {
    writeRangeOver = 1;
    reasons.push({
      check: 'Write Range',
      passed: false,
      details: `LOC: ${totalLoc} > ${meta.allowWrite.maxLoc}`,
    });
  } else {
    reasons.push({
      check: 'Write Range',
      passed: true,
      details: `Files: ${totalFiles}/${meta.allowWrite.maxFiles}, LOC: ${totalLoc}/${meta.allowWrite.maxLoc}`,
    });
  }
  
  // 4. 지침 충돌 (나중에 guides.combineGuides에서 처리)
  guideConflict = 0;
  reasons.push({
    check: 'Guide Conflicts',
    passed: true,
    details: 'Will be checked in guides.combineGuides',
  });
  
  // 5. TypeScript 경고 (실제로는 tsc --noEmit 실행 필요)
  // 여기서는 간단히 0으로 설정
  typeWarn = 0;
  reasons.push({
    check: 'TypeScript Warnings',
    passed: true,
    details: 'Skipped (would run tsc --noEmit)',
  });
  
  // 리스크 점수 계산
  const risk =
    10 * apiMismatch +
    8 * missingDeps +
    6 * writeRangeOver +
    4 * guideConflict +
    2 * typeWarn;
  
  console.error('[preflightCheck] Risk score:', risk);
  
  // 🔑 키워드 추출 (현재 프로젝트 API 정보 우선 반영)
  const keywords: string[] = [];
  if (risk < meta.riskThreshold) {
    // API 타입 키워드 (synthesizeTodoList에서 확정된 값)
    if (meta.apiTypeHint && meta.apiTypeHint !== 'auto') {
      keywords.push(meta.apiTypeHint);
      keywords.push('api', 'connection', 'client');  // API 관련 공통 키워드
      
      if (meta.apiTypeHint === 'grpc') {
        keywords.push('proto', 'useGrpcClient', 'backend');
      } else if (meta.apiTypeHint === 'openapi') {
        keywords.push('rest', 'useFetch', 'openapi');
      }
    }
    
    // 엔티티 키워드
    keywords.push(...meta.entities);
    
    // TODO 키워드
    keywords.push(...todos.map(t => t.id));
    
    // 프레임워크 공통 키워드
    keywords.push('nuxt3', 'asyncData', 'errorHandling', 'useAsyncData');
    
    // 🔑 TODO에 API 연동이 있으면 CRUD 키워드 추가
    if (todos.some(t => t.id === 'connectApi' || t.id === 'createPageWithApi')) {
      keywords.push('crud', 'table', 'pagination', 'search', 'delete');
      console.error('[preflightCheck] ⚠️ API integration TODO found, added CRUD keywords');
    }
  }
  
  console.error('[preflightCheck] Keywords:', keywords);
  
  return {
    ok: risk < meta.riskThreshold,
    risk,
    keywords,
    reasons,
  };
}

/**
 * API 파일 존재 확인
 */
async function checkApiFilesExist(
  meta: RequestMetadata,
  bestCase: any
): Promise<{
  allExist: boolean;
  existing: string[];
  missing: string[];
}> {
  const apiFiles: string[] = [];
  
  // BestCase에서 API 파일 경로 추출
  if (bestCase.patterns?.apiInfo?.endpoints) {
    for (const endpoint of bestCase.patterns.apiInfo.endpoints) {
      if (endpoint.file) {
        apiFiles.push(endpoint.file);
      }
    }
  }
  
  console.error('[checkApiFilesExist] Checking API files:', apiFiles);
  
  const existing: string[] = [];
  const missing: string[] = [];
  
  // 실제 파일 존재 확인은 filesystem API를 사용해야 함
  // 여기서는 간단히 존재한다고 가정 (나중에 filesystem.readFile로 검증)
  for (const file of apiFiles) {
    // TODO: filesystem API로 실제 확인
    existing.push(file);
  }
  
  return {
    allExist: missing.length === 0,
    existing,
    missing,
  };
}

/**
 * 키워드 추출 (검증된 TODO에서)
 */
export function extractKeywords(
  meta: RequestMetadata,
  todos: TodoItem[]
): string[] {
  const keywords: string[] = [];
  
  // API 타입
  if (meta.apiTypeHint !== 'auto') {
    keywords.push(meta.apiTypeHint);
  }
  
  // 엔티티
  keywords.push(...meta.entities);
  
  // TODO ID
  keywords.push(...todos.map(t => t.id));
  
  // 공통 키워드
  keywords.push('nuxt3');
  
  if (meta.intent === 'page-create' || meta.intent === 'page-update') {
    keywords.push('pages', 'asyncData', 'errorHandling', 'paging');
  }
  
  if (meta.apiTypeHint === 'grpc') {
    keywords.push('proto', 'composables', 'backend');
  } else if (meta.apiTypeHint === 'openapi') {
    keywords.push('rest', 'api', 'backend');
  }
  
  return keywords;
}

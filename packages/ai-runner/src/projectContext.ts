/**
 * 프로젝트 컨텍스트 자동 추출
 *
 * MCP execute 도구의 응답에 포함될 프로젝트 정보를 자동으로 생성
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export interface ProjectContext {
  projectPath?: string;
  hasPackageJson: boolean;

  // API 타입 정보
  apiInfo: {
    type: 'grpc' | 'openapi' | 'rest' | 'mixed' | 'unknown';
    packages: string[];
    confidence: 'high' | 'medium' | 'low';
  };

  // 디자인 시스템 정보
  designSystemInfo: {
    detected: string[];  // 감지된 디자인 시스템들
    confidence: 'high' | 'medium' | 'low';
    recommended?: string;  // 가장 가능성 높은 것
  };

  // 유틸리티 라이브러리 정보
  utilityLibraryInfo: {
    detected: string[];
    confidence: 'high' | 'medium' | 'low';
    recommended?: string;
  };

  // 로컬 패키지 정보
  localPackagesInfo: {
    hasConfig: boolean;
    packages: Array<{
      id: string;
      type: string;
      analyzed: boolean;
    }>;
  };

  // 권장 플랜
  recommendedPlan: string[];
}

/**
 * package.json에서 프로젝트 컨텍스트 추출
 */
export async function extractProjectContext(projectPath?: string): Promise<ProjectContext> {
  const basePath = projectPath || process.env.PROJECTS_PATH || '/projects';

  const context: ProjectContext = {
    projectPath: basePath,
    hasPackageJson: false,
    apiInfo: {
      type: 'unknown',
      packages: [],
      confidence: 'low'
    },
    designSystemInfo: {
      detected: [],
      confidence: 'low'
    },
    utilityLibraryInfo: {
      detected: [],
      confidence: 'low'
    },
    localPackagesInfo: {
      hasConfig: false,
      packages: []
    },
    recommendedPlan: []
  };

  try {
    // package.json 읽기
    const packageJsonPath = join(basePath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    context.hasPackageJson = true;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // API 타입 감지
    context.apiInfo = detectApiType(allDeps);

    // 디자인 시스템 감지
    context.designSystemInfo = detectDesignSystem(allDeps);

    // 유틸리티 라이브러리 감지
    context.utilityLibraryInfo = detectUtilityLibrary(allDeps);

  } catch (error) {
    // package.json이 없거나 읽을 수 없음
    context.recommendedPlan.push('⚠️  No package.json found - manual project setup required');
  }

  try {
    // 로컬 패키지 설정 체크
    const localPackagesPath = join(basePath, '.mcp/local-packages.json');
    const localPackagesContent = await fs.readFile(localPackagesPath, 'utf-8');
    const localPackages = JSON.parse(localPackagesContent);

    context.localPackagesInfo = {
      hasConfig: true,
      packages: localPackages.localPackages?.map((pkg: any) => ({
        id: pkg.id,
        type: pkg.type,
        analyzed: pkg.analyzed
      })) || []
    };

    const unanalyzed = context.localPackagesInfo.packages.filter(p => !p.analyzed);
    if (unanalyzed.length > 0) {
      context.recommendedPlan.push(`📦 ${unanalyzed.length} local packages need analysis`);
    }

  } catch (error) {
    // 로컬 패키지 설정 없음 (정상)
  }

  // 권장 플랜 생성
  generateRecommendedPlan(context);

  return context;
}

/**
 * API 타입 감지
 */
function detectApiType(dependencies: Record<string, string>): ProjectContext['apiInfo'] {
  const apiInfo: ProjectContext['apiInfo'] = {
    type: 'unknown',
    packages: [],
    confidence: 'low'
  };

  const grpcPackages = ['@grpc/grpc-js', '@grpc/proto-loader'];
  const openapiPackages = ['@openapi', 'swagger'];
  const restPackages = ['axios', 'fetch', 'ky'];

  let grpcCount = 0;
  let openapiCount = 0;
  let restCount = 0;

  for (const dep of Object.keys(dependencies)) {
    if (grpcPackages.some(p => dep.includes(p))) {
      grpcCount++;
      apiInfo.packages.push(dep);
    }
    if (openapiPackages.some(p => dep.includes(p))) {
      openapiCount++;
      apiInfo.packages.push(dep);
    }
    if (restPackages.includes(dep)) {
      restCount++;
      apiInfo.packages.push(dep);
    }
  }

  // 타입 결정
  if (grpcCount > 0 && openapiCount > 0) {
    apiInfo.type = 'mixed';
    apiInfo.confidence = 'high';
  } else if (grpcCount > 0) {
    apiInfo.type = 'grpc';
    apiInfo.confidence = 'high';
  } else if (openapiCount > 0) {
    apiInfo.type = 'openapi';
    apiInfo.confidence = 'high';
  } else if (restCount > 0) {
    apiInfo.type = 'rest';
    apiInfo.confidence = 'medium';
  }

  return apiInfo;
}

/**
 * 디자인 시스템 감지
 */
function detectDesignSystem(dependencies: Record<string, string>): ProjectContext['designSystemInfo'] {
  const designSystemInfo: ProjectContext['designSystemInfo'] = {
    detected: [],
    confidence: 'low'
  };

  const knownSystems = [
    '@openerd/nuxt3',
    'element-plus',
    'vuetify',
    'quasar',
    'primevue',
    'ant-design-vue',
    'naive-ui'
  ];

  for (const dep of Object.keys(dependencies)) {
    if (knownSystems.includes(dep)) {
      designSystemInfo.detected.push(dep);
    }
  }

  if (designSystemInfo.detected.length > 0) {
    designSystemInfo.confidence = 'high';
    designSystemInfo.recommended = designSystemInfo.detected[0];  // 첫 번째를 추천
  }

  return designSystemInfo;
}

/**
 * 유틸리티 라이브러리 감지
 */
function detectUtilityLibrary(dependencies: Record<string, string>): ProjectContext['utilityLibraryInfo'] {
  const utilityLibraryInfo: ProjectContext['utilityLibraryInfo'] = {
    detected: [],
    confidence: 'low'
  };

  const knownLibraries = [
    '@vueuse/core',
    'vueuse',
    'lodash',
    'date-fns',
    'axios',
    'dayjs'
  ];

  for (const dep of Object.keys(dependencies)) {
    if (knownLibraries.some(lib => dep.includes(lib))) {
      utilityLibraryInfo.detected.push(dep);
    }
  }

  if (utilityLibraryInfo.detected.length > 0) {
    utilityLibraryInfo.confidence = 'high';
    utilityLibraryInfo.recommended = utilityLibraryInfo.detected[0];
  }

  return utilityLibraryInfo;
}

/**
 * 권장 플랜 생성
 */
function generateRecommendedPlan(context: ProjectContext): void {
  // API 타입 관련
  if (context.apiInfo.type !== 'unknown') {
    context.recommendedPlan.push(
      `✅ API Type: ${context.apiInfo.type.toUpperCase()} (${context.apiInfo.packages.join(', ')})`
    );
  } else {
    context.recommendedPlan.push(
      '⚠️  API Type: Unknown - Check project dependencies for gRPC/OpenAPI/REST packages'
    );
  }

  // 디자인 시스템 관련
  if (context.designSystemInfo.detected.length > 0) {
    context.recommendedPlan.push(
      `✅ Design System: ${context.designSystemInfo.detected.join(', ')} - Use these components for consistency`
    );
  } else {
    context.recommendedPlan.push(
      '⚠️  Design System: Not detected - Consider using element-plus, vuetify, or quasar'
    );
  }

  // 유틸리티 라이브러리 관련
  if (context.utilityLibraryInfo.detected.length > 0) {
    context.recommendedPlan.push(
      `✅ Utility Library: ${context.utilityLibraryInfo.detected.join(', ')} - Use these utilities for consistency`
    );
  } else {
    context.recommendedPlan.push(
      '⚠️  Utility Library: Not detected - Consider using vueuse, lodash, or date-fns'
    );
  }

  // 다음 액션 제안
  context.recommendedPlan.push('');
  context.recommendedPlan.push('📋 Recommended Next Steps:');
  context.recommendedPlan.push('1. Run project metadata analysis if needed');
  context.recommendedPlan.push('2. Check BestCase for similar projects');
  context.recommendedPlan.push('3. Load relevant guides based on API type and design system');
}

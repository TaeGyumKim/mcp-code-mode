/**
 * Automatic Project Context Extraction
 *
 * Automatically generates project information to be included in MCP execute tool responses
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export interface ProjectContext {
  projectPath?: string;
  hasPackageJson: boolean;

  // API type information
  apiInfo: {
    type: 'grpc' | 'openapi' | 'rest' | 'mixed' | 'unknown';
    packages: string[];
    confidence: 'high' | 'medium' | 'low';
  };

  // Design system information
  designSystemInfo: {
    detected: string[];  // Detected design systems
    confidence: 'high' | 'medium' | 'low';
    recommended?: string;  // Most likely candidate
  };

  // Utility library information
  utilityLibraryInfo: {
    detected: string[];
    confidence: 'high' | 'medium' | 'low';
    recommended?: string;
  };

  // Local package information
  localPackagesInfo: {
    hasConfig: boolean;
    packages: Array<{
      id: string;
      type: string;
      analyzed: boolean;
    }>;
  };

  // Recommended action plan
  recommendedPlan: string[];
}

/**
 * Extract project context from package.json
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
    // Read package.json
    const packageJsonPath = join(basePath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    context.hasPackageJson = true;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Detect API type
    context.apiInfo = detectApiType(allDeps);

    // Detect design system
    context.designSystemInfo = detectDesignSystem(allDeps);

    // Detect utility library
    context.utilityLibraryInfo = detectUtilityLibrary(allDeps);

  } catch (error) {
    // No package.json found or unable to read
    context.recommendedPlan.push('⚠️  No package.json found - manual project setup required');
  }

  try {
    // Check local packages configuration
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
    // No local packages config (normal)
  }

  // Generate recommended plan
  generateRecommendedPlan(context);

  return context;
}

/**
 * Detect API type from dependencies
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

  // Determine type
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
 * Detect design system from dependencies
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
    designSystemInfo.recommended = designSystemInfo.detected[0];  // Recommend first one
  }

  return designSystemInfo;
}

/**
 * Detect utility library from dependencies
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
 * Generate recommended action plan based on context
 */
function generateRecommendedPlan(context: ProjectContext): void {
  // API type related
  if (context.apiInfo.type !== 'unknown') {
    context.recommendedPlan.push(
      `✅ API Type: ${context.apiInfo.type.toUpperCase()} (${context.apiInfo.packages.join(', ')})`
    );
  } else {
    context.recommendedPlan.push(
      '⚠️  API Type: Unknown - Check project dependencies for gRPC/OpenAPI/REST packages'
    );
  }

  // Design system related
  if (context.designSystemInfo.detected.length > 0) {
    context.recommendedPlan.push(
      `✅ Design System: ${context.designSystemInfo.detected.join(', ')} - Use these components for consistency`
    );
  } else {
    context.recommendedPlan.push(
      '⚠️  Design System: Not detected - Consider using element-plus, vuetify, or quasar'
    );
  }

  // Utility library related
  if (context.utilityLibraryInfo.detected.length > 0) {
    context.recommendedPlan.push(
      `✅ Utility Library: ${context.utilityLibraryInfo.detected.join(', ')} - Use these utilities for consistency`
    );
  } else {
    context.recommendedPlan.push(
      '⚠️  Utility Library: Not detected - Consider using vueuse, lodash, or date-fns'
    );
  }

  // Next action suggestions
  context.recommendedPlan.push('');
  context.recommendedPlan.push('📋 Recommended Next Steps:');
  context.recommendedPlan.push('1. Run project metadata analysis if needed');
  context.recommendedPlan.push('2. Check BestCase for similar projects');
  context.recommendedPlan.push('3. Load relevant guides based on API type and design system');
}

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
    type: 'grpc' | 'openapi' | 'rest' | 'graphql' | 'mixed' | 'unknown';
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

    // Detect API type using dynamic configuration
    const apiTypeResult = await detectApiTypeFromDeps(allDeps, basePath);
    context.apiInfo = {
      type: apiTypeResult.type,
      packages: apiTypeResult.packages,
      confidence: apiTypeResult.confidence
    };

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
 * Note: detectApiType has been moved to llm-analyzer/src/apiTypeMapping.ts
 * for better configurability and maintainability
 */

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

/**
 * Extract imports and component usage from file content
 *
 * @param fileContent - File content to analyze
 * @returns Detected imports and components
 */
export interface FileContextAnalysis {
  imports: Array<{
    package: string;
    items: string[];
    type: 'type' | 'value';
  }>;
  components: string[];
  composables: string[];
  apiCalls: string[];
}

export function analyzeFileContent(fileContent: string): FileContextAnalysis {
  const analysis: FileContextAnalysis = {
    imports: [],
    components: [],
    composables: [],
    apiCalls: []
  };

  // Extract import statements
  // Matches: import { foo, bar } from 'package'
  //          import type { Foo } from 'package'
  //          import foo from 'package'
  const importRegex = /import\s+(type\s+)?\{?([^}]+)\}?\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(fileContent)) !== null) {
    const isType = !!match[1];
    const items = match[2].split(',').map(s => s.trim().replace(/^(type\s+)?/, ''));
    const packageName = match[3];

    analysis.imports.push({
      package: packageName,
      items,
      type: isType ? 'type' : 'value'
    });
  }

  // Extract components from template (Vue SFC)
  // Matches: <CommonButton, <common-button, etc.
  if (fileContent.includes('<template>')) {
    const templateSection = fileContent.match(/<template>[\s\S]*?<\/template>/)?.[0] || '';
    const componentRegex = /<([A-Z][a-zA-Z0-9]*)/g;

    while ((match = componentRegex.exec(templateSection)) !== null) {
      const componentName = match[1];
      if (!analysis.components.includes(componentName)) {
        analysis.components.push(componentName);
      }
    }
  }

  // Extract composables usage
  // Matches: useRouter(), usePaging(), etc.
  const composableRegex = /\b(use[A-Z][a-zA-Z0-9]*)\s*\(/g;
  while ((match = composableRegex.exec(fileContent)) !== null) {
    const composableName = match[1];
    if (!analysis.composables.includes(composableName)) {
      analysis.composables.push(composableName);
    }
  }

  // Extract API call patterns
  // Matches: useGrpcApi(), $fetch(), axios., api.
  const apiPatterns = [
    /\buseGrpcApi\s*\(/g,
    /\buseOpenApi\s*\(/g,
    /\$fetch\s*\(/g,
    /axios\./g,
    /\bapi\./g,
    /grpc\./gi
  ];

  for (const pattern of apiPatterns) {
    if (pattern.test(fileContent)) {
      const apiType = pattern.source.includes('Grpc') || pattern.source.includes('grpc')
        ? 'grpc'
        : pattern.source.includes('OpenApi') || pattern.source.includes('fetch')
        ? 'openapi'
        : 'rest';

      if (!analysis.apiCalls.includes(apiType)) {
        analysis.apiCalls.push(apiType);
      }
    }
  }

  return analysis;
}

/**
 * Enhance project context with file-level analysis
 *
 * @param context - Existing project context from package.json
 * @param fileContent - Current file content to analyze
 * @returns Enhanced context with file-based detections
 */
export function enhanceContextWithFile(context: ProjectContext, fileContent: string): ProjectContext {
  const fileAnalysis = analyzeFileContent(fileContent);

  // Enhance design system detection from imports
  const designSystemPackages = ['openerd-nuxt3', '@openerd/nuxt3', 'element-plus', 'vuetify', 'quasar', 'primevue', 'ant-design-vue', 'naive-ui'];

  for (const imp of fileAnalysis.imports) {
    for (const dsPackage of designSystemPackages) {
      if (imp.package.includes(dsPackage) || imp.package === dsPackage) {
        const normalizedName = dsPackage.replace('@', '').replace('/', '-');
        if (!context.designSystemInfo.detected.includes(normalizedName)) {
          context.designSystemInfo.detected.push(normalizedName);
          context.designSystemInfo.confidence = 'high';
          context.designSystemInfo.recommended = normalizedName;
        }
      }
    }
  }

  // Enhance design system detection from component usage
  // Common prefixes: Common*, El*, Q*, Prime*, A*, N*
  const componentPrefixes: Record<string, string> = {
    'Common': 'openerd-nuxt3',
    'El': 'element-plus',
    'Q': 'quasar',
    'Prime': 'primevue',
    'A': 'ant-design-vue',
    'N': 'naive-ui',
    'V': 'vuetify'
  };

  for (const component of fileAnalysis.components) {
    for (const [prefix, packageName] of Object.entries(componentPrefixes)) {
      if (component.startsWith(prefix)) {
        const normalizedName = packageName.replace('@', '').replace('/', '-');
        if (!context.designSystemInfo.detected.includes(normalizedName)) {
          context.designSystemInfo.detected.push(normalizedName);
          context.designSystemInfo.confidence = component.startsWith('Common') ? 'high' : 'medium';
          if (!context.designSystemInfo.recommended) {
            context.designSystemInfo.recommended = normalizedName;
          }
        }
      }
    }
  }

  // Enhance API type detection from file analysis
  if (fileAnalysis.apiCalls.length > 0) {
    const primaryApiType = fileAnalysis.apiCalls[0];

    if (context.apiInfo.type === 'unknown') {
      context.apiInfo.type = primaryApiType as any;
      context.apiInfo.confidence = 'medium';
    } else if (context.apiInfo.type !== primaryApiType && fileAnalysis.apiCalls.includes(context.apiInfo.type)) {
      context.apiInfo.type = 'mixed';
      context.apiInfo.confidence = 'high';
    }
  }

  // Enhance utility library detection from composables
  const utilityComposables: Record<string, string> = {
    'use': '@vueuse/core',  // general vueuse pattern
    'useFetch': '@vueuse/core',
    'useLocalStorage': '@vueuse/core'
  };

  for (const composable of fileAnalysis.composables) {
    for (const [pattern, library] of Object.entries(utilityComposables)) {
      if (composable.startsWith(pattern) && composable !== 'useRouter' && composable !== 'useRoute') {
        if (!context.utilityLibraryInfo.detected.includes(library)) {
          context.utilityLibraryInfo.detected.push(library);
          context.utilityLibraryInfo.confidence = 'medium';
        }
      }
    }
  }

  return context;
}

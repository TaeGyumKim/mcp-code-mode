/**
 * Automatic Project Context Extraction
 *
 * Automatically generates project information to be included in MCP execute tool responses
 */

import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import { detectApiType as detectApiTypeFromDeps, DEFAULT_API_TYPE_MAPPING, matchesPattern } from '../../llm-analyzer/src/apiTypeMapping.js';

export interface LocalPackageInfo {
  id: string;
  type: string;
  packageName: string;
  analyzed: boolean;
  designSystem?: {
    componentPatterns: string[];  // Regex patterns as strings
    components: Record<string, any>;
  };
  utilityLibrary?: {
    functionPatterns: string[];  // Regex patterns as strings
    functions: Record<string, any>;
  };
}

export interface ProjectContext {
  projectPath?: string;
  hasPackageJson: boolean;

  // API type information
  apiInfo: {
    type: 'grpc' | 'openapi' | 'trpc' | 'rest' | 'graphql' | 'mixed' | 'unknown';
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

  // Local package information (NEW: 분석된 패키지 상세 정보 포함)
  localPackagesInfo: {
    hasConfig: boolean;
    packages: LocalPackageInfo[];
  };

  // Recommended action plan
  recommendedPlan: string[];
}

/**
 * Infer project root from file path by searching for package.json
 */
async function inferProjectRoot(filePath: string): Promise<string | null> {
  const { dirname, isAbsolute, join: pathJoin } = await import('path');
  const { existsSync } = await import('fs');

  // If relative path, use current working directory as base
  let currentDir = isAbsolute(filePath) ? dirname(filePath) : process.cwd();

  // Traverse up to find package.json (max 10 levels)
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = pathJoin(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      console.error(`[inferProjectRoot] Found package.json at: ${currentDir}`);
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root directory
      break;
    }
    currentDir = parentDir;
  }

  console.error(`[inferProjectRoot] No package.json found for: ${filePath}`);
  return null;
}

/**
 * Extract project context from package.json
 *
 * @param projectPath - Explicit project path (priority 1)
 * @param filePath - File path to infer project root from (priority 2)
 */
export async function extractProjectContext(projectPath?: string, filePath?: string): Promise<ProjectContext> {
  // Priority: explicit projectPath > inferred from filePath > env PROJECTS_PATH
  let basePath = projectPath;

  if (!basePath && filePath) {
    const inferredRoot = await inferProjectRoot(filePath);
    if (inferredRoot) {
      basePath = inferredRoot;
      console.error(`[extractProjectContext] Using inferred root from filePath: ${basePath}`);
    }
  }

  if (!basePath) {
    basePath = process.env.PROJECTS_PATH || '/projects';
  }

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
    // Check local packages configuration (NEW: 전체 정보 로드)
    // .mcp는 글로벌 위치에서 로드 (Docker: /app/.mcp, Local: 프로젝트 루트/.mcp)
    const globalMcpPath = process.env.MCP_CONFIG_PATH || '/app/.mcp/local-packages.json';
    const localPackagesPath = existsSync(globalMcpPath)
      ? globalMcpPath
      : join(basePath, '.mcp/local-packages.json');

    console.error('[extractProjectContext] Loading local packages from:', localPackagesPath);
    const localPackagesContent = await fs.readFile(localPackagesPath, 'utf-8');
    const localPackagesData = JSON.parse(localPackagesContent);

    context.localPackagesInfo = {
      hasConfig: true,
      packages: localPackagesData.localPackages?.map((pkg: any) => ({
        id: pkg.id,
        type: pkg.type,
        packageName: pkg.packageName,
        analyzed: pkg.analyzed,
        designSystem: pkg.designSystem ? {
          componentPatterns: pkg.designSystem.componentPatterns || [],
          components: pkg.designSystem.components || {}
        } : undefined,
        utilityLibrary: pkg.utilityLibrary ? {
          functionPatterns: pkg.utilityLibrary.functionPatterns || [],
          functions: pkg.utilityLibrary.functions || {}
        } : undefined
      })) || []
    };

    const unanalyzed = context.localPackagesInfo.packages.filter(p => !p.analyzed);
    if (unanalyzed.length > 0) {
      context.recommendedPlan.push(`📦 ${unanalyzed.length} local packages need analysis`);
    }

    // Auto-detect design systems from local packages
    for (const pkg of context.localPackagesInfo.packages) {
      if (pkg.analyzed && pkg.designSystem) {
        const pkgName = pkg.id.replace('@', '').replace('/', '-');
        if (!context.designSystemInfo.detected.includes(pkgName)) {
          context.designSystemInfo.detected.push(pkgName);
          context.designSystemInfo.confidence = 'high';
          if (!context.designSystemInfo.recommended) {
            context.designSystemInfo.recommended = pkgName;
          }
        }
      }
      if (pkg.analyzed && pkg.utilityLibrary) {
        const pkgName = pkg.id.replace('@', '').replace('/', '-');
        if (!context.utilityLibraryInfo.detected.includes(pkgName)) {
          context.utilityLibraryInfo.detected.push(pkgName);
          context.utilityLibraryInfo.confidence = 'high';
          if (!context.utilityLibraryInfo.recommended) {
            context.utilityLibraryInfo.recommended = pkgName;
          }
        }
      }
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
 * Convert regex pattern string to RegExp
 * Example: "/Common[A-Z]\\w+/g" -> /Common[A-Z]\w+/g
 */
function parseRegexPattern(patternStr: string): RegExp | null {
  try {
    const match = patternStr.match(/^\/(.+)\/([gimuy]*)$/);
    if (match) {
      return new RegExp(match[1], match[2]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enhance project context with file-level analysis (DYNAMIC PATTERNS)
 *
 * @param context - Existing project context from package.json
 * @param fileContent - Current file content to analyze
 * @returns Enhanced context with file-based detections
 */
export function enhanceContextWithFile(context: ProjectContext, fileContent: string): ProjectContext {
  const fileAnalysis = analyzeFileContent(fileContent);

  console.error('[enhanceContextWithFile] File analysis:', {
    componentsFound: fileAnalysis.components,
    importsFound: fileAnalysis.imports.map(i => i.package),
    localPackagesCount: context.localPackagesInfo.packages.length
  });

  // 1. Dynamic design system detection from LOCAL PACKAGES
  for (const localPkg of context.localPackagesInfo.packages) {
    if (!localPkg.analyzed || !localPkg.designSystem) continue;

    const pkgId = localPkg.id.replace('@', '').replace('/', '-');
    let matched = false;

    console.error(`[enhanceContextWithFile] Checking package: ${localPkg.id}`, {
      hasPatterns: !!localPkg.designSystem.componentPatterns,
      patternsCount: localPkg.designSystem.componentPatterns?.length,
      componentsCount: Object.keys(localPkg.designSystem.components || {}).length
    });

    // Check import statements
    for (const imp of fileAnalysis.imports) {
      // Match package name exactly or normalized name
      if (imp.package === localPkg.packageName ||
          imp.package.includes(localPkg.id) ||
          imp.package === localPkg.id) {
        matched = true;
        break;
      }
    }

    // Check component patterns
    if (!matched && localPkg.designSystem.componentPatterns) {
      for (const patternStr of localPkg.designSystem.componentPatterns) {
        const pattern = parseRegexPattern(patternStr);
        if (pattern) {
          for (const component of fileAnalysis.components) {
            if (pattern.test(component)) {
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      }
    }

    // Check if component exists in package's component list
    if (!matched && localPkg.designSystem.components) {
      const componentNames = Object.keys(localPkg.designSystem.components);
      for (const component of fileAnalysis.components) {
        if (componentNames.includes(component)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      console.error(`[enhanceContextWithFile] ✅ Matched package: ${pkgId}`);
      if (!context.designSystemInfo.detected.includes(pkgId)) {
        context.designSystemInfo.detected.push(pkgId);
        context.designSystemInfo.confidence = 'high';
        if (!context.designSystemInfo.recommended) {
          context.designSystemInfo.recommended = pkgId;
        }
      }
    } else {
      console.error(`[enhanceContextWithFile] ❌ No match for package: ${pkgId}`);
    }
  }

  // 2. Fallback: Known design systems (non-local packages)
  const knownDesignSystems = ['element-plus', 'vuetify', 'quasar', 'primevue', 'ant-design-vue', 'naive-ui'];
  for (const imp of fileAnalysis.imports) {
    for (const dsPackage of knownDesignSystems) {
      if (imp.package.includes(dsPackage) || imp.package === dsPackage) {
        const normalizedName = dsPackage.replace('@', '').replace('/', '-');
        if (!context.designSystemInfo.detected.includes(normalizedName)) {
          context.designSystemInfo.detected.push(normalizedName);
          context.designSystemInfo.confidence = 'medium';
        }
      }
    }
  }

  // 3. Dynamic utility library detection from LOCAL PACKAGES
  for (const localPkg of context.localPackagesInfo.packages) {
    if (!localPkg.analyzed || !localPkg.utilityLibrary) continue;

    const pkgId = localPkg.id.replace('@', '').replace('/', '-');
    let matched = false;

    // Check import statements
    for (const imp of fileAnalysis.imports) {
      if (imp.package === localPkg.packageName ||
          imp.package.includes(localPkg.id) ||
          imp.package === localPkg.id) {
        matched = true;
        break;
      }
    }

    // Check function patterns
    if (!matched && localPkg.utilityLibrary.functionPatterns) {
      for (const patternStr of localPkg.utilityLibrary.functionPatterns) {
        const pattern = parseRegexPattern(patternStr);
        if (pattern) {
          for (const composable of fileAnalysis.composables) {
            if (pattern.test(composable)) {
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      }
    }

    // Check if composable exists in package's function list
    if (!matched && localPkg.utilityLibrary.functions) {
      const functionNames = Object.keys(localPkg.utilityLibrary.functions);
      for (const composable of fileAnalysis.composables) {
        if (functionNames.includes(composable)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      if (!context.utilityLibraryInfo.detected.includes(pkgId)) {
        context.utilityLibraryInfo.detected.push(pkgId);
        context.utilityLibraryInfo.confidence = 'high';
        if (!context.utilityLibraryInfo.recommended) {
          context.utilityLibraryInfo.recommended = pkgId;
        }
      }
    }
  }

  // 4. Fallback: Known utility libraries (non-local packages)
  const knownUtilities = ['@vueuse/core', 'vueuse', 'lodash', 'date-fns'];
  for (const imp of fileAnalysis.imports) {
    for (const utilPackage of knownUtilities) {
      if (imp.package.includes(utilPackage)) {
        if (!context.utilityLibraryInfo.detected.includes(utilPackage)) {
          context.utilityLibraryInfo.detected.push(utilPackage);
          context.utilityLibraryInfo.confidence = 'medium';
        }
      }
    }
  }

  // 5. API type detection from imports (more reliable than apiCalls patterns)
  // Only enhance if current type is unknown or has low confidence
  if (context.apiInfo.type === 'unknown' || context.apiInfo.confidence === 'low') {
    const apiTypeMatches: Array<{ type: string; packages: string[]; priority: number; confidence: 'high' | 'medium' | 'low' }> = [];

    // Check imports against API type patterns from apiTypeMapping
    for (const [apiType, config] of Object.entries(DEFAULT_API_TYPE_MAPPING)) {
      const matchedPackages: string[] = [];

      for (const imp of fileAnalysis.imports) {
        for (const pattern of config.patterns) {
          if (matchesPattern(imp.package, pattern)) {
            matchedPackages.push(imp.package);
            console.error(`[enhanceContextWithFile] ✅ Matched API type ${apiType}: ${imp.package}`);
            break;  // Only add package once per type
          }
        }
      }

      if (matchedPackages.length > 0) {
        apiTypeMatches.push({
          type: apiType,
          packages: matchedPackages,
          priority: config.priority,
          confidence: config.confidence
        });
      }
    }

    if (apiTypeMatches.length > 0) {
      // Sort by priority (highest first)
      apiTypeMatches.sort((a, b) => b.priority - a.priority);

      const topMatch = apiTypeMatches[0];
      context.apiInfo.type = topMatch.type as any;
      context.apiInfo.packages = [...new Set([...context.apiInfo.packages, ...topMatch.packages])];
      context.apiInfo.confidence = topMatch.confidence;

      console.error(`[enhanceContextWithFile] ✅ API type detected from imports: ${topMatch.type}`, topMatch.packages);
    }
  }

  // 6. Fallback: API type detection from apiCalls patterns
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

  return context;
}

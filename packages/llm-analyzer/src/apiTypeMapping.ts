/**
 * API Type Detection Mapping
 *
 * Configurable mapping for detecting API types from package.json dependencies
 */

export interface ApiTypePattern {
  /**
   * Patterns to match in package names (supports wildcards)
   * Examples:
   * - "*proto*" matches any package containing "proto"
   * - "@grpc/*" matches any package in @grpc scope
   * - "exact-package-name" matches exact package name
   */
  patterns: string[];

  /**
   * Priority for this API type (higher = more priority)
   * Used when multiple types are detected
   */
  priority: number;

  /**
   * Confidence level when this type is detected
   */
  confidence: 'high' | 'medium' | 'low';
}

export interface ApiTypeMapping {
  grpc: ApiTypePattern;
  openapi: ApiTypePattern;
  rest: ApiTypePattern;
  graphql: ApiTypePattern;
}

/**
 * Default API type detection patterns
 *
 * Customizable via configuration file (.mcp/api-type-mapping.json)
 */
export const DEFAULT_API_TYPE_MAPPING: ApiTypeMapping = {
  grpc: {
    patterns: [
      '@grpc/grpc-js',
      '@grpc/proto-loader',
      '*proto*',
      'grpc',
      'protobufjs'
    ],
    priority: 10,
    confidence: 'high'
  },
  openapi: {
    patterns: [
      '@openapi',
      'openapi',
      'swagger',
      'swagger-ui',
      '@nestjs/swagger'
    ],
    priority: 8,
    confidence: 'high'
  },
  graphql: {
    patterns: [
      'graphql',
      'apollo',
      '@apollo/client',
      'apollo-server',
      '@graphql-tools/*'
    ],
    priority: 9,
    confidence: 'high'
  },
  rest: {
    patterns: [
      'axios',
      'ky',
      'got',
      'node-fetch',
      'isomorphic-fetch',
      'superagent'
    ],
    priority: 5,
    confidence: 'medium'
  }
};

/**
 * Check if a package name matches a pattern
 *
 * Supports:
 * - Exact match: "axios"
 * - Wildcard: "*proto*", "@grpc/*"
 * - Scope: "@openapi"
 *
 * @param packageName Package name to check
 * @param pattern Pattern to match against
 * @returns true if matches
 */
export function matchesPattern(packageName: string, pattern: string): boolean {
  // Exact match
  if (packageName === pattern) {
    return true;
  }

  // Convert wildcard pattern to regex
  // "*proto*" -> /^.*proto.*$/
  // "@grpc/*" -> /^@grpc\/.*$/
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special regex chars except *
    .replace(/\*/g, '.*');                   // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(packageName);
}

/**
 * Get API type mapping from configuration or default
 *
 * Loads from .mcp/api-type-mapping.json if exists, otherwise uses default
 */
export async function getApiTypeMapping(projectPath?: string): Promise<ApiTypeMapping> {
  const basePath = projectPath || process.env.PROJECTS_PATH || '/projects';

  // Try to load from global .mcp directory first
  const globalMcpPath = process.env.MCP_CONFIG_PATH || '/app/.mcp/api-type-mapping.json';
  const localMcpPath = `${basePath}/.mcp/api-type-mapping.json`;

  try {
    // Use static imports for better compatibility
    const { promises: fs, existsSync } = require('fs');

    // Try global path first, then local path
    const configPath = existsSync(globalMcpPath) ? globalMcpPath : localMcpPath;

    if (existsSync(configPath)) {
      console.error(`[getApiTypeMapping] Loading custom mapping from: ${configPath}`);
      const configContent = await fs.readFile(configPath, 'utf-8');
      const customMapping = JSON.parse(configContent) as Partial<ApiTypeMapping>;

      // Merge with defaults (custom overrides default)
      return {
        ...DEFAULT_API_TYPE_MAPPING,
        ...customMapping
      };
    }
  } catch (error) {
    console.error('[getApiTypeMapping] Failed to load custom mapping, using defaults:', error);
  }

  console.error('[getApiTypeMapping] Using default mapping');
  return DEFAULT_API_TYPE_MAPPING;
}

/**
 * Detect API type from dependencies using configurable mapping
 *
 * @param dependencies Package dependencies object
 * @param mapping Optional custom mapping (uses default if not provided)
 * @returns Detected API type with confidence and matched packages
 */
export interface ApiTypeInfo {
  type: 'grpc' | 'openapi' | 'rest' | 'graphql' | 'mixed' | 'unknown';
  packages: string[];
  confidence: 'high' | 'medium' | 'low';
}

export async function detectApiType(
  dependencies: Record<string, string>,
  projectPath?: string
): Promise<ApiTypeInfo> {
  const mapping = await getApiTypeMapping(projectPath);

  console.error('[detectApiType] Checking dependencies:', Object.keys(dependencies).length, 'packages');

  const detectedTypes: Array<{
    type: keyof ApiTypeMapping;
    packages: string[];
    priority: number;
    confidence: 'high' | 'medium' | 'low';
  }> = [];

  // Check each API type
  for (const [apiType, config] of Object.entries(mapping) as Array<[keyof ApiTypeMapping, ApiTypePattern]>) {
    const matchedPackages: string[] = [];

    for (const dep of Object.keys(dependencies)) {
      for (const pattern of config.patterns) {
        if (matchesPattern(dep, pattern)) {
          matchedPackages.push(dep);
          console.error(`[detectApiType] ✅ Matched ${apiType}: ${dep} (pattern: ${pattern})`);
          break;  // Only add package once per type
        }
      }
    }

    if (matchedPackages.length > 0) {
      detectedTypes.push({
        type: apiType,
        packages: matchedPackages,
        priority: config.priority,
        confidence: config.confidence
      });
    }
  }

  // No API type detected
  if (detectedTypes.length === 0) {
    console.error('[detectApiType] ⚠️  No API type detected. Sample dependencies:', Object.keys(dependencies).slice(0, 10));
    return {
      type: 'unknown',
      packages: [],
      confidence: 'low'
    };
  }

  // Single type detected
  if (detectedTypes.length === 1) {
    const result = {
      type: detectedTypes[0].type,
      packages: detectedTypes[0].packages,
      confidence: detectedTypes[0].confidence
    };
    console.error(`[detectApiType] ✅ Detected API type: ${result.type}`, result.packages);
    return result;
  }

  // Multiple types detected - return mixed or highest priority
  // Sort by priority (highest first)
  detectedTypes.sort((a, b) => b.priority - a.priority);

  // If top 2 have similar priority (within 2 points), consider it mixed
  if (detectedTypes[0].priority - detectedTypes[1].priority <= 2) {
    const result = {
      type: 'mixed' as const,
      packages: detectedTypes.flatMap(d => d.packages),
      confidence: 'high' as const
    };
    console.error(`[detectApiType] ✅ Detected multiple API types (mixed):`, detectedTypes.map(d => d.type));
    return result;
  }

  // Return highest priority type
  const result = {
    type: detectedTypes[0].type,
    packages: detectedTypes[0].packages,
    confidence: detectedTypes[0].confidence
  };
  console.error(`[detectApiType] ✅ Detected API type (highest priority): ${result.type}`, result.packages);
  return result;
}

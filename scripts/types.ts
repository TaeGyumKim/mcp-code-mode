/**
 * 스크립트 공통 타입 정의
 */

export interface ProjectInfo {
  name: string;
  path: string;
  category: string;
}

export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
}

export interface ScanPatterns {
  stats?: {
    totalFiles: number;
    vueFiles: number;
    tsFiles: number;
    jsFiles: number;
  };
  apiInfo?: {
    hasGrpc: boolean;
    hasOpenApi: boolean;
    apiType?: string;
  };
  codePatterns?: {
    framework?: string;
    usesTypescript: boolean;
    hasComposables?: boolean;
    hasPages?: boolean;
  };
  componentUsage?: Record<string, number>;
  sampleCode?: {
    components?: Array<{ path: string; content: string }>;
    composables?: Array<{ path: string; content: string }>;
    api?: Array<{ path: string; content: string }>;
  };
  scores?: {
    final: number;
    pattern: number;
    api: number;
    component: number;
    tier: string;
  };
  aiAnalysis?: {
    averageScore: number;
    totalFiles: number;
    topFiles: Array<{ path: string; score: number }>;
  };
  [key: string]: any;
}

export interface BestCaseFile {
  path: string;
  content: string;
  purpose: string;
}

export interface BestCaseData {
  id: string;
  projectName: string;
  category: string;
  description: string;
  files: BestCaseFile[];
  patterns: ScanPatterns;
  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
  };
}

export interface AnalysisResult {
  results: Array<{
    filePath: string;
    score: number;
    category: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  summary: {
    averageScore: number;
    totalFiles: number;
    topFiles: Array<{ path: string; score: number }>;
    excellentSnippets?: any[];
  };
}

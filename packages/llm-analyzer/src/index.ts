/**
 * LLM Analyzer Package
 * AI 기반 코드 품질 분석 및 메타데이터 추출
 */

export { OllamaClient } from './ollamaClient.js';
export type { OllamaGenerateRequest, OllamaGenerateResponse } from './ollamaClient.js';

// 기존 점수 기반 분석기 (호환성 유지)
export { CodeAnalyzer } from './codeAnalyzer.js';
export type {
  FileAnalysisResult,
  ComponentAnalysisResult,
  ExcellentCodeSnippet
} from './codeAnalyzer.js';

export { PromptTemplates } from './prompts.js';

// 새로운 메타데이터 추출 분석기 ⭐ NEW
export { MetadataAnalyzer } from './metadataAnalyzer.js';
export { MetadataPrompts } from './metadataPrompts.js';

export type {
  FileMetadata,
  ComponentMetadata,
  ExcellentCodeMetadata,
  ProjectMetadata,
  ComplexityLevel,
  ReusabilityLevel,
  ErrorHandlingLevel,
  TypeDefinitionQuality
} from './metadata.js';

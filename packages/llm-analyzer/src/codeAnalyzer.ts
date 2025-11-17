/**
 * AI 기반 코드 분석기
 */

import { OllamaClient } from './ollamaClient.js';
import { PromptTemplates } from './prompts.js';

export interface FileAnalysisResult {
  filePath: string;
  category: 'composable' | 'component' | 'api' | 'utility' | 'page' | 'other';
  score: number;
  apiType?: 'openapi' | 'grpc' | 'rest' | 'none';
  strengths: string[];
  weaknesses: string[];
  excellentCode?: {
    exists: boolean;
    lines?: string;
    description?: string;
  };
  recommendations: string[];
}

export interface ComponentAnalysisResult {
  filePath: string;
  score: number;
  vModelBindings: Array<{
    name: string;
    component: string;
    quality: number;
    hasWatch: boolean;
    hasValidation: boolean;
    hasTypeDefinition: boolean;
    recommendation: string;
  }>;
  componentsUsed: string[];
  composablesUsed: string[];
  excellentPatterns: string[];
  issues: string[];
  excellentCode?: {
    exists: boolean;
    lines?: string;
    description?: string;
  };
}

export interface ExcellentCodeSnippet {
  filePath: string;
  lines: string;
  category: string;
  score: number;
  reason: string;
  code: string;
  usageContext: string;
  reusable: boolean;
  tags: string[];
}

/**
 * @deprecated 점수 기반 분석기는 더 이상 권장되지 않습니다.
 * 대신 MetadataAnalyzer를 사용하세요.
 *
 * MetadataAnalyzer는 더 빠르고 효율적인 메타데이터 추출 방식을 제공합니다.
 *
 * @see MetadataAnalyzer
 */
export class CodeAnalyzer {
  private llm: OllamaClient;
  private model: string;

  constructor(config?: { ollamaUrl?: string; model?: string; concurrency?: number }) {
    const ollamaUrl = config?.ollamaUrl || 'http://localhost:11434';
    const model = config?.model || 'qwen2.5-coder:7b';
    
    this.llm = new OllamaClient(ollamaUrl);
    this.model = model;
  }

  /**
   * 파일 타입 빠르게 분류 (간단한 분석)
   */
  async quickClassify(filePath: string, content: string): Promise<{
    category: string;
    hasAPI: boolean;
    hasComponents: boolean;
    worthDeepAnalysis: boolean;
    estimatedComplexity: string;
  }> {
    try {
      const prompt = PromptTemplates.quickClassification(filePath, content);
      const result = await this.llm.generateJSON(prompt, this.model, 0.1);
      return result;
    } catch (error) {
      console.error(`Quick classification failed for ${filePath}:`, error);
      return {
        category: 'other',
        hasAPI: false,
        hasComponents: false,
        worthDeepAnalysis: false,
        estimatedComplexity: 'low'
      };
    }
  }

  /**
   * API 파일 분석 (composables, api 디렉토리)
   */
  async analyzeAPI(filePath: string, content: string): Promise<FileAnalysisResult> {
    try {
      const prompt = PromptTemplates.apiQualityAnalysis(filePath, content);
      const result = await this.llm.generateJSON(prompt, this.model, 0.3); // temperature 증가
      
      return {
        filePath,
        category: 'api',
        score: result.score || 0,
        apiType: result.apiType,
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        excellentCode: result.excellentCode,
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error(`API analysis failed for ${filePath}:`, error);
      return this.getDefaultResult(filePath, 'api');
    }
  }

  /**
   * Vue 컴포넌트 분석 (.vue 파일)
   */
  async analyzeComponent(
    filePath: string,
    templateContent: string,
    scriptContent: string
  ): Promise<ComponentAnalysisResult> {
    try {
      const prompt = PromptTemplates.componentBindingAnalysis(
        filePath,
        templateContent,
        scriptContent
      );
      const result = await this.llm.generateJSON(prompt, this.model, 0.3); // temperature 증가
      
      return {
        filePath,
        score: result.score || 0,
        vModelBindings: result.vModelBindings || [],
        componentsUsed: result.componentsUsed || [],
        composablesUsed: result.composablesUsed || [],
        excellentPatterns: result.excellentPatterns || [],
        issues: result.issues || [],
        excellentCode: result.excellentCode
      };
    } catch (error) {
      console.error(`Component analysis failed for ${filePath}:`, error);
      return {
        filePath,
        score: 0,
        vModelBindings: [],
        componentsUsed: [],
        composablesUsed: [],
        excellentPatterns: [],
        issues: ['Analysis failed']
      };
    }
  }

  /**
   * 우수 코드 패턴 찾기
   */
  async findExcellentCode(filePath: string, content: string): Promise<ExcellentCodeSnippet[]> {
    try {
      const prompt = PromptTemplates.excellenceDetection(filePath, content);
      const result = await this.llm.generateJSON(prompt, this.model, 0.1);
      
      if (!result.hasExcellentCode || !result.snippets) {
        return [];
      }
      
      return result.snippets
        .filter((s: any) => s.score >= 85)
        .map((s: any) => ({
          filePath,
          lines: s.lines,
          category: s.category,
          score: s.score,
          reason: s.reason,
          code: s.code,
          usageContext: s.usageContext,
          reusable: s.reusable,
          tags: s.tags || []
        }));
    } catch (error) {
      console.error(`Excellence detection failed for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Vue 파일 파싱 (template, script 분리)
   */
  parseVueFile(content: string): { template: string; script: string } {
    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    
    return {
      template: templateMatch ? templateMatch[1] : '',
      script: scriptMatch ? scriptMatch[1] : ''
    };
  }

  /**
   * 파일 분석 (자동 타입 감지)
   */
  async analyzeFile(filePath: string, content: string): Promise<FileAnalysisResult | ComponentAnalysisResult> {
    // Vue 파일인 경우
    if (filePath.endsWith('.vue')) {
      const { template, script } = this.parseVueFile(content);
      return this.analyzeComponent(filePath, template, script);
    }
    
    // TypeScript/JavaScript 파일인 경우
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      // composables, api 디렉토리는 API 분석
      if (filePath.includes('composables') || filePath.includes('/api/')) {
        return this.analyzeAPI(filePath, content);
      }
    }
    
    // 기본: API 분석
    return this.analyzeAPI(filePath, content);
  }

  /**
   * 기본 결과 반환 (분석 실패 시)
   */
  private getDefaultResult(filePath: string, category: string): FileAnalysisResult {
    return {
      filePath,
      category: category as any,
      score: 0,
      strengths: [],
      weaknesses: ['Analysis failed'],
      recommendations: []
    };
  }

  /**
   * Ollama 서버 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    return this.llm.healthCheck();
  }

  /**
   * 사용 가능한 모델 목록
   */
  async listModels(): Promise<string[]> {
    return this.llm.listModels();
  }

  /**
   * 병렬 파일 분석 (Promise.all 사용)
   * @param files 분석할 파일 목록 [{path, content}]
   * @param concurrency 동시 실행 개수 (기본 3, GPU 사용 시 더 높게 설정 가능)
   */
  async analyzeFilesParallel(
    files: Array<{ path: string; content: string }>,
    concurrency: number = 3
  ): Promise<Array<FileAnalysisResult | ComponentAnalysisResult>> {
    const results: Array<FileAnalysisResult | ComponentAnalysisResult> = [];
    
    // concurrency 개수씩 배치로 나누기
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      
      console.log(`\n🔄 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(files.length / concurrency)} (${batch.length} files)`);
      
      const batchPromises = batch.map(async (file) => {
        const startTime = Date.now();
        try {
          const result = await this.analyzeFile(file.path, file.content);
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ✅ ${file.path.split(/[\\/]/).pop()} - ${result.score}/100 (${duration}s)`);
          return result;
        } catch (error) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ❌ ${file.path.split(/[\\/]/).pop()} - failed (${duration}s)`);
          return this.getDefaultResult(file.path, 'other');
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 프로젝트 전체 분석 (병렬 처리)
   * @param projectPath 프로젝트 경로
   * @param fileList 파일 목록 (filesystem.searchFiles 결과)
   * @param concurrency 동시 실행 개수
   */
  async analyzeProject(
    projectPath: string,
    fileList: Array<{ path: string; content: string }>,
    concurrency: number = 3
  ): Promise<{
    results: Array<FileAnalysisResult | ComponentAnalysisResult>;
    summary: {
      totalFiles: number;
      averageScore: number;
      topFiles: Array<{ path: string; score: number }>;
      excellentSnippets: ExcellentCodeSnippet[];
    };
  }> {
    const startTime = Date.now();
    
    console.log(`\n📊 Analyzing project: ${projectPath}`);
    console.log(`📁 Total files: ${fileList.length}`);
    console.log(`⚡ Concurrency: ${concurrency} (parallel processing)\n`);
    
    // 병렬 분석 실행
    const results = await this.analyzeFilesParallel(fileList, concurrency);
    
    // 우수 코드 스니펫 추출 (85점 이상)
    const excellentFiles = results.filter(r => r.score >= 85);
    const excellentSnippets: ExcellentCodeSnippet[] = [];
    
    for (const file of excellentFiles) {
      if ('excellentCode' in file && file.excellentCode?.exists) {
        // 실제 파일에서 코드 스니펫 추출 (간단히 파일 경로만 저장)
        excellentSnippets.push({
          filePath: file.filePath,
          lines: file.excellentCode.lines || 'full',
          category: 'category' in file ? file.category : 'component',
          score: file.score,
          reason: file.excellentCode.description || 'Excellent code',
          code: '', // 실제로는 파일에서 라인 추출 필요
          usageContext: 'See file for usage',
          reusable: true,
          tags: []
        });
      }
    }
    
    // 통계 계산
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = results.length > 0 ? totalScore / results.length : 0;
    
    const topFiles = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => ({ path: r.filePath, score: r.score }));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✨ Analysis completed in ${duration}s`);
    console.log(`📊 Average score: ${averageScore.toFixed(1)}/100`);
    console.log(`🌟 Excellent files (85+): ${excellentFiles.length}`);
    
    return {
      results,
      summary: {
        totalFiles: results.length,
        averageScore,
        topFiles,
        excellentSnippets
      }
    };
  }
}

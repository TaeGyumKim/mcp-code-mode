/**
 * 메타데이터 기반 코드 분석기
 *
 * 점수 산출 대신 구조화된 메타데이터를 추출하여
 * 동적 지침 로딩 시스템과 통합
 */

import { OllamaClient } from './ollamaClient.js';
import { MetadataPrompts } from './metadataPrompts.js';
import type {
  FileMetadata,
  ComponentMetadata,
  ExcellentCodeMetadata,
  ProjectMetadata,
  ComplexityLevel
} from './metadata.js';

export class MetadataAnalyzer {
  private llm: OllamaClient;
  private model: string;

  constructor(config?: { ollamaUrl?: string; model?: string; concurrency?: number }) {
    const ollamaUrl = config?.ollamaUrl || 'http://localhost:11434';
    const model = config?.model || 'qwen2.5-coder:7b';

    this.llm = new OllamaClient(ollamaUrl);
    this.model = model;
  }

  /**
   * 파일 타입 빠르게 분류
   */
  async quickClassify(filePath: string, content: string): Promise<{
    category: string;
    hasAPI: boolean;
    hasComponents: boolean;
    worthDeepAnalysis: boolean;
    estimatedComplexity: ComplexityLevel;
  }> {
    try {
      const prompt = MetadataPrompts.quickClassification(filePath, content);
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
   * API/Composable 파일 메타데이터 추출
   */
  async extractFileMetadata(filePath: string, content: string): Promise<FileMetadata> {
    try {
      const prompt = MetadataPrompts.extractFileMetadata(filePath, content);
      const result = await this.llm.generateJSON(prompt, this.model, 0.2);

      return {
        filePath,
        category: this.inferCategory(filePath),
        patterns: result.patterns || [],
        frameworks: result.frameworks || [],
        apiType: result.apiType,
        apiMethods: result.apiMethods || [],
        complexity: result.complexity || 'medium',
        reusability: result.reusability || 'medium',
        errorHandling: result.errorHandling || 'basic',
        typeDefinitions: result.typeDefinitions || 'basic',
        dependencies: result.dependencies || [],
        composablesUsed: result.composablesUsed || [],
        entities: result.entities || [],
        features: result.features || [],
        hasDocumentation: result.hasDocumentation || false,
        isExcellent: result.isExcellent || false,
        excellentReasons: result.excellentReasons,
        linesOfCode: content.split('\n').length
      };
    } catch (error) {
      console.error(`File metadata extraction failed for ${filePath}:`, error);
      return this.getDefaultFileMetadata(filePath, content);
    }
  }

  /**
   * Vue 컴포넌트 메타데이터 추출
   */
  async extractComponentMetadata(
    filePath: string,
    templateContent: string,
    scriptContent: string
  ): Promise<ComponentMetadata> {
    try {
      const prompt = MetadataPrompts.extractComponentMetadata(
        filePath,
        templateContent,
        scriptContent
      );
      const result = await this.llm.generateJSON(prompt, this.model, 0.2);

      return {
        filePath,
        category: 'component',
        patterns: result.patterns || [],
        frameworks: result.frameworks || [],
        componentsUsed: result.componentsUsed || [],
        composablesUsed: result.composablesUsed || [],
        vModelBindings: result.vModelBindings || [],
        complexity: result.complexity || 'medium',
        reusability: result.reusability || 'medium',
        errorHandling: result.errorHandling || 'basic',
        typeDefinitions: result.typeDefinitions || 'basic',
        features: result.features || [],
        entities: result.entities || [],
        hasLoadingStates: result.hasLoadingStates || false,
        hasErrorStates: result.hasErrorStates || false,
        isExcellent: result.isExcellent || false,
        excellentReasons: result.excellentReasons,
        excellentPatterns: result.excellentPatterns,
        linesOfCode: (templateContent + scriptContent).split('\n').length,
        templateLines: templateContent.split('\n').length,
        scriptLines: scriptContent.split('\n').length
      };
    } catch (error) {
      console.error(`Component metadata extraction failed for ${filePath}:`, error);
      return this.getDefaultComponentMetadata(filePath, templateContent, scriptContent);
    }
  }

  /**
   * 우수 코드 패턴 감지
   */
  async detectExcellentPatterns(filePath: string, content: string): Promise<ExcellentCodeMetadata[]> {
    try {
      const prompt = MetadataPrompts.detectExcellentPatterns(filePath, content);
      const result = await this.llm.generateJSON(prompt, this.model, 0.1);

      if (!result.hasExcellentCode || !result.snippets) {
        return [];
      }

      return result.snippets.map((s: any) => ({
        filePath,
        lines: s.lines,
        category: this.inferCategory(filePath),
        patterns: s.patterns || [],
        reason: s.reason,
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
   * Vue 파일 파싱
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
  async analyzeFile(filePath: string, content: string): Promise<FileMetadata | ComponentMetadata> {
    // Vue 파일인 경우
    if (filePath.endsWith('.vue')) {
      const { template, script } = this.parseVueFile(content);
      return this.extractComponentMetadata(filePath, template, script);
    }

    // TypeScript/JavaScript 파일인 경우
    return this.extractFileMetadata(filePath, content);
  }

  /**
   * 병렬 파일 분석
   */
  async analyzeFilesParallel(
    files: Array<{ path: string; content: string }>,
    concurrency: number = 3
  ): Promise<Array<FileMetadata | ComponentMetadata>> {
    const results: Array<FileMetadata | ComponentMetadata> = [];

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      console.log(`\n🔄 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(files.length / concurrency)} (${batch.length} files)`);

      const batchPromises = batch.map(async (file) => {
        const startTime = Date.now();
        try {
          const result = await this.analyzeFile(file.path, file.content);
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ✅ ${file.path.split(/[\\/]/).pop()} - complexity: ${result.complexity} (${duration}s)`);
          return result;
        } catch (error) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ❌ ${file.path.split(/[\\/]/).pop()} - failed (${duration}s)`);
          return this.getDefaultFileMetadata(file.path, file.content);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 프로젝트 전체 분석 (병렬 처리)
   */
  async analyzeProject(
    projectPath: string,
    fileList: Array<{ path: string; content: string }>,
    concurrency: number = 3
  ): Promise<ProjectMetadata> {
    const startTime = Date.now();

    console.log(`\n📊 Analyzing project: ${projectPath}`);
    console.log(`📁 Total files: ${fileList.length}`);
    console.log(`⚡ Concurrency: ${concurrency} (parallel processing)\n`);

    // 병렬 분석 실행
    const results = await this.analyzeFilesParallel(fileList, concurrency);

    // 메타데이터 집계
    const metadata = this.aggregateMetadata(projectPath, results);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✨ Analysis completed in ${duration}s`);
    console.log(`📊 Files analyzed: ${metadata.totalFiles}`);
    console.log(`🏗️  Frameworks detected: ${metadata.frameworks.join(', ')}`);
    console.log(`🔧 API Type: ${metadata.apiType}`);
    console.log(`🌟 Excellent files: ${metadata.excellentFiles.length}`);

    return metadata;
  }

  /**
   * 메타데이터 집계
   */
  private aggregateMetadata(
    projectPath: string,
    results: Array<FileMetadata | ComponentMetadata>
  ): ProjectMetadata {
    const allFrameworks = new Set<string>();
    const allPatterns = new Set<string>();
    const allDependencies = new Set<string>();
    const allComponentsUsed = new Set<string>();
    const allComposablesUsed = new Set<string>();
    const allEntities = new Set<string>();
    const allApiMethods: string[] = [];

    const filesByCategory: Record<string, number> = {};
    const complexityDistribution: Record<ComplexityLevel, number> = {
      'trivial': 0,
      'low': 0,
      'medium': 0,
      'high': 0,
      'very-high': 0
    };

    let apiTypeCount: Record<string, number> = {};
    let totalLinesOfCode = 0;
    let filesWithGoodErrorHandling = 0;
    let filesWithGoodTypes = 0;

    const excellentFiles: Array<{ path: string; reasons: string[]; patterns: string[] }> = [];

    results.forEach(result => {
      // Frameworks
      result.frameworks.forEach(f => allFrameworks.add(f));

      // Patterns
      result.patterns.forEach(p => allPatterns.add(p));

      // Dependencies (FileMetadata만)
      if ('dependencies' in result) {
        result.dependencies.forEach(d => allDependencies.add(d));
      }

      // Components and Composables
      result.composablesUsed.forEach(c => allComposablesUsed.add(c));
      if ('componentsUsed' in result) {
        result.componentsUsed.forEach(c => allComponentsUsed.add(c));
      }

      // Entities
      result.entities.forEach(e => allEntities.add(e));

      // API Methods (FileMetadata만)
      if ('apiMethods' in result) {
        allApiMethods.push(...result.apiMethods);
      }

      // API Type
      if ('apiType' in result && result.apiType) {
        apiTypeCount[result.apiType] = (apiTypeCount[result.apiType] || 0) + 1;
      }

      // Category
      filesByCategory[result.category] = (filesByCategory[result.category] || 0) + 1;

      // Complexity
      complexityDistribution[result.complexity]++;

      // Lines of code
      totalLinesOfCode += result.linesOfCode;

      // Quality metrics
      if (result.errorHandling === 'comprehensive') {
        filesWithGoodErrorHandling++;
      }
      if (result.typeDefinitions === 'excellent' || result.typeDefinitions === 'good') {
        filesWithGoodTypes++;
      }

      // Excellent files
      if (result.isExcellent) {
        excellentFiles.push({
          path: result.filePath,
          reasons: result.excellentReasons || [],
          patterns: result.patterns
        });
      }
    });

    // API type 결정 (가장 많이 사용된 타입)
    const dominantApiType = Object.entries(apiTypeCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    // Average complexity
    const complexityLevels: ComplexityLevel[] = ['trivial', 'low', 'medium', 'high', 'very-high'];
    const avgComplexityIndex = complexityLevels.reduce((sum, level, idx) => {
      return sum + (complexityDistribution[level] * idx);
    }, 0) / results.length;
    const averageComplexity = complexityLevels[Math.round(avgComplexityIndex)];

    return {
      projectName: projectPath.split(/[\\/]/).slice(-2).join('/'),
      totalFiles: results.length,
      filesByCategory,
      apiType: dominantApiType as any,
      apiMethods: [...new Set(allApiMethods)],
      frameworks: Array.from(allFrameworks),
      patterns: Array.from(allPatterns),
      dependencies: Array.from(allDependencies),
      componentsUsed: Array.from(allComponentsUsed),
      composablesUsed: Array.from(allComposablesUsed),
      entities: Array.from(allEntities),
      complexityDistribution,
      excellentFiles,
      excellentSnippets: [],  // 별도 분석 필요
      averageComplexity,
      totalLinesOfCode,
      filesWithGoodErrorHandling,
      filesWithGoodTypes
    };
  }

  /**
   * 카테고리 추론
   */
  private inferCategory(filePath: string): FileMetadata['category'] {
    if (filePath.includes('composables')) return 'composable';
    if (filePath.includes('/api/')) return 'api';
    if (filePath.includes('utils')) return 'utility';
    if (filePath.includes('pages')) return 'page';
    return 'other';
  }

  /**
   * 기본 파일 메타데이터
   */
  private getDefaultFileMetadata(filePath: string, content: string): FileMetadata {
    return {
      filePath,
      category: this.inferCategory(filePath),
      patterns: [],
      frameworks: [],
      apiMethods: [],
      complexity: 'low',
      reusability: 'low',
      errorHandling: 'none',
      typeDefinitions: 'poor',
      dependencies: [],
      composablesUsed: [],
      entities: [],
      features: [],
      hasDocumentation: false,
      isExcellent: false,
      linesOfCode: content.split('\n').length
    };
  }

  /**
   * 기본 컴포넌트 메타데이터
   */
  private getDefaultComponentMetadata(
    filePath: string,
    templateContent: string,
    scriptContent: string
  ): ComponentMetadata {
    return {
      filePath,
      category: 'component',
      patterns: [],
      frameworks: [],
      componentsUsed: [],
      composablesUsed: [],
      vModelBindings: [],
      complexity: 'low',
      reusability: 'low',
      errorHandling: 'none',
      typeDefinitions: 'poor',
      features: [],
      entities: [],
      hasLoadingStates: false,
      hasErrorStates: false,
      isExcellent: false,
      linesOfCode: (templateContent + scriptContent).split('\n').length,
      templateLines: templateContent.split('\n').length,
      scriptLines: scriptContent.split('\n').length
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
   * 메타데이터 기반 파일 점수 계산 (0-100)
   *
   * 메타데이터를 먼저 추출한 후, 그 메타데이터 기반으로 점수를 산출합니다.
   * 이 방식은 객관적이고 재현 가능하며, 메타데이터를 다른 용도로도 활용할 수 있습니다.
   *
   * 점수 계산 로직:
   * - complexity: trivial(20), low(40), medium(60), high(80), very-high(100)
   * - errorHandling: none(0), basic(50), comprehensive(100)
   * - typeDefinitions: poor(25), basic(50), good(75), excellent(100)
   * - reusability: low(33), medium(66), high(100)
   * - 평균 점수 = (complexity + errorHandling + typeDefinitions + reusability) / 4
   * - isExcellent 보너스: +10점
   * - 최종 점수: 0-100 범위로 조정
   */
  calculateFileScore(metadata: FileMetadata | ComponentMetadata): number {
    // 1. Complexity 점수
    const complexityScores: Record<ComplexityLevel, number> = {
      'trivial': 20,
      'low': 40,
      'medium': 60,
      'high': 80,
      'very-high': 100
    };
    const complexityScore = complexityScores[metadata.complexity];

    // 2. Error Handling 점수
    const errorHandlingScores: Record<string, number> = {
      'none': 0,
      'basic': 50,
      'comprehensive': 100
    };
    const errorHandlingScore = errorHandlingScores[metadata.errorHandling];

    // 3. Type Definitions 점수
    const typeDefinitionsScores: Record<string, number> = {
      'poor': 25,
      'basic': 50,
      'good': 75,
      'excellent': 100
    };
    const typeDefinitionsScore = typeDefinitionsScores[metadata.typeDefinitions];

    // 4. Reusability 점수
    const reusabilityScores: Record<string, number> = {
      'low': 33,
      'medium': 66,
      'high': 100
    };
    const reusabilityScore = reusabilityScores[metadata.reusability];

    // 5. 평균 점수 계산
    const baseScore = (
      complexityScore +
      errorHandlingScore +
      typeDefinitionsScore +
      reusabilityScore
    ) / 4;

    // 6. Excellent 보너스
    const excellentBonus = metadata.isExcellent ? 10 : 0;

    // 7. 최종 점수 (0-100 범위)
    const finalScore = Math.min(100, Math.max(0, baseScore + excellentBonus));

    return Math.round(finalScore);
  }

  /**
   * 메타데이터 기반 프로젝트 점수 계산 (0-100)
   *
   * 프로젝트의 모든 파일 점수를 집계하여 프로젝트 전체 점수를 산출합니다.
   *
   * 점수 계산 로직:
   * - 파일 점수의 평균
   * - 우수 파일 비율 보너스: (excellentFiles / totalFiles) * 20
   * - 에러 처리 품질 보너스: (goodErrorHandling / totalFiles) * 10
   * - 타입 품질 보너스: (goodTypes / totalFiles) * 10
   */
  calculateProjectScore(
    metadata: ProjectMetadata,
    fileResults: Array<FileMetadata | ComponentMetadata>
  ): {
    overall: number;
    average: number;
    excellent: number;
    errorHandling: number;
    typeQuality: number;
    distribution: Record<string, number>;
  } {
    // 1. 파일별 점수 계산
    const fileScores = fileResults.map(file => this.calculateFileScore(file));

    // 2. 평균 점수
    const average = fileScores.reduce((sum, score) => sum + score, 0) / fileScores.length;

    // 3. 우수 파일 비율 보너스
    const excellentRatio = metadata.excellentFiles.length / metadata.totalFiles;
    const excellentBonus = excellentRatio * 20;

    // 4. 에러 처리 품질 보너스
    const errorHandlingRatio = metadata.filesWithGoodErrorHandling / metadata.totalFiles;
    const errorHandlingBonus = errorHandlingRatio * 10;

    // 5. 타입 품질 보너스
    const typeQualityRatio = metadata.filesWithGoodTypes / metadata.totalFiles;
    const typeQualityBonus = typeQualityRatio * 10;

    // 6. 전체 점수
    const overall = Math.min(100, Math.max(0,
      average + excellentBonus + errorHandlingBonus + typeQualityBonus
    ));

    // 7. 점수 분포 계산 (티어)
    const distribution: Record<string, number> = {
      'S': fileScores.filter(s => s >= 90).length,   // 90-100
      'A': fileScores.filter(s => s >= 70 && s < 90).length,  // 70-89
      'B': fileScores.filter(s => s >= 50 && s < 70).length,  // 50-69
      'C': fileScores.filter(s => s >= 30 && s < 50).length,  // 30-49
      'D': fileScores.filter(s => s < 30).length      // 0-29
    };

    return {
      overall: Math.round(overall),
      average: Math.round(average),
      excellent: Math.round(excellentBonus),
      errorHandling: Math.round(errorHandlingBonus),
      typeQuality: Math.round(typeQualityBonus),
      distribution
    };
  }

  /**
   * 점수 기반 티어 결정
   */
  getTierFromScore(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
    if (score >= 90) return 'S';
    if (score >= 70) return 'A';
    if (score >= 50) return 'B';
    if (score >= 30) return 'C';
    return 'D';
  }
}

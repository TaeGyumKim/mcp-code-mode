/**
 * AI 기반 로컬 패키지 분석기
 *
 * 로컬 디자인 시스템/유틸리티 라이브러리의 소스 코드를
 * AI로 분석하여 컴포넌트와 함수를 자동 추출
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { MetadataAnalyzer } from './metadataAnalyzer.js';
import { LocalPackageManager } from './localPackageManager.js';
import type {
  LocalPackage,
  LocalDesignSystemInfo,
  LocalUtilityLibraryInfo,
  LocalComponentInfo,
  LocalFunctionInfo
} from './localPackageTypes.js';

export class LocalPackageAnalyzer {
  private analyzer: MetadataAnalyzer;
  private manager: LocalPackageManager;

  constructor(config?: { ollamaUrl?: string; model?: string }) {
    this.analyzer = new MetadataAnalyzer(config);
    this.manager = new LocalPackageManager();
  }

  /**
   * 로컬 패키지 분석 (AI 기반)
   */
  async analyzePackage(packageId: string): Promise<void> {
    console.log(`\n🔍 Analyzing local package: ${packageId}`);

    // 패키지 정보 로드
    const pkg = await this.manager.getPackage(packageId);
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }

    console.log(`📦 Package: ${pkg.name} (${pkg.type})`);
    console.log(`📂 Source path: ${pkg.sourcePath}`);

    // 소스 파일 스캔
    const files = await this.scanSourceFiles(pkg.sourcePath);
    console.log(`📄 Found ${files.length} files`);

    if (files.length === 0) {
      console.warn(`⚠️  No files found in ${pkg.sourcePath}`);
      return;
    }

    // AI 분석 실행
    const results = await this.analyzer.analyzeFilesParallel(files, 3);

    // 결과 집계
    let designSystem: LocalDesignSystemInfo | undefined;
    let utilityLibrary: LocalUtilityLibraryInfo | undefined;

    if (pkg.type === 'design-system' || pkg.type === 'hybrid') {
      designSystem = await this.extractDesignSystemInfo(pkg, results);
    }

    if (pkg.type === 'utility' || pkg.type === 'hybrid') {
      utilityLibrary = await this.extractUtilityLibraryInfo(pkg, results);
    }

    // 분석 결과 저장
    await this.manager.markAsAnalyzed(packageId, designSystem, utilityLibrary);

    console.log(`\n✅ Analysis completed for ${packageId}`);
    if (designSystem) {
      console.log(`   🎨 Components found: ${Object.keys(designSystem.components).length}`);
    }
    if (utilityLibrary) {
      console.log(`   🔧 Functions found: ${Object.keys(utilityLibrary.functions).length}`);
    }
  }

  /**
   * 소스 파일 스캔
   */
  private async scanSourceFiles(sourcePath: string): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    async function scan(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          // node_modules, dist, .git 제외
          if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
            continue;
          }

          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            // .vue, .ts, .tsx 파일만
            if (entry.name.endsWith('.vue') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
              const content = await fs.readFile(fullPath, 'utf-8');
              files.push({ path: fullPath, content });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${dir}:`, error);
      }
    }

    await scan(sourcePath);
    return files;
  }

  /**
   * 디자인 시스템 정보 추출
   */
  private async extractDesignSystemInfo(
    pkg: LocalPackage,
    results: any[]
  ): Promise<LocalDesignSystemInfo> {
    const components: Record<string, LocalComponentInfo> = {};
    const componentPatterns: string[] = [];

    // 컴포넌트 추출
    for (const result of results) {
      if (result.category === 'component' || result.filePath.includes('/components/')) {
        const fileName = result.filePath.split(/[\\/]/).pop()?.replace(/\.(vue|tsx?)$/, '');
        if (!fileName) continue;

        // 컴포넌트 카테고리 추론
        const category = this.inferComponentCategory(fileName);

        components[fileName] = {
          name: fileName,
          description: result.features?.join(', '),
          props: result.props || [],
          usage: `<${fileName} />`,
          filePath: result.filePath,
          category
        };

        // 패턴 생성 (예: CommonTable -> /Common[A-Z]\w+/g)
        const prefix = this.extractComponentPrefix(fileName);
        if (prefix && !componentPatterns.includes(`/${prefix}[A-Z]\\w+/g`)) {
          componentPatterns.push(`/${prefix}[A-Z]\\w+/g`);
        }
      }
    }

    // 패키지명 기반 패턴 추가
    if (pkg.packageName) {
      componentPatterns.push(`/from ['"]${pkg.packageName.replace('/', '\\/')}['"]/g`);
    }

    return {
      componentPatterns: componentPatterns.length > 0 ? componentPatterns : ['/Component/g'],
      components,
      docsUrl: pkg.description
    };
  }

  /**
   * 유틸리티 라이브러리 정보 추출
   */
  private async extractUtilityLibraryInfo(
    pkg: LocalPackage,
    results: any[]
  ): Promise<LocalUtilityLibraryInfo> {
    const functions: Record<string, LocalFunctionInfo> = {};
    const functionPatterns: string[] = [];

    // 함수/composables 추출
    for (const result of results) {
      if (result.category === 'composable' || result.category === 'utility') {
        const fileName = result.filePath.split(/[\\/]/).pop()?.replace(/\.(ts|js)$/, '');
        if (!fileName) continue;

        // Composable 이름 추출 (use로 시작하는 경우)
        if (fileName.startsWith('use')) {
          const category = this.inferFunctionCategory(fileName, result);

          functions[fileName] = {
            name: fileName,
            category,
            description: result.features?.join(', ') || result.patterns?.join(', '),
            usage: `const result = ${fileName}()`,
            params: [],
            filePath: result.filePath
          };

          // 패턴 생성
          if (!functionPatterns.includes('/use[A-Z]\\w+/g')) {
            functionPatterns.push('/use[A-Z]\\w+/g');
          }
        }

        // 일반 함수 추출
        if (result.apiMethods && result.apiMethods.length > 0) {
          for (const method of result.apiMethods) {
            const category = this.inferFunctionCategory(method, result);

            functions[method] = {
              name: method,
              category,
              description: result.patterns?.join(', '),
              usage: `${method}()`,
              params: [],
              filePath: result.filePath
            };
          }
        }
      }
    }

    // 패키지명 기반 패턴 추가
    if (pkg.packageName) {
      functionPatterns.push(`/from ['"]${pkg.packageName.replace('/', '\\/')}['"]/g`);
    }

    return {
      functionPatterns: functionPatterns.length > 0 ? functionPatterns : ['/function/g'],
      functions,
      docsUrl: pkg.description
    };
  }

  /**
   * 컴포넌트 카테고리 추론
   */
  private inferComponentCategory(componentName: string): string {
    const name = componentName.toLowerCase();

    if (name.includes('table') || name.includes('grid') || name.includes('list')) return 'table';
    if (name.includes('button') || name.includes('btn')) return 'button';
    if (name.includes('input') || name.includes('field') || name.includes('text')) return 'input';
    if (name.includes('modal') || name.includes('dialog')) return 'modal';
    if (name.includes('layout') || name.includes('container')) return 'layout';
    if (name.includes('select') || name.includes('dropdown')) return 'select';
    if (name.includes('card')) return 'card';
    if (name.includes('form')) return 'form';

    return 'other';
  }

  /**
   * 함수 카테고리 추론
   */
  private inferFunctionCategory(functionName: string, metadata: any): string {
    const name = functionName.toLowerCase();

    // Composable 카테고리
    if (name.includes('state') || name.includes('storage') || name.includes('store')) return 'state';
    if (name.includes('mouse') || name.includes('keyboard') || name.includes('click')) return 'event';
    if (name.includes('fetch') || name.includes('api') || name.includes('request')) return 'api';
    if (name.includes('validate') || name.includes('validation')) return 'validation';
    if (name.includes('form')) return 'form';
    if (name.includes('alert') || name.includes('toast') || name.includes('notification')) return 'ui';
    if (name.includes('loading')) return 'ui';
    if (name.includes('format') || name.includes('parse')) return 'utility';

    // 메타데이터 기반 추론
    if (metadata.patterns) {
      if (metadata.patterns.includes('state-machine')) return 'state';
      if (metadata.patterns.includes('validation')) return 'validation';
      if (metadata.patterns.includes('api')) return 'api';
    }

    return 'utility';
  }

  /**
   * 컴포넌트 접두사 추출 (Common, El, V 등)
   */
  private extractComponentPrefix(componentName: string): string | null {
    // CommonTable -> Common
    const match = componentName.match(/^([A-Z][a-z]+)([A-Z])/);
    if (match) {
      return match[1];
    }

    // ElButton -> El
    const singleMatch = componentName.match(/^([A-Z][a-z]?)([A-Z])/);
    if (singleMatch) {
      return singleMatch[1];
    }

    return null;
  }

  /**
   * 모든 미분석 패키지 분석
   */
  async analyzeAllUnanalyzed(): Promise<void> {
    const packages = await this.manager.getAllPackages();
    const unanalyzed = packages.filter(p => !p.analyzed);

    console.log(`\n📦 Found ${unanalyzed.length} unanalyzed packages`);

    for (const pkg of unanalyzed) {
      try {
        await this.analyzePackage(pkg.id);
      } catch (error) {
        console.error(`❌ Failed to analyze ${pkg.id}:`, error);
      }
    }
  }
}

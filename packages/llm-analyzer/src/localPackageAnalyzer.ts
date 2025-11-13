/**
 * AI 기반 로컬 패키지 분석기
 *
 * 로컬 디자인 시스템/유틸리티 라이브러리의 소스 코드를
 * AI로 분석하여 컴포넌트와 함수를 자동 추출
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
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
    console.log(`🔗 Source type: ${pkg.sourceType}`);

    // 소스 경로 확인
    const sourcePath = await this.resolveSourcePath(pkg);
    console.log(`📂 Source path: ${sourcePath}`);

    let tempDir: string | null = null;

    try {
      // 소스 파일 스캔
      const files = await this.scanSourceFiles(sourcePath);
      console.log(`📄 Found ${files.length} files`);

      if (files.length === 0) {
        console.warn(`⚠️  No files found in ${sourcePath}`);
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
    } finally {
      // git clone한 임시 디렉토리 정리
      if (pkg.sourceType === 'git' && sourcePath.includes(tmpdir())) {
        await this.cleanupTempDirectory(sourcePath);
      }
    }
  }

  /**
   * 소스 경로 확인 (sourceType에 따라 다르게 처리)
   */
  private async resolveSourcePath(pkg: LocalPackage): Promise<string> {
    switch (pkg.sourceType) {
      case 'local':
        if (!pkg.sourcePath) {
          throw new Error(`Local package ${pkg.id} must have sourcePath`);
        }
        return pkg.sourcePath;

      case 'git':
        return await this.cloneGitRepository(pkg);

      case 'node_modules':
        return await this.findInNodeModules(pkg);

      default:
        throw new Error(`Unknown sourceType: ${pkg.sourceType}`);
    }
  }

  /**
   * Git 저장소 클론
   */
  private async cloneGitRepository(pkg: LocalPackage): Promise<string> {
    if (!pkg.gitUrl) {
      throw new Error(`Git package ${pkg.id} must have gitUrl`);
    }

    console.log(`📥 Cloning git repository: ${pkg.gitUrl}`);

    // 임시 디렉토리 생성
    const tempDir = join(tmpdir(), `mcp-local-packages-${pkg.id}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // git URL 파싱 (git+https://... 형식)
      let gitUrl = pkg.gitUrl;
      if (gitUrl.startsWith('git+')) {
        gitUrl = gitUrl.substring(4);
      }

      // URL에서 #commit= 파라미터 제거
      const [repoUrl, params] = gitUrl.split('#');

      // git clone 실행
      console.log(`   Cloning ${repoUrl}...`);
      execSync(`git clone "${repoUrl}" "${tempDir}"`, { stdio: 'inherit' });

      // 특정 커밋/브랜치 체크아웃
      if (pkg.gitCommit || params) {
        const commit = pkg.gitCommit || params.replace('commit=', '');
        console.log(`   Checking out commit: ${commit}`);
        execSync(`git checkout ${commit}`, { cwd: tempDir, stdio: 'inherit' });
      } else if (pkg.gitBranch) {
        console.log(`   Checking out branch: ${pkg.gitBranch}`);
        execSync(`git checkout ${pkg.gitBranch}`, { cwd: tempDir, stdio: 'inherit' });
      }

      // 소스 디렉토리 경로 (src, lib, components 등)
      const possiblePaths = ['src', 'lib', 'components', '.'];
      for (const subPath of possiblePaths) {
        const fullPath = join(tempDir, subPath);
        try {
          await fs.access(fullPath);
          console.log(`   ✅ Found source directory: ${subPath}`);
          return fullPath;
        } catch {
          // 디렉토리가 없으면 다음 시도
        }
      }

      return tempDir;
    } catch (error) {
      // 에러 발생 시 임시 디렉토리 정리
      await this.cleanupTempDirectory(tempDir);
      throw error;
    }
  }

  /**
   * node_modules에서 패키지 찾기
   */
  private async findInNodeModules(pkg: LocalPackage): Promise<string> {
    console.log(`📦 Looking for ${pkg.packageName} in node_modules`);

    // 현재 프로젝트의 node_modules 경로
    const cwd = process.cwd();
    const nodeModulesPath = join(cwd, 'node_modules', pkg.packageName);

    try {
      await fs.access(nodeModulesPath);
      console.log(`   ✅ Found in ${nodeModulesPath}`);

      // 소스 디렉토리 경로
      const possiblePaths = ['src', 'lib', 'dist', 'components', '.'];
      for (const subPath of possiblePaths) {
        const fullPath = join(nodeModulesPath, subPath);
        try {
          await fs.access(fullPath);
          console.log(`   ✅ Found source directory: ${subPath}`);
          return fullPath;
        } catch {
          // 디렉토리가 없으면 다음 시도
        }
      }

      return nodeModulesPath;
    } catch (error) {
      throw new Error(`Package ${pkg.packageName} not found in node_modules. Please run 'npm install' or 'yarn install' first.`);
    }
  }

  /**
   * 임시 디렉토리 정리
   */
  private async cleanupTempDirectory(dirPath: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up temporary directory: ${dirPath}`);
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Warning: Failed to cleanup ${dirPath}:`, error);
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

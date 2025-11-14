/**
 * 로컬 패키지 관리자
 *
 * 조직 내부 디자인 시스템/유틸리티 라이브러리를
 * 로컬에서 등록하고 AI가 분석하여 활용
 */

import { promises as fs } from 'fs';
import type {
  LocalPackage,
  LocalPackagesConfig,
  LocalDesignSystemInfo,
  LocalUtilityLibraryInfo,
  LocalComponentInfo,
  LocalFunctionInfo
} from './localPackageTypes.js';

export class LocalPackageManager {
  private configPath: string;
  private config: LocalPackagesConfig | null = null;

  constructor(configPath: string = '.mcp/local-packages.json') {
    this.configPath = configPath;
  }

  /**
   * 설정 파일 로드
   */
  async load(): Promise<LocalPackagesConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      return this.config!;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 파일이 없으면 기본 설정 생성
        this.config = {
          version: '1.0.0',
          localPackages: []
        };
        return this.config;
      }
      throw error;
    }
  }

  /**
   * 설정 파일 저장
   */
  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('Config not loaded. Call load() first.');
    }

    // 디렉토리 생성
    const dir = this.configPath.split('/').slice(0, -1).join('/');
    await fs.mkdir(dir, { recursive: true });

    // JSON 저장
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  /**
   * 로컬 패키지 추가
   */
  async addPackage(packageInfo: Omit<LocalPackage, 'analyzed' | 'analyzedAt'>): Promise<void> {
    if (!this.config) await this.load();

    const newPackage: LocalPackage = {
      ...packageInfo,
      analyzed: false
    };

    // 중복 체크
    const existingIndex = this.config!.localPackages.findIndex(p => p.id === packageInfo.id);
    if (existingIndex >= 0) {
      this.config!.localPackages[existingIndex] = newPackage;
    } else {
      this.config!.localPackages.push(newPackage);
    }

    await this.save();
  }

  /**
   * 로컬 패키지 제거
   */
  async removePackage(packageId: string): Promise<void> {
    if (!this.config) await this.load();

    this.config!.localPackages = this.config!.localPackages.filter(p => p.id !== packageId);
    await this.save();
  }

  /**
   * 로컬 패키지 조회
   */
  async getPackage(packageId: string): Promise<LocalPackage | undefined> {
    if (!this.config) await this.load();

    return this.config!.localPackages.find(p => p.id === packageId);
  }

  /**
   * 모든 로컬 패키지 조회
   */
  async getAllPackages(): Promise<LocalPackage[]> {
    if (!this.config) await this.load();

    return this.config!.localPackages;
  }

  /**
   * 타입별 로컬 패키지 조회
   */
  async getPackagesByType(type: 'design-system' | 'utility' | 'hybrid'): Promise<LocalPackage[]> {
    if (!this.config) await this.load();

    return this.config!.localPackages.filter(p => p.type === type);
  }

  /**
   * 디자인 시스템 패키지 목록
   */
  async getDesignSystemPackages(): Promise<LocalPackage[]> {
    if (!this.config) await this.load();

    return this.config!.localPackages.filter(p => p.type === 'design-system' || p.type === 'hybrid');
  }

  /**
   * 유틸리티 라이브러리 패키지 목록
   */
  async getUtilityLibraryPackages(): Promise<LocalPackage[]> {
    if (!this.config) await this.load();

    return this.config!.localPackages.filter(p => p.type === 'utility' || p.type === 'hybrid');
  }

  /**
   * 분석 완료 표시
   */
  async markAsAnalyzed(
    packageId: string,
    designSystem?: LocalDesignSystemInfo,
    utilityLibrary?: LocalUtilityLibraryInfo
  ): Promise<void> {
    if (!this.config) await this.load();

    const pkg = this.config!.localPackages.find(p => p.id === packageId);
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }

    pkg.analyzed = true;
    pkg.analyzedAt = new Date().toISOString();

    if (designSystem) {
      pkg.designSystem = designSystem;
    }

    if (utilityLibrary) {
      pkg.utilityLibrary = utilityLibrary;
    }

    await this.save();
  }

  /**
   * 로컬 패키지 ID 목록 (환경 변수 형식)
   */
  async getPackageIds(): Promise<string[]> {
    if (!this.config) await this.load();

    return this.config!.localPackages.map(p => p.id);
  }

  /**
   * 디자인 시스템 감지 패턴 맵핑
   */
  async getDesignSystemPatterns(): Promise<Record<string, RegExp[]>> {
    const packages = await this.getDesignSystemPackages();
    const patterns: Record<string, RegExp[]> = {};

    for (const pkg of packages) {
      if (pkg.designSystem) {
        patterns[pkg.id] = pkg.designSystem.componentPatterns.map(p => new RegExp(p, 'g'));
      }
    }

    return patterns;
  }

  /**
   * 유틸리티 라이브러리 감지 패턴 맵핑
   */
  async getUtilityLibraryPatterns(): Promise<Record<string, RegExp[]>> {
    const packages = await this.getUtilityLibraryPackages();
    const patterns: Record<string, RegExp[]> = {};

    for (const pkg of packages) {
      if (pkg.utilityLibrary) {
        patterns[pkg.id] = pkg.utilityLibrary.functionPatterns.map(p => new RegExp(p, 'g'));
      }
    }

    return patterns;
  }
}

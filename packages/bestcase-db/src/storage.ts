import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { BestCaseScores } from './types.js';
import { BestCaseIndex, buildIndex, searchIndex, IndexSearchQuery } from './indexer.js';

/**
 * BestCase 인터페이스
 *
 * 우수 코드 사례를 저장하고 관리합니다.
 * 다차원 점수 시스템으로 각 영역별 우수성을 평가합니다.
 */
export interface BestCase {
  id: string;
  projectName: string;
  category: string;
  description: string;
  files: Array<{
    path: string;
    content: string;
    purpose: string;
  }>;

  /**
   * 다차원 품질 점수 (v2.0+)
   *
   * 8가지 항목별 점수 (0-100):
   * - structure: 구조
   * - apiConnection: API 연결
   * - designSystem: 디자인 시스템
   * - utilityUsage: 유틸리티
   * - errorHandling: 에러 핸들링
   * - typeUsage: 타입 활용
   * - stateManagement: 상태 관리
   * - performance: 성능
   */
  scores?: BestCaseScores;

  /**
   * 가중 평균 총점 (0-100)
   * scores가 있으면 자동 계산, 없으면 하위 호환용
   */
  totalScore?: number;

  /**
   * 우수 영역 (80점 이상)
   * 예: ["structure", "apiConnection"]
   */
  excellentIn?: Array<keyof BestCaseScores>;

  /**
   * 점수 계산 로직 버전
   * 이 버전이 다르면 재분석이 필요합니다.
   * 예: "2.0.0"
   */
  scoringVersion?: string;

  /**
   * 패턴 및 메타데이터
   *
   * ✅ 메타데이터 기반 BestCase (권장):
   * {
   *   metadata: ProjectMetadata | FileMetadata,  // MetadataAnalyzer 결과
   *   excellentReasons: string[]
   * }
   *
   * ⚠️ 기존 점수 기반 (하위 호환성):
   * {
   *   apiInfo: { ... },
   *   componentUsage: { ... },
   *   score: number
   * }
   */
  patterns: {
    metadata?: any;  // ProjectMetadata | FileMetadata (from llm-analyzer)
    excellentReasons?: string[];
    [key: string]: any;  // 하위 호환성 유지
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
  };
}

export class BestCaseStorage {
  private storagePath: string;
  private indexPath: string;

  constructor(storagePath?: string) {
    // 환경 변수 또는 기본값 사용 (Docker: /projects/.bestcases, Local: D:/01.Work/01.Projects/.bestcases)
    this.storagePath = storagePath || process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';
    this.indexPath = join(this.storagePath, 'index.json');
  }

  async initialize() {
    await fs.mkdir(this.storagePath, { recursive: true });
  }

  async save(bestCase: BestCase): Promise<void> {
    await this.initialize();
    const filePath = join(this.storagePath, `${bestCase.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(bestCase, null, 2), 'utf-8');

    // 인덱스 자동 업데이트
    await this.updateIndex();
  }

  async load(id: string): Promise<BestCase | null> {
    try {
      const filePath = join(this.storagePath, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async search(query: { projectName?: string; category?: string; tags?: string[] }): Promise<BestCase[]> {
    await this.initialize();
    
    console.error('[BestCaseStorage] Search query:', JSON.stringify(query, null, 2));
    console.error('[BestCaseStorage] Storage path:', this.storagePath);
    
    let files: string[] = [];
    try {
      files = await fs.readdir(this.storagePath);
      console.error('[BestCaseStorage] Files in storage:', files.length);
    } catch (error: any) {
      console.error('[BestCaseStorage] Failed to read directory:', error.message);
      return [];
    }
    
    const results: BestCase[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const content = await fs.readFile(join(this.storagePath, file), 'utf-8');
        const bestCase: BestCase = JSON.parse(content);
        
        console.error('[BestCaseStorage] Checking file:', file, {
          projectName: bestCase.projectName,
          category: bestCase.category,
        });

        let matches = true;
        if (query.projectName && bestCase.projectName !== query.projectName) {
          console.error('[BestCaseStorage] Project name mismatch:', {
            query: query.projectName,
            actual: bestCase.projectName,
          });
          matches = false;
        }
        if (query.category && bestCase.category !== query.category) {
          console.error('[BestCaseStorage] Category mismatch:', {
            query: query.category,
            actual: bestCase.category,
          });
          matches = false;
        }
        if (query.tags && !query.tags.some(tag => bestCase.metadata.tags.includes(tag))) {
          matches = false;
        }

        if (matches) {
          console.error('[BestCaseStorage] Match found:', file);
          results.push(bestCase);
        }
      } catch (error: any) {
        console.error('[BestCaseStorage] Failed to read/parse file:', file, error.message);
      }
    }
    
    console.error('[BestCaseStorage] Total matches:', results.length);
    return results;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = join(this.storagePath, `${id}.json`);
      await fs.unlink(filePath);

      // 인덱스 자동 업데이트
      await this.updateIndex();
      return true;
    } catch (error) {
      return false;
    }
  }

  async list(): Promise<BestCase[]> {
    await this.initialize();
    const files = await fs.readdir(this.storagePath);
    const results: BestCase[] = [];

    for (const file of files) {
      if (!file.endsWith('.json') || file === 'index.json') continue;
      const content = await fs.readFile(join(this.storagePath, file), 'utf-8');
      results.push(JSON.parse(content));
    }

    return results;
  }

  /**
   * 인덱스 로드
   */
  async loadIndex(): Promise<BestCaseIndex | null> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * 인덱스 저장
   */
  async saveIndex(index: BestCaseIndex): Promise<void> {
    await this.initialize();
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 인덱스 재구축
   */
  async rebuildIndex(): Promise<BestCaseIndex> {
    const allCases = await this.list();
    const index = buildIndex(allCases);
    await this.saveIndex(index);
    return index;
  }

  /**
   * 인덱스 자동 업데이트 (save/delete 시 호출)
   */
  private async updateIndex(): Promise<void> {
    try {
      await this.rebuildIndex();
    } catch (error) {
      console.error('[BestCaseStorage] Failed to update index:', error);
    }
  }

  /**
   * 인덱스 기반 고급 검색 (빠른 검색)
   *
   * 예시:
   * - 구조가 우수한 케이스: searchByIndex({ excellentIn: ['structure'] })
   * - 특정 프로젝트의 API 연결이 우수한 케이스: searchByIndex({ projectName: 'my-project', excellentIn: ['apiConnection'] })
   * - 85점 이상의 우수 케이스: searchByIndex({ minTotalScore: 85 })
   * - Vue3 태그가 있는 케이스: searchByIndex({ tags: ['vue3'] })
   */
  async searchByIndex(query: IndexSearchQuery): Promise<BestCase[]> {
    // 인덱스 로드 (없으면 재구축)
    let index = await this.loadIndex();
    if (!index) {
      console.error('[BestCaseStorage] Index not found, rebuilding...');
      index = await this.rebuildIndex();
    }

    // 인덱스 기반 검색으로 ID 목록 획득
    const matchingIds = searchIndex(index, query);

    // ID로 BestCase 로드
    const results: BestCase[] = [];
    for (const id of matchingIds) {
      const bestCase = await this.load(id);
      if (bestCase) {
        results.push(bestCase);
      }
    }

    return results;
  }

  /**
   * 특정 카테고리에서 우수한 케이스 검색
   *
   * 예: findExcellentInCategory('structure')
   */
  async findExcellentInCategory(category: keyof BestCaseScores): Promise<BestCase[]> {
    return this.searchByIndex({ excellentIn: [category] });
  }

  /**
   * 여러 카테고리 중 하나라도 우수한 케이스 검색 (OR 조건)
   *
   * 예: findExcellentInAnyCategory(['structure', 'apiConnection'])
   */
  async findExcellentInAnyCategory(categories: Array<keyof BestCaseScores>): Promise<BestCase[]> {
    return this.searchByIndex({ excellentIn: categories });
  }

  /**
   * 점수대별 케이스 검색
   *
   * 예: findByScoreGrade('excellent')
   */
  async findByScoreGrade(grade: 'excellent' | 'good' | 'fair' | 'poor'): Promise<BestCase[]> {
    return this.searchByIndex({ scoreGrade: grade });
  }

  /**
   * 최소 점수 이상의 케이스 검색
   *
   * 예: findByMinScore(80)
   */
  async findByMinScore(minScore: number): Promise<BestCase[]> {
    return this.searchByIndex({ minTotalScore: minScore });
  }
}
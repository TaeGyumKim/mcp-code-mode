import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { BestCaseScores } from './types.js';

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

  constructor(storagePath?: string) {
    // 환경 변수 또는 기본값 사용 (Docker: /projects/.bestcases, Local: D:/01.Work/01.Projects/.bestcases)
    this.storagePath = storagePath || process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';
  }

  async initialize() {
    await fs.mkdir(this.storagePath, { recursive: true });
  }

  async save(bestCase: BestCase): Promise<void> {
    await this.initialize();
    const filePath = join(this.storagePath, `${bestCase.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(bestCase, null, 2), 'utf-8');
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
      if (!file.endsWith('.json')) continue;
      const content = await fs.readFile(join(this.storagePath, file), 'utf-8');
      results.push(JSON.parse(content));
    }

    return results;
  }
}
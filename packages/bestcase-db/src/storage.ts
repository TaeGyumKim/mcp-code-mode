import { promises as fs } from 'fs';
import { join, dirname } from 'path';

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
  patterns: {
    [key: string]: any;
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
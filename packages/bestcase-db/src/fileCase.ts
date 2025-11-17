/**
 * 파일 단위 BestCase 저장 시스템 (v3.0)
 *
 * 프로젝트 단위가 아닌 파일 단위로 모든 코드를 저장합니다.
 * 점수와 상관없이 모든 파일을 저장하며, 키워드 기반으로 검색할 수 있습니다.
 */

import { promises as fs } from 'fs';
import { join, basename, extname } from 'path';
import { BestCaseScores } from './types.js';

/**
 * 파일 기반 BestCase (v3.0)
 *
 * 각 파일별로 메타데이터와 점수를 저장합니다.
 * 가중치 없이 각 항목별 점수만 저장하며, 키워드로 검색 가능합니다.
 */
export interface FileCase {
  id: string;
  projectName: string;

  /**
   * 파일 경로 (프로젝트 루트 기준)
   * 예: "pages/users/index.vue", "composables/useSearch.ts"
   */
  filePath: string;

  /**
   * 파일 타입
   * 예: "vue", "ts", "tsx", "js"
   */
  fileType: string;

  /**
   * 파일 역할/목적
   * 예: "page", "component", "composable", "store", "api", "util"
   */
  fileRole: string;

  /**
   * 파일 내용
   */
  content: string;

  /**
   * 검색 키워드
   * 예: ["search", "list", "pagination", "grpc", "crud"]
   *
   * 페이지/컴포넌트의 주요 기능:
   * - search: 검색 기능
   * - list: 목록 조회
   * - detail: 상세 조회
   * - create: 생성/등록
   * - update: 수정
   * - delete: 삭제
   * - pagination: 페이지네이션
   * - filter: 필터링
   * - sort: 정렬
   * - export: 내보내기
   * - import: 가져오기
   * - upload: 파일 업로드
   * - download: 파일 다운로드
   * - auth: 인증/권한
   * - form: 폼 처리
   * - modal: 모달/팝업
   * - table: 테이블
   * - chart: 차트/그래프
   * - map: 지도
   */
  keywords: string[];

  /**
   * 개별 항목 점수 (0-100, 가중치 없음)
   *
   * 총점을 계산하지 않고, 각 항목별 점수만 기록합니다.
   * 검색 시 필요한 항목의 점수를 기준으로 필터링합니다.
   */
  scores: BestCaseScores;

  /**
   * 점수 계산 로직 버전
   */
  scoringVersion: string;

  /**
   * 추가 메타데이터
   */
  analysis: {
    /**
     * 코드 복잡도 (lines of code)
     */
    linesOfCode: number;

    /**
     * 사용된 API 메서드
     * 예: ["grpc.UserService.list", "grpc.UserService.get"]
     */
    apiMethods: string[];

    /**
     * 사용된 컴포넌트
     * 예: ["ElTable", "ElButton", "ElDialog"]
     */
    componentsUsed: string[];

    /**
     * 사용된 composables
     * 예: ["useSearch", "usePagination", "useGrpc"]
     */
    composablesUsed: string[];

    /**
     * 주요 패턴
     * 예: ["error-boundary", "loading-state", "optimistic-update"]
     */
    patterns: string[];

    /**
     * 엔티티/모델명
     * 예: ["User", "Product", "Order"]
     */
    entities: string[];
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    analyzedAt: string;
    tags: string[];
  };

  /**
   * RAG용 임베딩 벡터 (선택적)
   *
   * 의미적 유사도 검색을 위한 벡터 표현
   * Ollama 임베딩 모델로 생성됨
   */
  embedding?: number[];
}

/**
 * 파일 검색 쿼리
 */
export interface FileCaseQuery {
  /**
   * 프로젝트명 필터
   */
  projectName?: string;

  /**
   * 파일 타입 필터 (vue, ts, tsx, js)
   */
  fileType?: string;

  /**
   * 파일 역할 필터 (page, component, composable, store, api, util)
   */
  fileRole?: string;

  /**
   * 키워드 검색 (OR 조건)
   * 예: ["search", "list"] → 검색 또는 목록 기능이 있는 파일
   */
  keywords?: string[];

  /**
   * 모든 키워드 포함 (AND 조건)
   * 예: ["search", "pagination"] → 검색과 페이지네이션 둘 다 있는 파일
   */
  keywordsAll?: string[];

  /**
   * 특정 항목 최소 점수
   * 예: { apiConnection: 60 } → API 연결 점수가 60 이상인 파일
   */
  minScores?: Partial<BestCaseScores>;

  /**
   * 특정 엔티티 포함
   * 예: ["User", "Product"]
   */
  entities?: string[];

  /**
   * 특정 컴포넌트 사용
   * 예: ["ElTable", "ElDialog"]
   */
  componentsUsed?: string[];

  /**
   * 특정 API 메서드 사용
   * 예: ["grpc.UserService"]
   */
  apiMethods?: string[];

  /**
   * 최대 결과 수
   */
  limit?: number;
}

/**
 * 파일 기반 BestCase 저장소
 */
export class FileCaseStorage {
  private storagePath: string;
  private indexPath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';
    this.indexPath = join(this.storagePath, 'file-index.json');
  }

  async initialize() {
    await fs.mkdir(this.storagePath, { recursive: true });
  }

  /**
   * 파일 저장 (점수와 상관없이 모든 파일 저장)
   */
  async save(fileCase: FileCase): Promise<void> {
    await this.initialize();
    const filePath = join(this.storagePath, `${fileCase.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(fileCase, null, 2), 'utf-8');
    await this.updateIndex();
  }

  /**
   * 파일 로드
   */
  async load(id: string): Promise<FileCase | null> {
    try {
      const filePath = join(this.storagePath, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * 파일 삭제
   */
  async delete(id: string): Promise<boolean> {
    try {
      const filePath = join(this.storagePath, `${id}.json`);
      await fs.unlink(filePath);
      await this.updateIndex();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 모든 파일 목록
   */
  async list(): Promise<FileCase[]> {
    await this.initialize();
    const files = await fs.readdir(this.storagePath);
    const results: FileCase[] = [];

    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('index')) continue;
      try {
        const content = await fs.readFile(join(this.storagePath, file), 'utf-8');
        const parsed = JSON.parse(content);
        // FileCase인지 확인 (filePath 필드가 있으면 FileCase)
        if (parsed.filePath && parsed.scores) {
          results.push(parsed);
        }
      } catch (error) {
        // Skip invalid files
      }
    }

    return results;
  }

  /**
   * 키워드 기반 검색
   *
   * 점수와 상관없이 키워드가 일치하는 파일을 검색합니다.
   * 필요 시 특정 항목의 최소 점수를 지정할 수 있습니다.
   */
  async search(query: FileCaseQuery): Promise<FileCase[]> {
    const allCases = await this.list();
    let results = allCases;

    // 프로젝트명 필터
    if (query.projectName) {
      results = results.filter(fc => fc.projectName === query.projectName);
    }

    // 파일 타입 필터
    if (query.fileType) {
      results = results.filter(fc => fc.fileType === query.fileType);
    }

    // 파일 역할 필터
    if (query.fileRole) {
      results = results.filter(fc => fc.fileRole === query.fileRole);
    }

    // 키워드 검색 (OR)
    if (query.keywords && query.keywords.length > 0) {
      results = results.filter(fc =>
        query.keywords!.some(kw =>
          fc.keywords.some(fkw => fkw.toLowerCase().includes(kw.toLowerCase()))
        )
      );
    }

    // 키워드 검색 (AND)
    if (query.keywordsAll && query.keywordsAll.length > 0) {
      results = results.filter(fc =>
        query.keywordsAll!.every(kw =>
          fc.keywords.some(fkw => fkw.toLowerCase().includes(kw.toLowerCase()))
        )
      );
    }

    // 최소 점수 필터
    if (query.minScores) {
      for (const [category, minScore] of Object.entries(query.minScores)) {
        if (minScore !== undefined) {
          results = results.filter(fc =>
            fc.scores[category as keyof BestCaseScores] >= minScore
          );
        }
      }
    }

    // 엔티티 필터
    if (query.entities && query.entities.length > 0) {
      results = results.filter(fc =>
        query.entities!.some(entity =>
          fc.analysis.entities.some(e => e.toLowerCase().includes(entity.toLowerCase()))
        )
      );
    }

    // 컴포넌트 필터
    if (query.componentsUsed && query.componentsUsed.length > 0) {
      results = results.filter(fc =>
        query.componentsUsed!.some(comp =>
          fc.analysis.componentsUsed.some(c => c.toLowerCase().includes(comp.toLowerCase()))
        )
      );
    }

    // API 메서드 필터
    if (query.apiMethods && query.apiMethods.length > 0) {
      results = results.filter(fc =>
        query.apiMethods!.some(method =>
          fc.analysis.apiMethods.some(m => m.toLowerCase().includes(method.toLowerCase()))
        )
      );
    }

    // 결과 수 제한
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * 특정 키워드로 파일 검색 (점수 무관)
   *
   * 예: findByKeywords(["search", "list"]) → 검색이나 목록 기능이 있는 모든 파일
   */
  async findByKeywords(keywords: string[]): Promise<FileCase[]> {
    return this.search({ keywords });
  }

  /**
   * 특정 기능을 가진 파일 검색
   *
   * 예: findByFunction("search") → 검색 기능이 있는 파일
   */
  async findByFunction(func: string): Promise<FileCase[]> {
    return this.search({ keywords: [func] });
  }

  /**
   * 특정 항목에서 최소 점수를 가진 파일 검색
   *
   * 예: findByMinScore("apiConnection", 40) → API 연결 점수가 40 이상인 파일
   */
  async findByMinScore(category: keyof BestCaseScores, minScore: number): Promise<FileCase[]> {
    return this.search({ minScores: { [category]: minScore } });
  }

  /**
   * 프로젝트의 특정 역할 파일 검색
   *
   * 예: findByRole("project-a", "page") → project-a의 모든 페이지 파일
   */
  async findByRole(projectName: string, role: string): Promise<FileCase[]> {
    return this.search({ projectName, fileRole: role });
  }

  /**
   * 특정 엔티티를 다루는 파일 검색
   *
   * 예: findByEntity("User") → User 엔티티를 사용하는 모든 파일
   */
  async findByEntity(entity: string): Promise<FileCase[]> {
    return this.search({ entities: [entity] });
  }

  /**
   * 인덱스 업데이트
   */
  private async updateIndex(): Promise<void> {
    try {
      const allCases = await this.list();
      const index = this.buildFileCaseIndex(allCases);
      await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
    } catch (error) {
      console.error('[FileCaseStorage] Failed to update index:', error);
    }
  }

  /**
   * 파일 인덱스 구축
   */
  private buildFileCaseIndex(cases: FileCase[]) {
    const index: {
      version: string;
      indexedAt: string;
      totalFiles: number;
      byProject: Record<string, string[]>;
      byKeyword: Record<string, string[]>;
      byFileType: Record<string, string[]>;
      byFileRole: Record<string, string[]>;
      byEntity: Record<string, string[]>;
    } = {
      version: '3.0.0',
      indexedAt: new Date().toISOString(),
      totalFiles: cases.length,
      byProject: {},
      byKeyword: {},
      byFileType: {},
      byFileRole: {},
      byEntity: {}
    };

    for (const fc of cases) {
      // 프로젝트별
      if (!index.byProject[fc.projectName]) {
        index.byProject[fc.projectName] = [];
      }
      index.byProject[fc.projectName].push(fc.id);

      // 키워드별
      for (const kw of fc.keywords) {
        if (!index.byKeyword[kw]) {
          index.byKeyword[kw] = [];
        }
        index.byKeyword[kw].push(fc.id);
      }

      // 파일 타입별
      if (!index.byFileType[fc.fileType]) {
        index.byFileType[fc.fileType] = [];
      }
      index.byFileType[fc.fileType].push(fc.id);

      // 파일 역할별
      if (!index.byFileRole[fc.fileRole]) {
        index.byFileRole[fc.fileRole] = [];
      }
      index.byFileRole[fc.fileRole].push(fc.id);

      // 엔티티별
      for (const entity of fc.analysis.entities) {
        if (!index.byEntity[entity]) {
          index.byEntity[entity] = [];
        }
        index.byEntity[entity].push(fc.id);
      }
    }

    return index;
  }
}

/**
 * 파일 경로를 ID로 변환
 */
export function filePathToId(projectName: string, filePath: string): string {
  const sanitizedProject = projectName.replace(/[\/\\]/g, '-');
  const sanitizedPath = filePath.replace(/[\/\\]/g, '-').replace(/\./g, '-');
  const timestamp = Date.now();
  return `${sanitizedProject}-${sanitizedPath}-${timestamp}`;
}

/**
 * 파일 확장자로 파일 타입 추론
 */
export function inferFileType(filePath: string): string {
  const ext = extname(filePath).toLowerCase().replace('.', '');
  return ext || 'unknown';
}

/**
 * 파일 경로로 파일 역할 추론
 */
export function inferFileRole(filePath: string): string {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.includes('/pages/') || lowerPath.includes('\\pages\\')) {
    return 'page';
  }
  if (lowerPath.includes('/components/') || lowerPath.includes('\\components\\')) {
    return 'component';
  }
  if (lowerPath.includes('/composables/') || lowerPath.includes('\\composables\\')) {
    return 'composable';
  }
  if (lowerPath.includes('/stores/') || lowerPath.includes('\\stores\\')) {
    return 'store';
  }
  if (lowerPath.includes('/api/') || lowerPath.includes('\\api\\')) {
    return 'api';
  }
  if (lowerPath.includes('/utils/') || lowerPath.includes('\\utils\\') ||
      lowerPath.includes('/helpers/') || lowerPath.includes('\\helpers\\')) {
    return 'util';
  }
  if (lowerPath.includes('/layouts/') || lowerPath.includes('\\layouts\\')) {
    return 'layout';
  }
  if (lowerPath.includes('/middleware/') || lowerPath.includes('\\middleware\\')) {
    return 'middleware';
  }
  if (lowerPath.includes('/plugins/') || lowerPath.includes('\\plugins\\')) {
    return 'plugin';
  }

  return 'other';
}

/**
 * 코드에서 키워드 추출
 */
export function extractKeywords(content: string, filePath: string): string[] {
  const keywords: Set<string> = new Set();
  const lowerContent = content.toLowerCase();

  // CRUD 키워드
  if (lowerContent.includes('search') || lowerContent.includes('검색')) {
    keywords.add('search');
  }
  if (lowerContent.includes('list') || lowerContent.includes('목록') || lowerContent.includes('getall')) {
    keywords.add('list');
  }
  if (lowerContent.includes('detail') || lowerContent.includes('상세') || lowerContent.includes('getone') || lowerContent.includes('getbyid')) {
    keywords.add('detail');
  }
  if (lowerContent.includes('create') || lowerContent.includes('생성') || lowerContent.includes('등록') || lowerContent.includes('add')) {
    keywords.add('create');
  }
  if (lowerContent.includes('update') || lowerContent.includes('수정') || lowerContent.includes('edit')) {
    keywords.add('update');
  }
  if (lowerContent.includes('delete') || lowerContent.includes('삭제') || lowerContent.includes('remove')) {
    keywords.add('delete');
  }

  // UI 패턴 키워드
  if (lowerContent.includes('pagination') || lowerContent.includes('page-size') || lowerContent.includes('currentpage')) {
    keywords.add('pagination');
  }
  if (lowerContent.includes('filter') || lowerContent.includes('필터')) {
    keywords.add('filter');
  }
  if (lowerContent.includes('sort') || lowerContent.includes('정렬') || lowerContent.includes('orderby')) {
    keywords.add('sort');
  }
  if (lowerContent.includes('export') || lowerContent.includes('내보내기') || lowerContent.includes('download')) {
    keywords.add('export');
  }
  if (lowerContent.includes('import') || lowerContent.includes('가져오기') || lowerContent.includes('upload')) {
    keywords.add('import');
  }
  if (lowerContent.includes('modal') || lowerContent.includes('dialog') || lowerContent.includes('팝업')) {
    keywords.add('modal');
  }
  if (lowerContent.includes('form') || lowerContent.includes('submit') || lowerContent.includes('validate')) {
    keywords.add('form');
  }
  if (lowerContent.includes('table') || lowerContent.includes('grid') || lowerContent.includes('eltable')) {
    keywords.add('table');
  }
  if (lowerContent.includes('chart') || lowerContent.includes('graph') || lowerContent.includes('차트')) {
    keywords.add('chart');
  }
  if (lowerContent.includes('map') || lowerContent.includes('지도') || lowerContent.includes('location')) {
    keywords.add('map');
  }

  // API 키워드
  if (lowerContent.includes('grpc') || lowerContent.includes('usegrpc')) {
    keywords.add('grpc');
  }
  if (lowerContent.includes('rest') || lowerContent.includes('axios') || lowerContent.includes('fetch')) {
    keywords.add('rest');
  }
  if (lowerContent.includes('graphql')) {
    keywords.add('graphql');
  }

  // 인증/권한
  if (lowerContent.includes('auth') || lowerContent.includes('login') || lowerContent.includes('로그인') || lowerContent.includes('permission')) {
    keywords.add('auth');
  }

  // 파일 처리
  if (lowerContent.includes('fileupload') || lowerContent.includes('filedownload') || lowerContent.includes('파일')) {
    keywords.add('file');
  }

  // 상태 관리
  if (lowerContent.includes('pinia') || lowerContent.includes('vuex') || lowerContent.includes('store')) {
    keywords.add('state-management');
  }

  // 비동기 처리
  if (lowerContent.includes('async') || lowerContent.includes('await') || lowerContent.includes('promise')) {
    keywords.add('async');
  }

  // 에러 처리
  if (lowerContent.includes('try') && lowerContent.includes('catch')) {
    keywords.add('error-handling');
  }

  return Array.from(keywords);
}

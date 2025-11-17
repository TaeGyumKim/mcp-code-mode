/**
 * 파일 단위 BestCase 검색 (v3.0)
 *
 * 키워드 기반으로 파일을 검색합니다.
 * 점수와 상관없이 키워드가 일치하는 모든 파일을 반환합니다.
 */

import {
  FileCaseStorage,
  type FileCase,
  type FileCaseQuery
} from '../../packages/bestcase-db/dist/index.js';

const storage = new FileCaseStorage();

interface SearchFileCasesInput {
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
   * 프로젝트명 필터
   */
  projectName?: string;

  /**
   * 파일 역할 필터 (page, component, composable, store, api, util)
   */
  fileRole?: string;

  /**
   * 파일 타입 필터 (vue, ts, tsx, js)
   */
  fileType?: string;

  /**
   * 특정 항목 최소 점수
   * 예: { apiConnection: 40 } → API 연결 점수가 40 이상인 파일
   *
   * 점수가 낮더라도 참고할 코드가 필요하면 낮은 값을 설정하세요.
   */
  minScores?: {
    structure?: number;
    apiConnection?: number;
    designSystem?: number;
    utilityUsage?: number;
    errorHandling?: number;
    typeUsage?: number;
    stateManagement?: number;
    performance?: number;
  };

  /**
   * 특정 엔티티 포함
   * 예: ["User", "Product"]
   */
  entities?: string[];

  /**
   * 특정 API 메서드 사용
   * 예: ["grpc.UserService"]
   */
  apiMethods?: string[];

  /**
   * 특정 컴포넌트 사용
   * 예: ["ElTable", "ElDialog"]
   */
  componentsUsed?: string[];

  /**
   * 최대 결과 수 (기본값: 10)
   */
  limit?: number;

  /**
   * 내용 포함 여부 (기본값: false)
   * true로 설정하면 파일 내용도 반환합니다.
   */
  includeContent?: boolean;
}

interface SearchFileCasesOutput {
  totalFound: number;
  results: Array<{
    id: string;
    projectName: string;
    filePath: string;
    fileType: string;
    fileRole: string;
    keywords: string[];
    scores: {
      structure: number;
      apiConnection: number;
      designSystem: number;
      utilityUsage: number;
      errorHandling: number;
      typeUsage: number;
      stateManagement: number;
      performance: number;
    };
    analysis: {
      linesOfCode: number;
      apiMethods: string[];
      componentsUsed: string[];
      composablesUsed: string[];
      patterns: string[];
      entities: string[];
    };
    /**
     * 파일 내용 (includeContent가 true일 때만)
     */
    content?: string;
  }>;
}

/**
 * 키워드 기반으로 파일을 검색합니다.
 *
 * 점수와 상관없이 키워드가 일치하는 파일을 반환합니다.
 * 필요 시 특정 항목의 최소 점수를 지정할 수 있습니다.
 *
 * @example
 * // 검색 기능이 있는 페이지 찾기
 * const result = await bestcase.searchFileCases({
 *   keywords: ["search"],
 *   fileRole: "page"
 * });
 *
 * @example
 * // 검색 + 페이지네이션이 모두 있는 파일 찾기
 * const result = await bestcase.searchFileCases({
 *   keywordsAll: ["search", "pagination"]
 * });
 *
 * @example
 * // API 연결 점수가 40 이상인 검색 페이지 찾기
 * const result = await bestcase.searchFileCases({
 *   keywords: ["search"],
 *   minScores: { apiConnection: 40 }
 * });
 *
 * @example
 * // User 엔티티를 다루는 모든 파일 찾기
 * const result = await bestcase.searchFileCases({
 *   entities: ["User"]
 * });
 *
 * @example
 * // gRPC를 사용하는 파일 찾기 (점수 무관)
 * const result = await bestcase.searchFileCases({
 *   keywords: ["grpc"]
 * });
 */
export async function searchFileCases(input: SearchFileCasesInput): Promise<SearchFileCasesOutput> {
  const query: FileCaseQuery = {
    keywords: input.keywords,
    keywordsAll: input.keywordsAll,
    projectName: input.projectName,
    fileRole: input.fileRole,
    fileType: input.fileType,
    minScores: input.minScores,
    entities: input.entities,
    apiMethods: input.apiMethods,
    componentsUsed: input.componentsUsed,
    limit: input.limit || 10
  };

  const fileCases = await storage.search(query);

  console.error('[searchFileCases] Query:', JSON.stringify(query, null, 2));
  console.error('[searchFileCases] Found:', fileCases.length, 'files');

  const results = fileCases.map(fc => {
    const result: any = {
      id: fc.id,
      projectName: fc.projectName,
      filePath: fc.filePath,
      fileType: fc.fileType,
      fileRole: fc.fileRole,
      keywords: fc.keywords,
      scores: fc.scores,
      analysis: fc.analysis
    };

    if (input.includeContent) {
      result.content = fc.content;
    }

    return result;
  });

  return {
    totalFound: fileCases.length,
    results
  };
}

/**
 * 특정 기능을 가진 파일 검색 (편의 함수)
 *
 * @example
 * // 검색 기능이 있는 모든 파일 찾기
 * const result = await bestcase.findFilesByFunction("search");
 */
export async function findFilesByFunction(func: string): Promise<SearchFileCasesOutput> {
  return searchFileCases({ keywords: [func] });
}

/**
 * 특정 엔티티를 다루는 파일 검색 (편의 함수)
 *
 * @example
 * // User 엔티티를 다루는 모든 파일 찾기
 * const result = await bestcase.findFilesByEntity("User");
 */
export async function findFilesByEntity(entity: string): Promise<SearchFileCasesOutput> {
  return searchFileCases({ entities: [entity] });
}

/**
 * 특정 역할의 파일 검색 (편의 함수)
 *
 * @example
 * // 모든 페이지 파일 찾기
 * const result = await bestcase.findFilesByRole("page");
 */
export async function findFilesByRole(role: string): Promise<SearchFileCasesOutput> {
  return searchFileCases({ fileRole: role });
}

/**
 * 추천 코드 가져오기
 *
 * 특정 기능을 구현할 때 참고할 코드를 가져옵니다.
 * 점수가 낮더라도 해당 기능이 있으면 반환합니다.
 *
 * @example
 * // 검색 페이지를 만들 때 참고할 코드 가져오기
 * const result = await bestcase.getRecommendedCode({
 *   targetFunction: "search",
 *   fileRole: "page",
 *   includeContent: true
 * });
 */
export async function getRecommendedCode(input: {
  targetFunction: string;
  fileRole?: string;
  entities?: string[];
  limit?: number;
  includeContent?: boolean;
}): Promise<SearchFileCasesOutput> {
  return searchFileCases({
    keywords: [input.targetFunction],
    fileRole: input.fileRole,
    entities: input.entities,
    limit: input.limit || 5,
    includeContent: input.includeContent !== false  // 기본값 true
  });
}

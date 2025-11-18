/**
 * RAG 기반 자동 코드 추천 시스템
 *
 * 사용자 요청을 분석하고, 의미적으로 유사한 코드를 자동으로 추천합니다.
 * 키워드 매칭 + 벡터 유사도를 결합한 하이브리드 검색을 사용합니다.
 */

import {
  FileCaseStorage,
  type FileCase
} from '../../packages/bestcase-db/dist/index.js';
import { EmbeddingService } from '../../packages/llm-analyzer/dist/index.js';

const storage = new FileCaseStorage();

interface RecommendationRequest {
  /**
   * 사용자 요청 설명
   * 예: "검색 페이지를 만들어 줘", "사용자 목록 CRUD 구현"
   */
  description: string;

  /**
   * 대상 기능 (선택)
   * 예: "search", "list", "create", "update", "delete"
   */
  targetFunction?: string;

  /**
   * 대상 엔티티 (선택)
   * 예: ["User", "Product", "Order"]
   */
  entities?: string[];

  /**
   * 필요한 컴포넌트 (선택)
   * 예: ["ElTable", "ElDialog", "ElForm"]
   */
  components?: string[];

  /**
   * 파일 역할 필터 (선택)
   * 예: "page", "component", "composable"
   */
  fileRole?: string;

  /**
   * 최대 결과 수 (기본값: 5)
   */
  limit?: number;

  /**
   * Ollama 설정 (RAG용)
   */
  ollamaConfig?: {
    url: string;
    embeddingModel: string;
  };
}

interface RecommendationResult {
  /**
   * 추천된 코드 목록
   */
  recommendations: Array<{
    id: string;
    projectName: string;
    filePath: string;
    fileRole: string;
    keywords: string[];
    similarity: number;  // 유사도 점수 (0-1)
    matchReason: string; // 매칭 이유
    content: string;
    analysis: {
      linesOfCode: number;
      apiMethods: string[];
      componentsUsed: string[];
      composablesUsed: string[];
      patterns: string[];
      entities: string[];
    };
  }>;

  /**
   * 검색에 사용된 쿼리 정보
   */
  queryInfo: {
    description: string;
    extractedKeywords: string[];
    embeddingUsed: boolean;
    warnings?: string[];  // 경고 메시지 (임베딩 모델 불일치 등)
  };

  /**
   * 총 검색된 파일 수
   */
  totalSearched: number;
}

/**
 * 사용자 요청에서 키워드 자동 추출
 */
function extractKeywordsFromRequest(request: RecommendationRequest): string[] {
  const keywords: string[] = [];
  const description = request.description.toLowerCase();

  // CRUD 키워드
  if (description.includes('검색') || description.includes('search') || description.includes('찾')) {
    keywords.push('search');
  }
  if (description.includes('목록') || description.includes('list') || description.includes('조회')) {
    keywords.push('list');
  }
  if (description.includes('상세') || description.includes('detail') || description.includes('보기')) {
    keywords.push('detail');
  }
  if (description.includes('생성') || description.includes('create') || description.includes('등록') || description.includes('추가')) {
    keywords.push('create');
  }
  if (description.includes('수정') || description.includes('update') || description.includes('편집') || description.includes('변경')) {
    keywords.push('update');
  }
  if (description.includes('삭제') || description.includes('delete') || description.includes('제거')) {
    keywords.push('delete');
  }

  // 기능 키워드
  if (description.includes('페이지네이션') || description.includes('pagination') || description.includes('페이징')) {
    keywords.push('pagination');
  }
  if (description.includes('필터') || description.includes('filter')) {
    keywords.push('filter');
  }
  if (description.includes('정렬') || description.includes('sort')) {
    keywords.push('sort');
  }
  if (description.includes('모달') || description.includes('modal') || description.includes('팝업') || description.includes('dialog')) {
    keywords.push('modal');
  }
  if (description.includes('폼') || description.includes('form') || description.includes('입력')) {
    keywords.push('form');
  }
  if (description.includes('테이블') || description.includes('table') || description.includes('표')) {
    keywords.push('table');
  }

  // API 키워드
  if (description.includes('grpc') || description.includes('gRPC')) {
    keywords.push('grpc');
  }
  if (description.includes('rest') || description.includes('api')) {
    keywords.push('rest');
  }

  // targetFunction 추가
  if (request.targetFunction) {
    keywords.push(request.targetFunction);
  }

  // 키워드가 너무 적으면 (0-1개) fileRole을 키워드로 추가
  if (keywords.length <= 1 && request.fileRole) {
    keywords.push(request.fileRole);
  }

  return [...new Set(keywords)];
}

/**
 * 하이브리드 검색: 키워드 매칭 + 벡터 유사도
 */
async function hybridSearch(
  request: RecommendationRequest,
  allCases: FileCase[],
  embeddingService?: EmbeddingService
): Promise<Array<{ fileCase: FileCase; similarity: number; matchReason: string }>> {
  const extractedKeywords = extractKeywordsFromRequest(request);
  const results: Array<{ fileCase: FileCase; similarity: number; matchReason: string }> = [];

  // 1단계: 키워드 매칭으로 후보 필터링
  let candidates = allCases;

  // 파일 역할 필터
  if (request.fileRole) {
    candidates = candidates.filter(fc => fc.fileRole === request.fileRole);
  }

  // 엔티티 필터
  if (request.entities && request.entities.length > 0) {
    candidates = candidates.filter(fc =>
      request.entities!.some(entity =>
        fc.analysis.entities.some(e => e.toLowerCase().includes(entity.toLowerCase()))
      )
    );
  }

  // 2단계: 유사도 계산
  if (embeddingService && candidates.some(fc => fc.embedding)) {
    // RAG: 벡터 유사도 사용
    const queryText = EmbeddingService.createQueryText({
      description: request.description,
      targetFunction: request.targetFunction,
      entities: request.entities,
      components: request.components
    });

    console.error(`[hybridSearch] Generating query embedding for: "${queryText.substring(0, 100)}..."`);

    try {
      const queryVector = await embeddingService.embedWithRetry(queryText);
      console.error(`[hybridSearch] Query embedding generated: ${queryVector.length}D vector`);

      for (const fileCase of candidates) {
        if (fileCase.embedding) {
          const vectorSimilarity = EmbeddingService.cosineSimilarity(queryVector, fileCase.embedding);

          // 키워드 매칭 점수 계산
          const keywordMatches = extractedKeywords.filter(kw =>
            fileCase.keywords.some(fkw => fkw.toLowerCase().includes(kw.toLowerCase()))
          );
          const keywordScore = keywordMatches.length / Math.max(extractedKeywords.length, 1);

          // 하이브리드 점수: 벡터 70% + 키워드 30%
          const hybridScore = vectorSimilarity * 0.7 + keywordScore * 0.3;

          results.push({
            fileCase,
            similarity: hybridScore,
            matchReason: `Vector: ${(vectorSimilarity * 100).toFixed(1)}%, Keywords: ${keywordMatches.join(', ') || 'none'}`
          });
        } else {
          // 임베딩 없는 경우 키워드만 사용
          const keywordMatches = extractedKeywords.filter(kw =>
            fileCase.keywords.some(fkw => fkw.toLowerCase().includes(kw.toLowerCase()))
          );
          const keywordScore = keywordMatches.length / Math.max(extractedKeywords.length, 1);

          if (keywordScore > 0) {
            results.push({
              fileCase,
              similarity: keywordScore * 0.5,  // 임베딩 없으면 점수 낮춤
              matchReason: `Keywords only: ${keywordMatches.join(', ')}`
            });
          } else if (request.fileRole && fileCase.fileRole === request.fileRole) {
            // fileRole만 맞으면 낮은 점수로 포함 (임베딩 없음)
            results.push({
              fileCase,
              similarity: 0.05,
              matchReason: `File role match (no embedding): ${request.fileRole}`
            });
          }
        }
      }
    } catch (error) {
      console.error('[autoRecommend] Embedding failed, falling back to keyword search');
      // 임베딩 실패 시 키워드만 사용
      for (const fileCase of candidates) {
        const keywordMatches = extractedKeywords.filter(kw =>
          fileCase.keywords.some(fkw => fkw.toLowerCase().includes(kw.toLowerCase()))
        );
        const keywordScore = keywordMatches.length / Math.max(extractedKeywords.length, 1);

        if (keywordScore > 0) {
          results.push({
            fileCase,
            similarity: keywordScore,
            matchReason: `Keywords: ${keywordMatches.join(', ')}`
          });
        } else if (request.fileRole && fileCase.fileRole === request.fileRole) {
          // fileRole만 맞으면 낮은 점수로 포함
          results.push({
            fileCase,
            similarity: 0.1,
            matchReason: `File role match (embedding error): ${request.fileRole}`
          });
        }
      }
    }
  } else {
    // 키워드 매칭만 사용
    for (const fileCase of candidates) {
      const keywordMatches = extractedKeywords.filter(kw =>
        fileCase.keywords.some(fkw => fkw.toLowerCase().includes(kw.toLowerCase()))
      );
      const keywordScore = keywordMatches.length / Math.max(extractedKeywords.length, 1);

      // 키워드 매칭이 없어도 fileRole이 맞으면 최소 점수로 포함
      if (keywordScore > 0) {
        results.push({
          fileCase,
          similarity: keywordScore,
          matchReason: `Keywords: ${keywordMatches.join(', ')}`
        });
      } else if (request.fileRole && fileCase.fileRole === request.fileRole) {
        // fileRole만 맞으면 낮은 점수로 포함
        results.push({
          fileCase,
          similarity: 0.1,
          matchReason: `File role match: ${request.fileRole}`
        });
      }
    }
  }

  // 유사도 순 정렬
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * RAG 기반 자동 코드 추천
 *
 * 사용자 요청을 분석하고, 의미적으로 유사한 코드를 자동으로 추천합니다.
 *
 * @example
 * // 검색 페이지 추천 받기
 * const result = await autoRecommend({
 *   description: "사용자 검색 페이지를 만들어 줘",
 *   entities: ["User"],
 *   fileRole: "page"
 * });
 *
 * @example
 * // CRUD 구현 참고 코드
 * const result = await autoRecommend({
 *   description: "상품 관리 CRUD 페이지 구현",
 *   entities: ["Product"],
 *   targetFunction: "crud"
 * });
 */
export async function autoRecommend(request: RecommendationRequest): Promise<RecommendationResult> {
  console.error('[autoRecommend] Request:', JSON.stringify(request, null, 2));

  const limit = request.limit || 5;
  const extractedKeywords = extractKeywordsFromRequest(request);
  const warnings: string[] = [];

  // 임베딩 서비스 초기화 및 검증 (선택적)
  let embeddingService: EmbeddingService | undefined;

  if (request.ollamaConfig) {
    console.error(`[autoRecommend] Initializing embedding service: ${request.ollamaConfig.url}, model: ${request.ollamaConfig.embeddingModel}`);

    embeddingService = new EmbeddingService({
      ollamaUrl: request.ollamaConfig.url,
      model: request.ollamaConfig.embeddingModel
    });

    // 1단계: 모델 존재 확인
    const isHealthy = await embeddingService.healthCheck();
    if (!isHealthy) {
      console.error(`[autoRecommend] ❌ Embedding model '${request.ollamaConfig.embeddingModel}' not found at ${request.ollamaConfig.url}`);
      warnings.push(`Ollama embedding model '${request.ollamaConfig.embeddingModel}' not found. Please run: docker exec ollama-code-analyzer ollama pull ${request.ollamaConfig.embeddingModel}`);
      embeddingService = undefined;
    } else {
      // 2단계: 실제 임베딩 생성 테스트
      console.error('[autoRecommend] Model found, testing actual embedding generation...');
      const verification = await embeddingService.verifyEmbedding();

      if (!verification.ok) {
        console.error(`[autoRecommend] ❌ Embedding verification failed: ${verification.error}`);
        warnings.push(`Embedding test failed: ${verification.error}. Using keyword search only.`);
        embeddingService = undefined;
      } else {
        console.error(`[autoRecommend] ✅ Embedding service verified: ${verification.dimension}D vectors`);
      }
    }
  }

  // 모든 FileCase 로드
  const allCases = await storage.list();
  const withEmbedding = allCases.filter(fc => fc.embedding && fc.embedding.length > 0).length;
  const withoutEmbedding = allCases.length - withEmbedding;

  console.error('[autoRecommend] Total FileCases:', allCases.length);
  console.error(`[autoRecommend] - With embedding: ${withEmbedding}`);
  console.error(`[autoRecommend] - Without embedding: ${withoutEmbedding}`);

  if (withoutEmbedding > 0 && embeddingService) {
    console.error(`[autoRecommend] ⚠️ ${withoutEmbedding} files missing embeddings. Consider re-scanning with: docker exec mcp-code-mode-server node /app/scripts/dist/scan/scan-files-ai.js`);
  }

  // 불일치 카운트 리셋
  EmbeddingService.resetMismatchCount();

  // 하이브리드 검색
  const searchResults = await hybridSearch(request, allCases, embeddingService);
  console.error('[autoRecommend] Search results:', searchResults.length);

  // 임베딩 모델 불일치 경고 수집
  const mismatchWarning = EmbeddingService.getMismatchWarning();
  if (mismatchWarning) {
    warnings.push(mismatchWarning);
  }

  // Top-K 결과 반환
  const topResults = searchResults.slice(0, limit);

  const recommendations = topResults.map(result => ({
    id: result.fileCase.id,
    projectName: result.fileCase.projectName,
    filePath: result.fileCase.filePath,
    fileRole: result.fileCase.fileRole,
    keywords: result.fileCase.keywords,
    similarity: result.similarity,
    matchReason: result.matchReason,
    content: result.fileCase.content,
    analysis: result.fileCase.analysis
  }));

  return {
    recommendations,
    queryInfo: {
      description: request.description,
      extractedKeywords,
      embeddingUsed: !!embeddingService,
      warnings: warnings.length > 0 ? warnings : undefined
    },
    totalSearched: allCases.length
  };
}

/**
 * 현재 파일 분석 후 자동 추천
 *
 * 현재 작업 중인 파일을 분석하고, 완성에 필요한 참고 코드를 추천합니다.
 *
 * @example
 * const result = await analyzeAndRecommend({
 *   currentFile: `
 *     <template>
 *       <div>
 *         <!-- TODO: 검색 폼 구현 -->
 *         <!-- TODO: 결과 테이블 구현 -->
 *       </div>
 *     </template>
 *   `,
 *   filePath: "pages/users/index.vue",
 *   description: "페이지를 완성해 줘"
 * });
 */
export async function analyzeAndRecommend(input: {
  currentFile: string;
  filePath: string;
  description?: string;
  ollamaConfig?: {
    url: string;
    embeddingModel: string;
  };
}): Promise<RecommendationResult> {
  // 현재 파일에서 힌트 추출
  const content = input.currentFile.toLowerCase();
  const keywords: string[] = [];

  // TODO 주석에서 힌트 추출
  const todoMatches = input.currentFile.match(/TODO[:\s]+([^\n]+)/gi) || [];
  for (const todo of todoMatches) {
    const todoText = todo.toLowerCase();
    if (todoText.includes('검색') || todoText.includes('search')) keywords.push('search');
    if (todoText.includes('목록') || todoText.includes('list')) keywords.push('list');
    if (todoText.includes('폼') || todoText.includes('form')) keywords.push('form');
    if (todoText.includes('테이블') || todoText.includes('table')) keywords.push('table');
    if (todoText.includes('모달') || todoText.includes('modal')) keywords.push('modal');
    if (todoText.includes('페이지네이션') || todoText.includes('pagination')) keywords.push('pagination');
  }

  // 파일 경로에서 역할 추론
  let fileRole = 'page';
  if (input.filePath.includes('components/')) fileRole = 'component';
  if (input.filePath.includes('composables/')) fileRole = 'composable';
  if (input.filePath.includes('stores/')) fileRole = 'store';

  // 파일명에서 엔티티 추론
  const entities: string[] = [];
  const pathParts = input.filePath.split('/');
  for (const part of pathParts) {
    const cleaned = part.replace(/\.(vue|ts|tsx|js)$/, '');
    if (cleaned && cleaned !== 'index' && cleaned.length > 2) {
      // PascalCase로 변환
      const entity = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      if (!['Pages', 'Components', 'Composables', 'Stores'].includes(entity)) {
        entities.push(entity);
      }
    }
  }

  return autoRecommend({
    description: input.description || `${fileRole} 구현 참고 코드`,
    targetFunction: keywords[0],
    entities,
    fileRole,
    limit: 5,
    ollamaConfig: input.ollamaConfig
  });
}

/**
 * ⚠️ DEPRECATED - Preflight 시스템
 *
 * Anthropic MCP Code Mode 방식으로 전환되었습니다.
 *
 * **기존 방식** (deprecated):
 * - 서버가 buildRequestMetadata, synthesizeTodoList, preflightCheck 실행
 * - 복잡한 프로젝트 스캔 로직 (scanProjectApiFiles, detectProjectType 등)
 * - executeWorkflow MCP 도구로 제공
 * - 매번 프로젝트 전체를 재귀 스캔 (느림)
 *
 * **새로운 방식** (권장):
 * - 클라이언트가 MetadataAnalyzer로 메타데이터 추출 (한 번만)
 * - 클라이언트가 BestCase 비교 및 TODO 생성
 * - 서버는 guides API만 제공 (search, load, combine)
 * - 98% 토큰 절감
 *
 * 📖 참고: docs/WORKFLOW_CORRECT.md
 *
 * @deprecated 이 파일의 대부분 함수는 더 이상 사용되지 않습니다.
 */

// ============================================================
// 기존 인터페이스 (호환성 유지)
// ============================================================

export interface RequestMetadata {
  projectName: string;
  intent: 'page-create' | 'page-update' | 'refactor' | 'api-integration';
  targets: string[];
  apiTypeHint: 'grpc' | 'openapi' | 'auto';
  entities: string[];
  uiDeps: {
    tailwind: boolean;
    openerdComponents: string[];
  };
  allowWrite: {
    glob: string[];
    maxFiles: number;
    maxLoc: number;
  };
  constraints: string[];
  riskThreshold: number;
}

export interface TodoItem {
  id: string;
  files: string[];
  loc: number;
  description: string;
}

export interface PreflightResult {
  ok: boolean;
  risk: number;
  keywords: string[];
  reasons: Array<{
    check: string;
    passed: boolean;
    details: string;
  }>;
}

// ============================================================
// Deprecated 함수들 (더 이상 사용하지 마세요)
// ============================================================

/**
 * @deprecated 클라이언트가 MetadataAnalyzer를 사용하세요
 *
 * 기존: 서버가 package.json, nuxt.config.ts 읽어서 메타데이터 생성
 * 새 방식: 클라이언트가 MetadataAnalyzer로 추출
 */
export async function buildRequestMetadata(
  reqText: string,
  workspacePath: string
): Promise<RequestMetadata> {
  throw new Error(
    'DEPRECATED: Use MetadataAnalyzer in client instead.\n' +
    'See docs/WORKFLOW_CORRECT.md for the new workflow.'
  );
}

/**
 * @deprecated 클라이언트에서 메타데이터 비교로 TODO를 생성하세요
 *
 * 기존: 서버가 scanProjectApiFiles()로 프로젝트 스캔 → TODO 생성
 * 새 방식: 클라이언트가 ProjectMetadata와 BestCase 비교 → TODO 생성
 */
export async function synthesizeTodoList(
  meta: RequestMetadata,
  bestCase?: any,
  workspacePath?: string
): Promise<TodoItem[]> {
  throw new Error(
    'DEPRECATED: Generate TODOs in client by comparing ProjectMetadata with BestCase.\n' +
    'See docs/WORKFLOW_CORRECT.md for the new workflow.'
  );
}

/**
 * @deprecated 선택적 위험도 평가는 클라이언트에서 처리하세요
 *
 * 기존: 서버가 API 타입 체크, UI 의존성 체크, 쓰기 범위 확인
 * 새 방식: 클라이언트가 메타데이터 기반 위험도 평가 (선택적)
 */
export async function preflightCheck(
  meta: RequestMetadata,
  todos: TodoItem[],
  bestCase?: any
): Promise<PreflightResult> {
  throw new Error(
    'DEPRECATED: Implement optional risk assessment in client if needed.\n' +
    'Preflight is now optional. See docs/WORKFLOW_CORRECT.md'
  );
}

// ============================================================
// 유지되는 유틸리티 함수들
// ============================================================

/**
 * RequestMetadata에서 키워드 추출 (가이드 검색용)
 *
 * ⚠️ 이 함수는 유지되지만, extractKeywordsFromMetadata()를 사용하는 것을 권장합니다.
 */
export function extractKeywords(
  meta: RequestMetadata,
  todos: TodoItem[]
): string[] {
  const keywords: string[] = [];

  // API 타입
  if (meta.apiTypeHint !== 'auto') {
    keywords.push(meta.apiTypeHint);
  }

  // 엔티티
  keywords.push(...meta.entities);

  // TODO ID
  keywords.push(...todos.map(t => t.id));

  // 공통 키워드
  keywords.push('nuxt3');

  if (meta.intent === 'page-create' || meta.intent === 'page-update') {
    keywords.push('pages', 'asyncData', 'errorHandling', 'paging');
  }

  if (meta.apiTypeHint === 'grpc') {
    keywords.push('proto', 'composables', 'backend');
  } else if (meta.apiTypeHint === 'openapi') {
    keywords.push('rest', 'api', 'backend');
  }

  return keywords;
}

/**
 * ProjectMetadata/FileMetadata에서 가이드 검색 키워드 추출 (✅ 권장)
 *
 * MetadataAnalyzer의 결과를 guides.search() 키워드로 변환합니다.
 *
 * @param metadata - ProjectMetadata 또는 FileMetadata (from MetadataAnalyzer)
 * @returns 가이드 검색에 사용할 키워드 배열
 *
 * @example
 * // 클라이언트 코드 (Sandbox에서 실행)
 * const analyzer = metadata.createAnalyzer({
 *   ollamaUrl: 'http://localhost:11434',
 *   model: 'qwen2.5-coder:7b'
 * });
 *
 * const projectMeta = await analyzer.analyzeProject(projectPath, files, 3);
 *
 * // 메타데이터에서 키워드 추출
 * const keywords = extractKeywordsFromMetadata(projectMeta);
 * // ['grpc', 'nuxt3', 'crud', 'api-client', 'pagination', ...]
 *
 * // 가이드 검색
 * const searchResult = await guides.search({
 *   keywords,
 *   apiType: projectMeta.apiType
 * });
 */
export function extractKeywordsFromMetadata(metadata: any): string[] {
  const keywords: string[] = [];

  // 1. patterns 필드 (디자인 패턴)
  if (metadata.patterns && Array.isArray(metadata.patterns)) {
    keywords.push(...metadata.patterns);
    // 예: ['interceptor', 'error-recovery', 'singleton']
  }

  // 2. frameworks 필드 (프레임워크/라이브러리)
  if (metadata.frameworks && Array.isArray(metadata.frameworks)) {
    keywords.push(...metadata.frameworks);
    // 예: ['@grpc/grpc-js', 'nuxt3', 'vue3']
  }

  // 3. apiType 필드 (API 타입)
  if (metadata.apiType) {
    keywords.push(metadata.apiType);
    // 예: 'grpc', 'openapi'
  }

  // 4. features 필드 (기능)
  if (metadata.features && Array.isArray(metadata.features)) {
    keywords.push(...metadata.features);
    // 예: ['api-client', 'pagination', 'crud']
  }

  // 5. apiMethods 필드 (API 메서드명, 처음 5개만)
  if (metadata.apiMethods && Array.isArray(metadata.apiMethods)) {
    keywords.push(...metadata.apiMethods.slice(0, 5));
    // 예: ['getUserList', 'createUser', 'updateUser']
  }

  // 6. entities 필드 (엔티티)
  if (metadata.entities && Array.isArray(metadata.entities)) {
    keywords.push(...metadata.entities);
    // 예: ['User', 'Product', 'Order']
  }

  // 7. complexity가 high면 복잡도 키워드 추가
  if (metadata.complexity === 'high') {
    keywords.push('complex', 'advanced');
  }

  // 8. errorHandling이 comprehensive면 에러 처리 키워드 추가
  if (metadata.errorHandling === 'comprehensive') {
    keywords.push('error-handling', 'recovery', 'resilience');
  }

  // 중복 제거 및 소문자 변환
  const uniqueKeywords = [...new Set(keywords.map(k => k.toLowerCase()))];

  return uniqueKeywords;
}

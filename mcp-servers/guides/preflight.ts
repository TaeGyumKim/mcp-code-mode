/**
 * Preflight 유틸리티 함수들
 *
 * ⚠️ 기존 preflight 시스템은 deprecated 되었습니다.
 * 새로운 Anthropic MCP Code Mode 방식으로 전환되었습니다.
 *
 * - 클라이언트가 MetadataAnalyzer로 메타데이터 추출
 * - 클라이언트가 BestCase 비교 및 TODO 생성
 * - 서버는 guides API만 제공 (search, load, combine)
 *
 * 📖 참고: docs/WORKFLOW_CORRECT.md
 */

// ============================================================
// 키워드 추출 유틸리티
// ============================================================

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

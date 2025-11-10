/**
 * BestCase 점수 계산 시스템
 * 
 * API 연결 품질과 openerd-nuxt3 컴포넌트 사용도를 분석하여 점수 산출
 */

/**
 * API 연결 점수 계산 (0-100점)
 * - OpenAPI: 매우 잘 구성됨 (예: dktechin)
 * - gRPC: 구조화된 API
 * - REST API: 기본 API
 */
export function calculateApiScore(patterns: any): number {
  let score = 0;
  const apiInfo = patterns.apiInfo || {};
  
  // 1. API 타입 기본 점수 (40점)
  if (apiInfo.hasOpenApi) {
    score += 40; // OpenAPI가 가장 높은 점수
  } else if (apiInfo.hasGrpc) {
    score += 35; // gRPC
  } else if (apiInfo.hasRestApi) {
    score += 25; // REST API
  }
  
  // 2. API 문서화 점수 (20점)
  if (patterns.apiDocumentation) {
    if (patterns.apiDocumentation.hasSwagger) score += 10;
    if (patterns.apiDocumentation.hasTypeDefinitions) score += 10;
  }
  
  // 3. API 사용 패턴 점수 (20점)
  if (patterns.apiUsage) {
    // Composables에서 API 클라이언트 사용
    if (patterns.apiUsage.hasApiComposable) score += 10;
    // 에러 핸들링 존재
    if (patterns.apiUsage.hasErrorHandling) score += 5;
    // 타입 안전성
    if (patterns.apiUsage.hasTypeSafety) score += 5;
  }
  
  // 4. API 엔드포인트 품질 (20점)
  if (patterns.apiEndpoints) {
    const endpointCount = patterns.apiEndpoints.count || 0;
    // 10개 이상의 엔드포인트 = 완전한 API
    score += Math.min(20, Math.floor(endpointCount / 5) * 5);
  }
  
  return Math.min(100, score);
}

/**
 * openerd-nuxt3 컴포넌트 사용 점수 (0-100점)
 * - CommonTable, CommonButton, CommonLayout 등 사용도
 * - Tailwind CSS와의 통합
 */
export function calculateComponentScore(patterns: any): number {
  let score = 0;
  const componentUsage = patterns.componentUsage || {};
  
  // 1. 핵심 컴포넌트 사용 (50점)
  const coreComponents = [
    'CommonTable',
    'CommonPaginationTable',
    'CommonButton',
    'CommonLayout',
    'CommonModal'
  ];
  
  const usedCoreComponents = coreComponents.filter(comp => 
    componentUsage[comp] > 0
  );
  
  score += (usedCoreComponents.length / coreComponents.length) * 50;
  
  // 2. Tailwind CSS 통합 (20점)
  if (patterns.tailwindUsage) {
    if (patterns.tailwindUsage.hasTailwindConfig) score += 10;
    if (patterns.tailwindUsage.usesUtilityClasses) score += 10;
  }
  
  // 3. 컴포넌트 사용 빈도 (20점)
  const totalUsage = Object.values(componentUsage).reduce((sum: number, count: any) => sum + (count as number), 0);
  // 50회 이상 사용 = 완전한 통합
  score += Math.min(20, Math.floor(totalUsage / 5) * 2);
  
  // 4. Composables 사용 (10점)
  if (patterns.composableUsage) {
    const openerdComposables = ['usePaging', 'useBackendClient', 'useModalState'];
    const usedComposables = openerdComposables.filter(comp => 
      patterns.composableUsage[comp] > 0
    );
    score += (usedComposables.length / openerdComposables.length) * 10;
  }
  
  return Math.min(100, score);
}

/**
 * 전체 BestCase 점수 계산
 */
export function calculateTotalScore(patterns: any) {
  const apiScore = calculateApiScore(patterns);
  const componentScore = calculateComponentScore(patterns);
  
  return {
    total: Math.round((apiScore + componentScore) / 2),
    api: apiScore,
    component: componentScore,
    tier: getTier(apiScore, componentScore)
  };
}

/**
 * 점수 기반 티어 분류
 */
function getTier(apiScore: number, componentScore: number): string {
  const avgScore = (apiScore + componentScore) / 2;
  
  if (avgScore >= 80) return 'S'; // 최상급 (예: dktechin)
  if (avgScore >= 60) return 'A'; // 우수
  if (avgScore >= 40) return 'B'; // 보통
  if (avgScore >= 20) return 'C'; // 기본
  return 'D'; // 미흡
}

import { BestCaseStorage, type BestCase } from '../../packages/bestcase-db/dist/index.js';
import type { BestCaseScores } from '../../packages/bestcase-db/dist/types.js';

const storage = new BestCaseStorage();

interface PageMatchCriteria {
  /** 페이지 카테고리 (예: 'list', 'detail', 'form', 'login', 'dashboard') */
  category?: string;
  /** API 타입 (grpc, openapi, rest, mixed) */
  apiType?: string;
  /** 디자인 시스템 (예: 'openerd-nuxt3', 'element-plus') */
  designSystem?: string;
  /** 프레임워크 목록 (부분 일치) */
  frameworks?: string[];
  /** 태그 (부분 일치) */
  tags?: string[];
  /** 최소 총점 */
  minTotalScore?: number;
  /** 최소 일치 점수 (0-100, 기본 40) */
  minMatchScore?: number;
  /** 최대 결과 개수 */
  limit?: number;
}

interface SimilarPage {
  /** BestCase ID */
  id: string;
  /** 프로젝트 이름 */
  projectName: string;
  /** 카테고리 */
  category: string;
  /** 설명 */
  description: string;
  /** 일치 점수 (0-100) */
  matchScore: number;
  /** 일치 이유 */
  matchReasons: string[];
  /** 품질 점수 */
  scores?: BestCaseScores;
  /** 총점 */
  totalScore?: number;
  /** 우수 영역 */
  excellentIn?: Array<keyof BestCaseScores>;
  /** 태그 */
  tags: string[];
  /** 파일 개수 */
  fileCount: number;
  /** 주요 패턴 */
  patterns: string[];
  /** API 타입 */
  apiType?: string;
  /** 디자인 시스템 */
  designSystem?: string;
}

interface FindSimilarPagesOutput {
  /** 유사한 페이지 목록 (일치도 순) */
  pages: SimilarPage[];
  /** 검색 기준 */
  criteria: PageMatchCriteria;
  /** 총 검색 개수 */
  total: number;
}

/**
 * 유사한 페이지 찾기
 *
 * 현재 프로젝트의 특성에 맞는 유사한 BestCase 페이지를 찾습니다.
 * 카테고리, API 타입, 디자인 시스템, 프레임워크 등을 기반으로 일치도를 계산합니다.
 *
 * @example
 * // 목록 페이지와 유사한 BestCase 찾기
 * const result = await bestcase.findSimilarPages({
 *   category: 'list',
 *   apiType: 'grpc',
 *   designSystem: 'openerd-nuxt3',
 *   minTotalScore: 70,
 *   limit: 5
 * });
 *
 * @example
 * // 특정 프레임워크를 사용하는 유사 페이지 찾기
 * const result = await bestcase.findSimilarPages({
 *   category: 'form',
 *   frameworks: ['vue3', 'pinia'],
 *   tags: ['validation']
 * });
 */
export async function findSimilarPages(criteria: PageMatchCriteria): Promise<FindSimilarPagesOutput> {
  console.error('[findSimilarPages] Criteria:', JSON.stringify(criteria, null, 2));

  // 1. 모든 BestCase 로드
  const allCases = await storage.list();
  console.error('[findSimilarPages] Total BestCases:', allCases.length);

  // 2. 각 BestCase에 대해 일치 점수 계산
  const scoredPages: SimilarPage[] = [];

  for (const bc of allCases) {
    const { score, reasons } = calculateMatchScore(bc, criteria);

    const minMatch = criteria.minMatchScore ?? 40;
    if (score < minMatch) continue;

    // 최소 점수 필터
    if (criteria.minTotalScore && bc.totalScore) {
      if (bc.totalScore < criteria.minTotalScore) continue;
    }

    const metadata = bc.patterns?.metadata || {};

    scoredPages.push({
      id: bc.id,
      projectName: bc.projectName,
      category: bc.category,
      description: bc.description,
      matchScore: score,
      matchReasons: reasons,
      scores: bc.scores,
      totalScore: bc.totalScore,
      excellentIn: bc.excellentIn,
      tags: bc.metadata.tags,
      fileCount: bc.files.length,
      patterns: metadata.patterns || [],
      apiType: metadata.apiType,
      designSystem: metadata.designSystem
    });
  }

  // 3. 일치 점수 내림차순 정렬
  scoredPages.sort((a, b) => b.matchScore - a.matchScore);

  // 4. 결과 제한
  const limit = criteria.limit || 10;
  const limitedPages = scoredPages.slice(0, limit);

  console.error('[findSimilarPages] Found:', limitedPages.length, 'similar pages');

  return {
    pages: limitedPages,
    criteria,
    total: limitedPages.length
  };
}

/**
 * BestCase와 검색 기준의 일치 점수 계산
 */
function calculateMatchScore(bc: BestCase, criteria: PageMatchCriteria): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const metadata = bc.patterns?.metadata || {};

  // 1. 카테고리 일치 (가중치 35점)
  if (criteria.category) {
    const categoryMatch = matchCategory(bc.category, criteria.category);
    if (categoryMatch === 'exact') {
      score += 35;
      reasons.push(`카테고리 완전 일치: ${criteria.category}`);
    } else if (categoryMatch === 'partial') {
      score += 20;
      reasons.push(`카테고리 부분 일치: ${bc.category} ~ ${criteria.category}`);
    }
  } else {
    score += 15; // 카테고리 무관
  }

  // 2. API 타입 일치 (가중치 25점)
  if (criteria.apiType && metadata.apiType) {
    if (metadata.apiType === criteria.apiType) {
      score += 25;
      reasons.push(`API 타입 일치: ${criteria.apiType}`);
    } else if (metadata.apiType === 'mixed' || criteria.apiType === 'mixed') {
      score += 15;
      reasons.push(`API 타입 호환: ${metadata.apiType}`);
    }
  } else if (!criteria.apiType) {
    score += 10; // API 타입 무관
  }

  // 3. 디자인 시스템 일치 (가중치 20점)
  if (criteria.designSystem && metadata.designSystem) {
    if (metadata.designSystem === criteria.designSystem) {
      score += 20;
      reasons.push(`디자인 시스템 일치: ${criteria.designSystem}`);
    }
  } else if (!criteria.designSystem) {
    score += 8; // 디자인 시스템 무관
  }

  // 4. 프레임워크 일치 (가중치 15점)
  if (criteria.frameworks && criteria.frameworks.length > 0 && metadata.frameworks) {
    const overlap = criteria.frameworks.filter((f: string) =>
      metadata.frameworks.includes(f)
    );
    const overlapRatio = overlap.length / criteria.frameworks.length;
    const frameworkScore = Math.round(15 * overlapRatio);
    score += frameworkScore;
    if (overlap.length > 0) {
      reasons.push(`프레임워크 일치 (${overlap.length}/${criteria.frameworks.length}): ${overlap.join(', ')}`);
    }
  } else if (!criteria.frameworks || criteria.frameworks.length === 0) {
    score += 6; // 프레임워크 무관
  }

  // 5. 태그 일치 (가중치 5점)
  if (criteria.tags && criteria.tags.length > 0) {
    const tagOverlap = criteria.tags.filter(t => bc.metadata.tags.includes(t));
    const tagRatio = tagOverlap.length / criteria.tags.length;
    const tagScore = Math.round(5 * tagRatio);
    score += tagScore;
    if (tagOverlap.length > 0) {
      reasons.push(`태그 일치: ${tagOverlap.join(', ')}`);
    }
  } else {
    score += 2; // 태그 무관
  }

  // 품질 보너스 (최대 5점)
  if (bc.totalScore && bc.totalScore >= 85) {
    score = Math.min(100, score + 5);
    reasons.push(`품질 우수 (${bc.totalScore}점)`);
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * 카테고리 일치 판정
 */
function matchCategory(actual: string, target: string): 'exact' | 'partial' | 'none' {
  const normalizedActual = actual.toLowerCase();
  const normalizedTarget = target.toLowerCase();

  // 정확히 일치
  if (normalizedActual === normalizedTarget) {
    return 'exact';
  }

  // 부분 일치 규칙
  const categoryAliases: Record<string, string[]> = {
    'list': ['list', 'table', 'grid', 'index', 'browse', 'search-results'],
    'detail': ['detail', 'view', 'show', 'single', 'info'],
    'form': ['form', 'create', 'edit', 'new', 'update', 'input'],
    'login': ['login', 'signin', 'auth', 'authentication'],
    'dashboard': ['dashboard', 'home', 'overview', 'summary', 'main'],
    'settings': ['settings', 'config', 'preferences', 'options'],
    'profile': ['profile', 'account', 'user', 'mypage']
  };

  for (const [key, aliases] of Object.entries(categoryAliases)) {
    const allAliases = [key, ...aliases];
    const actualMatches = allAliases.some(alias =>
      normalizedActual.includes(alias) || alias.includes(normalizedActual)
    );
    const targetMatches = allAliases.some(alias =>
      normalizedTarget.includes(alias) || alias.includes(normalizedTarget)
    );

    if (actualMatches && targetMatches) {
      return 'partial';
    }
  }

  return 'none';
}

import { BestCaseStorage, type BestCase } from '../../packages/bestcase-db/dist/index.js';
import type { BestCaseScores } from '../../packages/bestcase-db/dist/types.js';
import { findSimilarPages } from './findSimilarPages.js';

const storage = new BestCaseStorage();

interface ProjectAnalysis {
  /** 페이지/컴포넌트 카테고리 (예: 'list', 'detail', 'form') */
  category: string;
  /** API 타입 (grpc, openapi, rest, mixed) */
  apiType?: string;
  /** 디자인 시스템 */
  designSystem?: string;
  /** 사용 중인 프레임워크 */
  frameworks?: string[];
  /** 필요한 기능들 */
  features?: string[];
  /** 현재 파일 구조 (선택) */
  currentFiles?: string[];
}

interface RecommendedFile {
  /** 파일 경로 */
  path: string;
  /** 파일 내용 */
  content: string;
  /** 파일 목적/설명 */
  purpose: string;
  /** 원본 BestCase ID */
  sourceId: string;
  /** 원본 프로젝트 이름 */
  sourceProject: string;
  /** 관련도 점수 (0-100) */
  relevanceScore: number;
  /** 추천 이유 */
  reasons: string[];
  /** 파일 카테고리 (page, component, composable, api, type 등) */
  fileCategory: string;
}

interface CodeRecommendation {
  /** 추천 파일 목록 (관련도 순) */
  files: RecommendedFile[];
  /** 사용된 BestCase 정보 */
  sources: Array<{
    id: string;
    projectName: string;
    category: string;
    matchScore: number;
    totalScore?: number;
    excellentIn?: Array<keyof BestCaseScores>;
  }>;
  /** 적용 가이드 */
  applicationGuide: string;
  /** 총 추천 파일 개수 */
  totalFiles: number;
  /** 분석 기준 */
  analysis: ProjectAnalysis;
}

/**
 * 페이지 완성을 위한 코드 추천
 *
 * 현재 프로젝트 분석 결과를 기반으로 유사한 BestCase에서
 * 관련 코드 파일을 자동으로 추천합니다.
 *
 * @example
 * // 프로젝트를 분석하고 코드 추천 받기
 * const analysis = await metadata.extractProjectContext('/projects/myapp');
 * const recommendation = await bestcase.recommendCodeForPage({
 *   category: 'list',
 *   apiType: analysis.apiInfo.type,
 *   designSystem: analysis.designSystemInfo.detected,
 *   frameworks: ['vue3', 'pinia'],
 *   features: ['pagination', 'sorting', 'filtering']
 * });
 *
 * // 추천된 코드 활용
 * recommendation.files.forEach(file => {
 *   console.log(`${file.path}: ${file.purpose}`);
 *   console.log(file.content);
 * });
 *
 * @example
 * // 폼 페이지 코드 추천
 * const recommendation = await bestcase.recommendCodeForPage({
 *   category: 'form',
 *   apiType: 'grpc',
 *   features: ['validation', 'error-handling', 'loading-state']
 * });
 */
export async function recommendCodeForPage(analysis: ProjectAnalysis): Promise<CodeRecommendation> {
  console.error('[recommendCodeForPage] Analysis:', JSON.stringify(analysis, null, 2));

  // 1. 유사한 페이지 찾기
  const similarPages = await findSimilarPages({
    category: analysis.category,
    apiType: analysis.apiType,
    designSystem: analysis.designSystem,
    frameworks: analysis.frameworks,
    tags: analysis.features,
    minMatchScore: 35,
    limit: 5
  });

  console.error('[recommendCodeForPage] Similar pages found:', similarPages.pages.length);

  if (similarPages.pages.length === 0) {
    return {
      files: [],
      sources: [],
      applicationGuide: '유사한 BestCase를 찾을 수 없습니다. 검색 조건을 완화하거나 BestCase를 추가해주세요.',
      totalFiles: 0,
      analysis
    };
  }

  // 2. 각 유사 페이지에서 파일 로드 및 점수 계산
  const recommendedFiles: RecommendedFile[] = [];
  const sources: CodeRecommendation['sources'] = [];

  for (const page of similarPages.pages) {
    const fullCase = await storage.load(page.id);
    if (!fullCase) continue;

    sources.push({
      id: page.id,
      projectName: page.projectName,
      category: page.category,
      matchScore: page.matchScore,
      totalScore: page.totalScore,
      excellentIn: page.excellentIn
    });

    // 각 파일에 대해 관련도 계산
    for (const file of fullCase.files) {
      const { score: relevanceScore, reasons, fileCategory } = calculateFileRelevance(
        file,
        analysis,
        page.matchScore
      );

      // 관련도가 낮은 파일은 제외
      if (relevanceScore < 30) continue;

      recommendedFiles.push({
        path: file.path,
        content: file.content,
        purpose: file.purpose,
        sourceId: page.id,
        sourceProject: page.projectName,
        relevanceScore,
        reasons,
        fileCategory
      });
    }
  }

  // 3. 관련도 순 정렬 및 중복 제거
  recommendedFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 같은 파일 카테고리에서 중복 제거 (가장 높은 점수만 유지)
  const uniqueFiles = deduplicateFiles(recommendedFiles);

  // 4. 상위 파일만 선택 (최대 15개)
  const topFiles = uniqueFiles.slice(0, 15);

  // 5. 적용 가이드 생성
  const applicationGuide = generateApplicationGuide(topFiles, analysis, sources);

  console.error('[recommendCodeForPage] Recommended files:', topFiles.length);

  return {
    files: topFiles,
    sources,
    applicationGuide,
    totalFiles: topFiles.length,
    analysis
  };
}

/**
 * 파일 관련도 계산
 */
function calculateFileRelevance(
  file: { path: string; content: string; purpose: string },
  analysis: ProjectAnalysis,
  pageMatchScore: number
): { score: number; reasons: string[]; fileCategory: string } {
  let score = 0;
  const reasons: string[] = [];
  const fileCategory = categorizeFile(file.path);

  // 1. 페이지 매칭 점수 반영 (최대 40점)
  score += Math.round(pageMatchScore * 0.4);
  reasons.push(`페이지 일치도: ${pageMatchScore}점`);

  // 2. 파일 카테고리 관련성 (최대 30점)
  const categoryBonus = getCategoryBonus(fileCategory, analysis.category);
  score += categoryBonus.score;
  if (categoryBonus.reason) {
    reasons.push(categoryBonus.reason);
  }

  // 3. 기능 키워드 매칭 (최대 20점)
  if (analysis.features && analysis.features.length > 0) {
    const matchedFeatures = analysis.features.filter(feature => {
      const lowerContent = file.content.toLowerCase();
      const lowerPath = file.path.toLowerCase();
      const lowerPurpose = file.purpose.toLowerCase();
      const featureLower = feature.toLowerCase();

      return (
        lowerContent.includes(featureLower) ||
        lowerPath.includes(featureLower) ||
        lowerPurpose.includes(featureLower)
      );
    });

    if (matchedFeatures.length > 0) {
      const featureScore = Math.round(20 * (matchedFeatures.length / analysis.features.length));
      score += featureScore;
      reasons.push(`기능 매칭: ${matchedFeatures.join(', ')}`);
    }
  }

  // 4. 파일 크기/복잡도 보너스 (최대 10점)
  const lineCount = file.content.split('\n').length;
  if (lineCount >= 50 && lineCount <= 500) {
    score += 10;
    reasons.push(`적절한 크기 (${lineCount} lines)`);
  } else if (lineCount > 500) {
    score += 5;
    reasons.push(`대형 파일 (${lineCount} lines)`);
  }

  return {
    score: Math.min(100, score),
    reasons,
    fileCategory
  };
}

/**
 * 파일 경로에서 카테고리 추론
 */
function categorizeFile(path: string): string {
  const lowerPath = path.toLowerCase();

  if (lowerPath.includes('/pages/') || lowerPath.includes('.page.')) {
    return 'page';
  }
  if (lowerPath.includes('/components/') || lowerPath.endsWith('.vue')) {
    if (lowerPath.includes('common') || lowerPath.includes('shared')) {
      return 'shared-component';
    }
    return 'component';
  }
  if (lowerPath.includes('/composables/') || lowerPath.includes('use')) {
    return 'composable';
  }
  if (lowerPath.includes('/api/') || lowerPath.includes('/server/')) {
    return 'api';
  }
  if (lowerPath.includes('/types/') || lowerPath.endsWith('.d.ts')) {
    return 'type';
  }
  if (lowerPath.includes('/stores/') || lowerPath.includes('/store/')) {
    return 'store';
  }
  if (lowerPath.includes('/utils/') || lowerPath.includes('/helpers/')) {
    return 'utility';
  }
  if (lowerPath.includes('/services/')) {
    return 'service';
  }

  return 'other';
}

/**
 * 파일 카테고리별 보너스 점수
 */
function getCategoryBonus(fileCategory: string, pageCategory: string): { score: number; reason: string } {
  // 페이지 카테고리에 따른 중요 파일 우선순위
  const priorities: Record<string, string[]> = {
    'list': ['page', 'composable', 'component', 'api', 'type'],
    'detail': ['page', 'composable', 'api', 'component', 'type'],
    'form': ['page', 'composable', 'component', 'type', 'utility'],
    'login': ['page', 'composable', 'api', 'store', 'type'],
    'dashboard': ['page', 'component', 'composable', 'store', 'api']
  };

  const priority = priorities[pageCategory.toLowerCase()] || ['page', 'composable', 'component', 'api'];

  const index = priority.indexOf(fileCategory);
  if (index === -1) {
    return { score: 5, reason: '' };
  }

  // 우선순위가 높을수록 높은 점수
  const score = Math.max(5, 30 - (index * 5));
  return {
    score,
    reason: `${fileCategory} 파일 (우선순위 ${index + 1}위)`
  };
}

/**
 * 중복 파일 제거
 */
function deduplicateFiles(files: RecommendedFile[]): RecommendedFile[] {
  const seen = new Map<string, RecommendedFile>();

  for (const file of files) {
    // 파일명 기준으로 중복 체크 (경로의 마지막 부분)
    const fileName = file.path.split('/').pop() || file.path;
    const key = `${file.fileCategory}:${fileName}`;

    if (!seen.has(key) || (seen.get(key)!.relevanceScore < file.relevanceScore)) {
      seen.set(key, file);
    }
  }

  return Array.from(seen.values());
}

/**
 * 적용 가이드 생성
 */
function generateApplicationGuide(
  files: RecommendedFile[],
  analysis: ProjectAnalysis,
  sources: CodeRecommendation['sources']
): string {
  const lines: string[] = [];

  lines.push(`## ${analysis.category} 페이지 구현 가이드\n`);

  // 소스 정보
  lines.push('### 참고된 BestCase');
  sources.forEach((source, idx) => {
    const excellentText = source.excellentIn && source.excellentIn.length > 0
      ? ` | 우수: ${source.excellentIn.join(', ')}`
      : '';
    lines.push(
      `${idx + 1}. **${source.projectName}** (${source.category}) - 일치도 ${source.matchScore}점${excellentText}`
    );
  });
  lines.push('');

  // 파일 카테고리별 분류
  const byCategory = new Map<string, RecommendedFile[]>();
  for (const file of files) {
    if (!byCategory.has(file.fileCategory)) {
      byCategory.set(file.fileCategory, []);
    }
    byCategory.get(file.fileCategory)!.push(file);
  }

  lines.push('### 추천 파일 구조\n');

  const categoryOrder = ['page', 'component', 'composable', 'api', 'type', 'store', 'utility', 'service', 'other'];
  const categoryNames: Record<string, string> = {
    'page': '페이지',
    'component': '컴포넌트',
    'shared-component': '공통 컴포넌트',
    'composable': '컴포저블 (훅)',
    'api': 'API 연동',
    'type': '타입 정의',
    'store': '상태 관리',
    'utility': '유틸리티',
    'service': '서비스',
    'other': '기타'
  };

  for (const category of categoryOrder) {
    const categoryFiles = byCategory.get(category);
    if (!categoryFiles || categoryFiles.length === 0) continue;

    const displayName = categoryNames[category] || category;
    lines.push(`#### ${displayName}`);
    categoryFiles.forEach(file => {
      lines.push(`- **${file.path}** (${file.relevanceScore}점)`);
      lines.push(`  - 목적: ${file.purpose}`);
      lines.push(`  - 이유: ${file.reasons.slice(0, 2).join(', ')}`);
    });
    lines.push('');
  }

  // 적용 단계
  lines.push('### 적용 순서\n');
  lines.push('1. **타입 정의** - 데이터 구조 먼저 정의');
  lines.push('2. **API 연동** - 서버 통신 로직 구현');
  lines.push('3. **컴포저블** - 비즈니스 로직 및 상태 관리');
  lines.push('4. **컴포넌트** - UI 구성요소 생성');
  lines.push('5. **페이지** - 전체 조립 및 라우팅\n');

  // 주의사항
  lines.push('### 주의사항\n');
  lines.push('- 추천 코드는 **참고용**입니다. 프로젝트에 맞게 수정하세요.');
  lines.push('- 디자인 시스템 컴포넌트명을 현재 프로젝트에 맞게 변경하세요.');
  lines.push('- API 엔드포인트와 타입을 실제 백엔드에 맞게 조정하세요.');
  lines.push('- 에러 처리 및 로딩 상태를 확인하세요.');

  return lines.join('\n');
}

/**
 * BestCase 메타데이터 비교 유틸리티
 *
 * 현재 프로젝트의 메타데이터와 BestCase 메타데이터를 비교하여
 * 누락된 패턴, 품질 차이, TODO 항목을 자동으로 생성합니다.
 */

import type { ProjectMetadata, FileMetadata, ComponentMetadata } from './metadata.js';

/**
 * BestCase 비교 결과
 */
export interface ComparisonResult {
  /** 누락된 디자인 패턴 */
  missingPatterns: string[];

  /** 복잡도 차이 */
  complexityGap: {
    project: string;
    bestCase: string;
    difference: number;
  };

  /** BestCase에는 있지만 프로젝트에 없는 API 메서드 */
  unusedMethods: string[];

  /** 에러 처리 품질 차이 (퍼센트) */
  errorHandlingGap: number;

  /** 타입 정의 품질 차이 (퍼센트) */
  typeQualityGap: number;

  /** BestCase에서 사용하지만 프로젝트에서 사용하지 않는 컴포넌트 */
  unusedComponents: string[];

  /** 자동 생성된 TODO 항목들 */
  todos: TodoItem[];
}

/**
 * TODO 항목
 */
export interface TodoItem {
  /** TODO 고유 ID */
  id: string;

  /** TODO 생성 이유 */
  reason: string;

  /** 수정해야 할 파일 경로들 */
  files: string[];

  /** 예상 LOC (Lines of Code) */
  loc: number;

  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';

  /** BestCase 참고 파일 (단일) */
  referenceFile?: {
    path: string;
    content: string;
    purpose: string;
    score: number;
    tier: string;
  };

  /** BestCase 참고 파일들 (복수) */
  referenceFiles?: Array<{
    path: string;
    score: number;
    tier: string;
  }>;
}

/**
 * 프로젝트 메타데이터와 BestCase 메타데이터를 비교합니다.
 *
 * @param projectMeta - 현재 프로젝트의 메타데이터
 * @param bestCaseMeta - BestCase의 메타데이터
 * @param bestCaseFiles - BestCase 파일들의 상세 메타데이터 (선택)
 * @returns 비교 결과 및 자동 생성된 TODO 목록
 *
 * @example
 * ```typescript
 * const analyzer = metadata.createAnalyzer({ ... });
 * const projectMeta = await analyzer.analyzeProject(path, files, 3);
 *
 * const bestCase = await bestcase.loadBestCase({ projectName: 'excellent-app' });
 * const comparison = metadata.compareBestCase(
 *   projectMeta,
 *   bestCase.patterns.metadata,
 *   bestCase.files
 * );
 *
 * console.log('Missing patterns:', comparison.missingPatterns);
 * console.log('TODOs:', comparison.todos);
 * ```
 */
export function compareBestCaseMetadata(
  projectMeta: ProjectMetadata,
  bestCaseMeta: ProjectMetadata,
  bestCaseFiles?: any[]
): ComparisonResult {
  // 1. 누락된 디자인 패턴 찾기
  const missingPatterns = bestCaseMeta.patterns.filter(p =>
    !projectMeta.patterns.includes(p)
  );

  // 2. 복잡도 비교
  const complexityLevels = ['trivial', 'low', 'medium', 'high', 'very-high'];
  const projectComplexityIndex = complexityLevels.indexOf(projectMeta.averageComplexity || 'medium');
  const bestCaseComplexityIndex = complexityLevels.indexOf(bestCaseMeta.averageComplexity || 'medium');

  const complexityGap = {
    project: projectMeta.averageComplexity || 'medium',
    bestCase: bestCaseMeta.averageComplexity || 'medium',
    difference: projectComplexityIndex - bestCaseComplexityIndex
  };

  // 3. API 메서드 비교
  const unusedMethods = (bestCaseMeta.apiMethods || []).filter(m =>
    !(projectMeta.apiMethods || []).includes(m)
  );

  // 4. 에러 처리 품질 계산
  const projectErrorHandling = (projectMeta.filesWithGoodErrorHandling || 0) / (projectMeta.totalFiles || 1);
  const bestCaseErrorHandling = (bestCaseMeta.filesWithGoodErrorHandling || 0) / (bestCaseMeta.totalFiles || 1);
  const errorHandlingGap = Math.round((bestCaseErrorHandling - projectErrorHandling) * 100);

  // 5. 타입 품질 계산
  const projectTypeQuality = (projectMeta.filesWithGoodTypes || 0) / (projectMeta.totalFiles || 1);
  const bestCaseTypeQuality = (bestCaseMeta.filesWithGoodTypes || 0) / (bestCaseMeta.totalFiles || 1);
  const typeQualityGap = Math.round((bestCaseTypeQuality - projectTypeQuality) * 100);

  // 6. 컴포넌트 활용도 비교
  const unusedComponents = (bestCaseMeta.componentsUsed || []).filter(c =>
    !(projectMeta.componentsUsed || []).includes(c)
  );

  // TODO 항목 생성
  const todos: TodoItem[] = [];

  // TODO 1: 누락된 패턴 추가
  for (const pattern of missingPatterns) {
    const referenceFile = bestCaseFiles?.find(f =>
      f.patterns && f.patterns.includes(pattern)
    );

    todos.push({
      id: `add-${pattern}-pattern`,
      reason: `BestCase에 우수 ${pattern} 패턴 존재`,
      files: [inferFilePathForPattern(pattern, projectMeta)],
      loc: estimateLOCForPattern(pattern),
      priority: priorityForPattern(pattern),
      referenceFile: referenceFile ? {
        path: referenceFile.path || 'unknown',
        content: referenceFile.content || '',
        purpose: referenceFile.purpose || `${pattern} 패턴 구현`,
        score: referenceFile.score || 0,
        tier: referenceFile.tier || 'B'
      } : undefined
    });
  }

  // TODO 2: 에러 처리 개선
  if (errorHandlingGap > 20) {
    const referenceFiles = bestCaseFiles
      ?.filter(f => f.errorHandling === 'comprehensive')
      ?.sort((a, b) => (b.score || 0) - (a.score || 0))
      ?.slice(0, 3)
      ?.map(f => ({
        path: f.path || 'unknown',
        score: f.score || 0,
        tier: f.tier || 'B'
      }));

    todos.push({
      id: 'improve-error-handling',
      reason: `에러 처리 품질 낮음 (현재: ${Math.round(projectErrorHandling * 100)}%, 목표: ${Math.round(bestCaseErrorHandling * 100)}%)`,
      files: ['composables/**/*.ts', 'server/api/**/*.ts'],
      loc: 80,
      priority: 'high',
      referenceFiles
    });
  }

  // TODO 3: 타입 정의 개선
  if (typeQualityGap > 20) {
    const referenceFiles = bestCaseFiles
      ?.filter(f => f.typeQuality === 'excellent')
      ?.sort((a, b) => (b.score || 0) - (a.score || 0))
      ?.slice(0, 3)
      ?.map(f => ({
        path: f.path || 'unknown',
        score: f.score || 0,
        tier: f.tier || 'B'
      }));

    todos.push({
      id: 'improve-type-definitions',
      reason: `타입 정의 품질 낮음 (현재: ${Math.round(projectTypeQuality * 100)}%, 목표: ${Math.round(bestCaseTypeQuality * 100)}%)`,
      files: ['types/**/*.ts', 'composables/**/*.ts'],
      loc: 50,
      priority: 'medium',
      referenceFiles
    });
  }

  // TODO 4: 복잡도 차이
  if (complexityGap.difference > 1) {
    todos.push({
      id: 'reduce-complexity',
      reason: `코드 복잡도가 BestCase보다 높음 (현재: ${complexityGap.project}, 목표: ${complexityGap.bestCase})`,
      files: ['**/*.ts', '**/*.vue'],
      loc: 100,
      priority: 'medium'
    });
  }

  // TODO 5: 미사용 API 메서드
  if (unusedMethods.length > 0) {
    todos.push({
      id: 'add-missing-api-methods',
      reason: `BestCase에 ${unusedMethods.length}개 추가 API 메서드 존재: ${unusedMethods.slice(0, 3).join(', ')}${unusedMethods.length > 3 ? ' 등' : ''}`,
      files: ['composables/useApi.ts', 'server/api/**/*.ts'],
      loc: unusedMethods.length * 20,
      priority: 'low'
    });
  }

  // TODO 6: 미사용 컴포넌트
  if (unusedComponents.length > 0 && unusedComponents.length <= 10) {
    todos.push({
      id: 'use-better-components',
      reason: `BestCase에서 사용하는 컴포넌트 미사용: ${unusedComponents.slice(0, 5).join(', ')}${unusedComponents.length > 5 ? ' 등' : ''}`,
      files: ['pages/**/*.vue', 'components/**/*.vue'],
      loc: 40,
      priority: 'low'
    });
  }

  // 우선순위별로 정렬
  todos.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    missingPatterns,
    complexityGap,
    unusedMethods,
    errorHandlingGap,
    typeQualityGap,
    unusedComponents,
    todos
  };
}

/**
 * 패턴에 맞는 파일 경로를 추론합니다.
 */
function inferFilePathForPattern(pattern: string, meta: ProjectMetadata): string {
  const patternFileMap: Record<string, string> = {
    'interceptor': 'composables/useGrpcClient.ts',
    'error-recovery': 'composables/useErrorHandler.ts',
    'singleton': 'composables/useSingleton.ts',
    'factory': 'composables/useFactory.ts',
    'repository': 'composables/useRepository.ts',
    'service-layer': 'services/index.ts',
    'dto': 'types/dto.ts',
    'validation': 'utils/validation.ts',
    'caching': 'composables/useCache.ts',
    'retry-logic': 'composables/useRetry.ts'
  };

  return patternFileMap[pattern] || `composables/use${capitalizeFirst(pattern)}.ts`;
}

/**
 * 패턴 구현에 필요한 LOC를 추정합니다.
 */
function estimateLOCForPattern(pattern: string): number {
  const patternLOCMap: Record<string, number> = {
    'interceptor': 50,
    'error-recovery': 30,
    'singleton': 20,
    'factory': 40,
    'repository': 60,
    'service-layer': 80,
    'dto': 15,
    'validation': 35,
    'caching': 45,
    'retry-logic': 25
  };

  return patternLOCMap[pattern] || 20;
}

/**
 * 패턴의 우선순위를 반환합니다.
 */
function priorityForPattern(pattern: string): 'high' | 'medium' | 'low' {
  const highPriority = ['interceptor', 'error-recovery', 'validation'];
  const mediumPriority = ['singleton', 'factory', 'repository', 'caching'];

  if (highPriority.includes(pattern)) return 'high';
  if (mediumPriority.includes(pattern)) return 'medium';
  return 'low';
}

/**
 * 문자열의 첫 글자를 대문자로 변환합니다.
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

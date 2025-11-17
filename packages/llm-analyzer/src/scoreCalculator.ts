/**
 * 메타데이터 기반 다차원 점수 계산기 (개선 버전)
 *
 * MetadataAnalyzer 결과를 세밀하게 분석하여 8가지 품질 항목을 평가합니다.
 */

import type { BestCaseScores } from '../../bestcase-db/src/types.js';
import type { ProjectMetadata, FileMetadata } from './metadata.js';

/**
 * 메타데이터 기반 자동 점수 계산
 */
export function calculateScoresFromMetadata(
  metadata: ProjectMetadata | FileMetadata,
  isProject: boolean = true
): BestCaseScores {
  if (isProject) {
    return calculateProjectScores(metadata as ProjectMetadata);
  } else {
    return calculateFileScores(metadata as FileMetadata);
  }
}

// ============================================
// Project-level 점수 계산 (개선 버전)
// ============================================

function calculateProjectScores(meta: ProjectMetadata): BestCaseScores {
  return {
    structure: calculateStructureScore(meta),
    apiConnection: calculateApiConnectionScore(meta),
    designSystem: calculateDesignSystemScore(meta),
    utilityUsage: calculateUtilityUsageScore(meta),
    errorHandling: calculateErrorHandlingScore(meta),
    typeUsage: calculateTypeUsageScore(meta),
    stateManagement: calculateStateManagementScore(meta),
    performance: calculatePerformanceScore(meta)
  };
}

function calculateStructureScore(meta: ProjectMetadata): number {
  let score = 30; // 기본 점수

  // 파일 구조 다양성 (+25점)
  const categories = Object.keys(meta.filesByCategory).length;
  if (categories >= 5) score += 25;
  else if (categories >= 3) score += 20;
  else if (categories >= 2) score += 15;
  else score += 5;

  // 복잡도 적절성 (+20점)
  if (meta.averageComplexity === 'trivial' || meta.averageComplexity === 'low') score += 20;
  else if (meta.averageComplexity === 'medium') score += 15;
  else if (meta.averageComplexity === 'high') score += 8;

  // Excellent files 비율 (+20점)
  if (meta.totalFiles > 0) {
    const ratio = meta.excellentFiles.length / meta.totalFiles;
    score += Math.floor(ratio * 20);
  }

  // 패턴 다양성 (+10점)
  if (meta.patterns && meta.patterns.length > 0) {
    score += Math.min(10, meta.patterns.length * 2);
  }

  // excellentFiles의 structure 관련 이유 분석 (+10점 보너스)
  if (meta.excellentFiles) {
    const structureReasons = meta.excellentFiles.filter(f =>
      f.reasons.some(r =>
        r.toLowerCase().includes('구조') ||
        r.toLowerCase().includes('structure') ||
        r.toLowerCase().includes('분리') ||
        r.toLowerCase().includes('네이밍')
      )
    );
    if (structureReasons.length > 0) {
      score += Math.min(10, structureReasons.length * 3);
    }
  }

  return Math.min(100, score);
}

function calculateApiConnectionScore(meta: ProjectMetadata): number {
  let score = 20; // 기본 점수

  // API 타입 활용 (+35점)
  if (meta.apiType && meta.apiType !== 'none') {
    score += 25;
    if (meta.apiType === 'grpc') score += 10; // gRPC 보너스
    else if (meta.apiType === 'mixed') score += 5; // Mixed API
  }

  // API 메서드 수 (+15점)
  if (meta.apiMethods && meta.apiMethods.length > 0) {
    score += Math.min(15, meta.apiMethods.length * 1.5);
  }

  // API 관련 패턴 (+15점)
  if (meta.patterns) {
    const apiPatterns = meta.patterns.filter(p =>
      p.includes('api') || p.includes('client') || p.includes('interceptor')
    );
    score += Math.min(15, apiPatterns.length * 5);
  }

  // Excellent files 중 API 관련 (+15점)
  if (meta.excellentFiles) {
    const apiFiles = meta.excellentFiles.filter(f =>
      f.reasons.some(r =>
        r.toLowerCase().includes('api') ||
        r.toLowerCase().includes('grpc') ||
        r.toLowerCase().includes('rest') ||
        r.toLowerCase().includes('클라이언트')
      )
    );
    score += Math.min(15, apiFiles.length * 4);
  }

  return Math.min(100, score);
}

function calculateDesignSystemScore(meta: ProjectMetadata): number {
  let score = 30; // 기본 점수

  // 디자인 시스템 감지 (+40점)
  if (meta.designSystem) {
    score += 40;
  }

  // 컴포넌트 수 (+15점)
  const componentCount = meta.componentsUsed?.length || 0;
  if (componentCount > 10) score += 15;
  else if (componentCount > 5) score += 10;
  else if (componentCount > 0) score += 5;

  // UI 관련 dependencies (+10점)
  if (meta.dependencies) {
    const uiLibs = ['element-plus', 'vuetify', 'primevue', 'naive-ui', 'ant-design-vue'];
    const hasUILib = meta.dependencies.some(dep => uiLibs.some(lib => dep.includes(lib)));
    if (hasUILib) score += 10;
  }

  // excellentFiles의 디자인 시스템 이유 (+10점)
  if (meta.excellentFiles) {
    const designFiles = meta.excellentFiles.filter(f =>
      f.reasons.some(r =>
        r.toLowerCase().includes('디자인') ||
        r.toLowerCase().includes('design') ||
        r.toLowerCase().includes('ui') ||
        r.toLowerCase().includes('컴포넌트')
      )
    );
    score += Math.min(10, designFiles.length * 3);
  }

  return Math.min(100, score);
}

function calculateUtilityUsageScore(meta: ProjectMetadata): number {
  let score = 20; // 기본 점수

  // 유틸리티 라이브러리 감지 (+35점)
  if (meta.utilityLibrary) {
    score += 35;
  }

  // Composables 활용 (+20점)
  const composableCount = meta.composablesUsed?.length || 0;
  if (composableCount > 10) score += 20;
  else if (composableCount > 5) score += 15;
  else if (composableCount > 0) score += Math.min(15, composableCount * 2);

  // 유틸리티 관련 dependencies (+15점)
  if (meta.dependencies) {
    const utilLibs = ['lodash', 'date-fns', 'dayjs', 'ramda', 'vueuse'];
    const utilCount = meta.dependencies.filter(dep =>
      utilLibs.some(lib => dep.includes(lib))
    ).length;
    score += Math.min(15, utilCount * 8);
  }

  // 패턴 활용 (+15점)
  if (meta.patterns) {
    const utilPatterns = meta.patterns.filter(p =>
      p.includes('helper') || p.includes('utility') || p.includes('composable')
    );
    score += Math.min(15, utilPatterns.length * 5);
  }

  return Math.min(100, score);
}

function calculateErrorHandlingScore(meta: ProjectMetadata): number {
  let score = 25; // 기본 점수

  // 파일별 에러 핸들링 비율 (+35점)
  if (meta.totalFiles > 0) {
    const ratio = meta.filesWithGoodErrorHandling / meta.totalFiles;
    score += Math.floor(ratio * 35);
  }

  // 에러 핸들링 패턴 (+20점)
  if (meta.patterns) {
    const errorPatterns = meta.patterns.filter(p =>
      p.includes('error') || p.includes('exception') || p.includes('try-catch')
    );
    score += Math.min(20, errorPatterns.length * 7);
  }

  // Excellent files 중 에러 핸들링 (+20점)
  if (meta.excellentFiles) {
    const errorFiles = meta.excellentFiles.filter(f =>
      f.reasons.some(r =>
        r.toLowerCase().includes('error') ||
        r.toLowerCase().includes('예외') ||
        r.toLowerCase().includes('에러') ||
        r.toLowerCase().includes('처리')
      )
    );
    score += Math.min(20, errorFiles.length * 5);
  }

  return Math.min(100, score);
}

function calculateTypeUsageScore(meta: ProjectMetadata): number {
  let score = 35; // 기본 점수 (TypeScript 사용 가정)

  // 파일별 타입 품질 비율 (+35점)
  if (meta.totalFiles > 0) {
    const ratio = meta.filesWithGoodTypes / meta.totalFiles;
    score += Math.floor(ratio * 35);
  }

  // 타입 관련 패턴 (+15점)
  if (meta.patterns) {
    const typePatterns = meta.patterns.filter(p =>
      p.includes('type') || p.includes('interface') || p.includes('generic')
    );
    score += Math.min(15, typePatterns.length * 5);
  }

  // Excellent files 비율 (+15점)
  if (meta.totalFiles > 0) {
    const ratio = meta.excellentFiles.length / meta.totalFiles;
    score += Math.floor(ratio * 15);
  }

  return Math.min(100, score);
}

function calculateStateManagementScore(meta: ProjectMetadata): number {
  let score = 30; // 기본 점수

  // 상태 관리 라이브러리 (+30점)
  if (meta.frameworks) {
    if (meta.frameworks.includes('pinia')) score += 30;
    else if (meta.frameworks.includes('vuex')) score += 20;
  }

  // Composables 활용 (+25점)
  const composableCount = meta.composablesUsed?.length || 0;
  if (composableCount > 8) score += 25;
  else if (composableCount > 4) score += 18;
  else if (composableCount > 0) score += Math.min(15, composableCount * 3);

  // 상태 관리 패턴 (+15점)
  if (meta.patterns) {
    const statePatterns = meta.patterns.filter(p =>
      p.includes('state') || p.includes('store') || p.includes('pinia')
    );
    score += Math.min(15, statePatterns.length * 5);
  }

  return Math.min(100, score);
}

function calculatePerformanceScore(meta: ProjectMetadata): number {
  let score = 40; // 기본 점수

  // 복잡도 관리 (+25점)
  if (meta.averageComplexity === 'trivial') score += 25;
  else if (meta.averageComplexity === 'low') score += 20;
  else if (meta.averageComplexity === 'medium') score += 15;
  else if (meta.averageComplexity === 'high') score += 8;

  // 성능 관련 패턴 (+20점)
  if (meta.patterns) {
    const perfPatterns = meta.patterns.filter(p =>
      p.includes('lazy') ||
      p.includes('computed') ||
      p.includes('memo') ||
      p.includes('virtual') ||
      p.includes('cache')
    );
    score += Math.min(20, perfPatterns.length * 6);
  }

  // Excellent files 비율 (+15점)
  if (meta.totalFiles > 0) {
    const ratio = meta.excellentFiles.length / meta.totalFiles;
    score += Math.floor(ratio * 15);
  }

  return Math.min(100, score);
}

// ============================================
// File-level 점수 계산
// ============================================

function calculateFileScores(meta: FileMetadata): BestCaseScores {
  return {
    structure: calculateFileStructureScore(meta),
    apiConnection: calculateFileApiScore(meta),
    designSystem: calculateFileDesignSystemScore(meta),
    utilityUsage: calculateFileUtilityScore(meta),
    errorHandling: calculateFileErrorHandlingScore(meta),
    typeUsage: calculateFileTypeUsageScore(meta),
    stateManagement: calculateFileStateScore(meta),
    performance: calculateFilePerformanceScore(meta)
  };
}

function calculateFileStructureScore(meta: FileMetadata): number {
  let score = 40;

  // 복잡도
  if (meta.complexity === 'trivial') score += 25;
  else if (meta.complexity === 'low') score += 20;
  else if (meta.complexity === 'medium') score += 12;

  // 코드 크기
  if (meta.linesOfCode < 100) score += 15;
  else if (meta.linesOfCode < 200) score += 10;
  else if (meta.linesOfCode < 300) score += 5;

  // Category 명확성
  if (meta.category && meta.category !== 'other') score += 10;

  // 패턴 사용
  if (meta.patterns && meta.patterns.length > 0) {
    score += Math.min(10, meta.patterns.length * 3);
  }

  return Math.min(100, score);
}

function calculateFileApiScore(meta: FileMetadata): number {
  let score = 25;

  // API 타입
  if (meta.apiType && meta.apiType !== 'none') {
    score += 40;
    if (meta.apiType === 'grpc') score += 10;
  }

  // API 메서드
  if (meta.apiMethods && meta.apiMethods.length > 0) {
    score += Math.min(20, meta.apiMethods.length * 4);
  }

  // Category가 api면 보너스
  if (meta.category === 'api') score += 5;

  return Math.min(100, score);
}

function calculateFileDesignSystemScore(meta: FileMetadata): number {
  let score = 30;

  // 디자인 시스템
  if (meta.designSystem) score += 45;

  // UI 프레임워크
  if (meta.frameworks) {
    const uiFrameworks = meta.frameworks.filter(f =>
      f.includes('element') || f.includes('vuetify') || f.includes('ui')
    );
    score += Math.min(15, uiFrameworks.length * 8);
  }

  // Category
  if (meta.category === 'page') score += 10;

  return Math.min(100, score);
}

function calculateFileUtilityScore(meta: FileMetadata): number {
  let score = 25;

  // 유틸리티 라이브러리
  if (meta.utilityLibrary) score += 45;

  // Dependencies
  if (meta.dependencies) {
    const utilDeps = meta.dependencies.filter(d =>
      d.includes('lodash') || d.includes('date-fns') || d.includes('vueuse')
    );
    score += Math.min(20, utilDeps.length * 10);
  }

  // Category
  if (meta.category === 'utility' || meta.category === 'composable') score += 10;

  return Math.min(100, score);
}

function calculateFileErrorHandlingScore(meta: FileMetadata): number {
  let score = 30;

  // Error handling level
  if (meta.errorHandling === 'comprehensive') score += 45;
  else if (meta.errorHandling === 'basic') score += 25;

  // 패턴
  const errorPatterns = meta.patterns.filter(p =>
    p.includes('error') || p.includes('try-catch') || p.includes('exception')
  );
  score += Math.min(25, errorPatterns.length * 10);

  return Math.min(100, score);
}

function calculateFileTypeUsageScore(meta: FileMetadata): number {
  let score = 40;

  // Type definitions quality
  if (meta.typeDefinitions === 'excellent') score += 40;
  else if (meta.typeDefinitions === 'good') score += 28;
  else if (meta.typeDefinitions === 'basic') score += 15;

  // Patterns
  const typePatterns = meta.patterns.filter(p =>
    p.includes('type') || p.includes('interface') || p.includes('generic')
  );
  score += Math.min(20, typePatterns.length * 7);

  return Math.min(100, score);
}

function calculateFileStateScore(meta: FileMetadata): number {
  let score = 35;

  // Frameworks
  if (meta.frameworks.some(f => f.includes('pinia'))) score += 30;
  else if (meta.frameworks.some(f => f.includes('vuex'))) score += 20;

  // Composables used
  if (meta.composablesUsed && meta.composablesUsed.length > 0) {
    score += Math.min(20, meta.composablesUsed.length * 4);
  }

  // Category
  if (meta.category === 'composable') score += 15;

  return Math.min(100, score);
}

function calculateFilePerformanceScore(meta: FileMetadata): number {
  let score = 45;

  // 복잡도
  if (meta.complexity === 'trivial' || meta.complexity === 'low') score += 25;
  else if (meta.complexity === 'medium') score += 15;

  // 코드 크기
  if (meta.linesOfCode < 150) score += 15;
  else if (meta.linesOfCode < 250) score += 10;

  // 성능 패턴
  const perfPatterns = meta.patterns.filter(p =>
    p.includes('lazy') || p.includes('computed') || p.includes('memo')
  );
  score += Math.min(15, perfPatterns.length * 7);

  return Math.min(100, score);
}

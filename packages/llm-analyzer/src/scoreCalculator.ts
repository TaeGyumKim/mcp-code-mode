/**
 * 메타데이터 기반 다차원 점수 계산기 (간소화 버전)
 *
 * MetadataAnalyzer 결과를 기반으로 8가지 품질 항목을 자동 평가합니다.
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

function calculateProjectScores(meta: ProjectMetadata): BestCaseScores {
  return {
    // 구조: 파일 수, 카테고리 다양성
    structure: Math.min(100, 50 + (Object.keys(meta.filesByCategory).length * 10)),

    // API 연결: API 타입, 메서드 수
    apiConnection: meta.apiType && meta.apiType !== 'none'
      ? Math.min(100, 60 + (meta.apiMethods.length * 2))
      : 30,

    // 디자인 시스템: 감지 여부
    designSystem: meta.designSystem ? 80 : 40,

    // 유틸리티: 라이브러리 수
    utilityUsage: meta.utilityLibrary
      ? 70
      : meta.dependencies.length > 0
      ? 50
      : 30,

    // 에러 핸들링: 우수 파일 비율
    errorHandling: meta.totalFiles > 0
      ? Math.min(100, 40 + (meta.filesWithGoodErrorHandling / meta.totalFiles) * 60)
      : 40,

    // 타입 사용: 우수 타입 파일 비율
    typeUsage: meta.totalFiles > 0
      ? Math.min(100, 50 + (meta.filesWithGoodTypes / meta.totalFiles) * 50)
      : 50,

    // 상태 관리: composables 수
    stateManagement: Math.min(100, 40 + (meta.composablesUsed.length * 5)),

    // 성능: 복잡도 기준
    performance: meta.averageComplexity === 'low' || meta.averageComplexity === 'trivial'
      ? 80
      : meta.averageComplexity === 'medium'
      ? 65
      : 50
  };
}

function calculateFileScores(meta: FileMetadata): BestCaseScores {
  return {
    structure: meta.complexity === 'trivial' || meta.complexity === 'low' ? 80 : 60,
    apiConnection: meta.apiType && meta.apiType !== 'none' ? 70 : 30,
    designSystem: meta.designSystem ? 80 : 40,
    utilityUsage: meta.utilityLibrary ? 70 : 40,
    errorHandling: meta.errorHandling === 'comprehensive' ? 90 : meta.errorHandling === 'basic' ? 60 : 30,
    typeUsage: meta.typeDefinitions === 'excellent' ? 90 : meta.typeDefinitions === 'good' ? 70 : 50,
    stateManagement: meta.category === 'composable' ? 80 : 50,
    performance: meta.complexity === 'trivial' || meta.complexity === 'low' ? 80 : 60
  };
}

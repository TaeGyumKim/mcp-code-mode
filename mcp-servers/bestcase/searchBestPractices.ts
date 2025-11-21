/**
 * BestCase 우수 사례 검색 (다차원 점수 기반)
 *
 * 동적 임계값 조정 + Fallback 로직 포함
 * mcp-stdio-server.ts에서 분리된 모듈
 */

import {
  FileCaseStorage,
  type FileCase,
  type BestCaseScores
} from '../../packages/bestcase-db/dist/index.js';
import { inferImportantDimensionsV2, type WeightedKeyword } from './dimensionKeywords.js';

const storage = new FileCaseStorage();

export interface SearchBestPracticesInput {
  /**
   * 검색할 차원 (중요도 순)
   */
  dimensions: Array<keyof BestCaseScores>;

  /**
   * 차원별 임계값
   */
  dimensionThresholds: Record<keyof BestCaseScores, number>;

  /**
   * 차원별 하한선 (선택 사항)
   */
  dimensionFloors?: Partial<Record<keyof BestCaseScores, number>>;

  /**
   * 전역 하한선 (기본값: 50)
   */
  minFloor?: number;

  /**
   * 동적 임계값 조정 활성화 (기본값: true)
   */
  enableDynamicThreshold?: boolean;

  /**
   * 키워드 필터 (선택 사항)
   */
  keywords?: string[];

  /**
   * 파일 역할 필터 (선택 사항)
   */
  fileRole?: string;

  /**
   * 프로젝트 필터 (선택 사항)
   */
  projectName?: string;

  /**
   * 최대 결과 수 (기본값: 5)
   */
  maxResults?: number;
}

export interface SearchBestPracticesOutput {
  examples: Array<{
    id: string;
    projectName: string;
    filePath: string;
    fileRole: string;
    excellentIn: Array<keyof BestCaseScores>;
    excellentDetails: Array<{
      dimension: keyof BestCaseScores;
      score: number;
      threshold: number;
      reason: string;
    }>;
    topScore: number;
    scores: Partial<BestCaseScores>;
    keywords: string[];
    content: string;
    analysis: {
      linesOfCode: number;
      apiMethods: string[];
      componentsUsed: string[];
      patterns: string[];
    };
    // Fallback 메타데이터 (선택적)
    fallbackSelected?: boolean;
    fallbackRank?: number;
    fallbackAvgScore?: number;
    fallbackTotalFiles?: number;
  }>;
  searchMetadata: {
    dimensionsSearched: Array<keyof BestCaseScores>;
    thresholdsUsed: Record<keyof BestCaseScores, number>;
    candidateCount: number;
    cacheHit: boolean;
    fallbackUsed: boolean;
    fallbackCount: number;
    fallbackPercentile?: number;
  };
}

// Re-export dimension inference functions from dimensionKeywords.ts
export { inferImportantDimensionsV2, type WeightedKeyword } from './dimensionKeywords.js';

/**
 * 다차원 점수 기반 우수 코드 검색
 *
 * 동적 임계값 조정 + Fallback 로직 포함
 */
export async function searchBestPractices(
  input: SearchBestPracticesInput
): Promise<SearchBestPracticesOutput> {
  const {
    dimensions,
    dimensionThresholds,
    dimensionFloors = {},
    minFloor = 50,
    enableDynamicThreshold = true,
    keywords,
    fileRole,
    projectName,
    maxResults = 5
  } = input;

  // 1. 후보 파일 가져오기 (키워드 기반 필터링)
  const query: any = {
    keywords,
    fileRole,
    projectName,
    limit: 1000  // 충분한 후보 확보
  };

  const candidates = await storage.search(query);

  if (candidates.length === 0) {
    return {
      examples: [],
      searchMetadata: {
        dimensionsSearched: dimensions,
        thresholdsUsed: dimensionThresholds,
        candidateCount: 0,
        cacheHit: false,
        fallbackUsed: false,
        fallbackCount: 0
      }
    };
  }

  // 2. 동적 임계값 조정
  const effectiveThresholds = { ...dimensionThresholds };
  const avgScores: Record<keyof BestCaseScores, number> = {
    apiConnection: 0,
    errorHandling: 0,
    typeUsage: 0,
    stateManagement: 0,
    designSystem: 0,
    structure: 0,
    performance: 0,
    utilityUsage: 0
  };

  if (enableDynamicThreshold && candidates.length > 0) {
    for (const dimension of dimensions) {
      const scores = candidates.map((fc: any) => fc.scores[dimension] || 0);
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      avgScores[dimension] = avg;

      const dimFloor = dimensionFloors[dimension] ?? minFloor;

      // 평균이 임계값보다 낮으면 동적으로 조정
      if (avg < dimensionThresholds[dimension]) {
        const dynamicAdjusted = Math.max(avg * 1.1, avg + 10);
        const withFloor = Math.max(dynamicAdjusted, dimFloor);

        // ✅ 임계값은 완화 방향으로만 조정
        const relaxedThreshold = Math.min(dimensionThresholds[dimension], withFloor);

        if (relaxedThreshold < dimensionThresholds[dimension]) {
          effectiveThresholds[dimension] = relaxedThreshold;
          console.error(`[searchBestPractices] Threshold relaxed: ${dimension} ${dimensionThresholds[dimension]} → ${relaxedThreshold}`);
        }
      }
    }
  }

  // 3. 임계값 기반 필터링
  const fileScores: Map<string, {
    fileCase: FileCase;
    excellentDimensions: Array<{
      dimension: keyof BestCaseScores;
      score: number;
      threshold: number;
      reason: string;
    }>;
    topScore: number;
    fallbackSelected?: boolean;
    fallbackRank?: number;
    fallbackAvgScore?: number;
    fallbackTotalFiles?: number;
  }> = new Map();

  for (const fileCase of candidates) {
    const excellentDimensions: Array<{
      dimension: keyof BestCaseScores;
      score: number;
      threshold: number;
      reason: string;
    }> = [];
    let topScore = 0;

    for (const dimension of dimensions) {
      const score = fileCase.scores[dimension] || 0;
      const threshold = effectiveThresholds[dimension];

      if (score >= threshold) {
        excellentDimensions.push({
          dimension,
          score,
          threshold,
          reason: `${dimension}: ${score} (threshold: ${threshold})`
        });
        topScore = Math.max(topScore, score);
      }
    }

    if (excellentDimensions.length > 0) {
      fileScores.set(fileCase.id, {
        fileCase,
        excellentDimensions,
        topScore
      });
    }
  }

  // 4. Fallback: 임계값을 충족하는 파일이 없으면 상위 10% 선택
  if (fileScores.size === 0 && enableDynamicThreshold) {
    console.error('[searchBestPractices] Fallback: No files above threshold, selecting top 10%');

    const percentile = Math.ceil(candidates.length * 0.1);
    const sortedByAvg = candidates
      .map((fc: any) => ({
        fileCase: fc,
        avgScore: dimensions.reduce((sum, dim) => sum + (fc.scores[dim] || 0), 0) / dimensions.length
      }))
      .sort((a: any, b: any) => b.avgScore - a.avgScore)
      .slice(0, percentile);

    for (const { fileCase, avgScore } of sortedByAvg) {
      const excellentDimensions: Array<{
        dimension: keyof BestCaseScores;
        score: number;
        threshold: number;
        reason: string;
      }> = [];
      let topScore = 0;

      // ✅ Fallback에서도 각 차원의 상대적 우수성 판단
      for (const dimension of dimensions) {
        const score = fileCase.scores[dimension] || 0;
        const threshold = effectiveThresholds[dimension];

        // 해당 차원에서의 상대적 순위 계산
        const dimensionScores = candidates
          .map((fc: any) => fc.scores[dimension] || 0)
          .sort((a: number, b: number) => b - a);
        const rank = dimensionScores.indexOf(score);
        const percentile = (1 - rank / dimensionScores.length) * 100;

        // ✅ 조건: 상위 50% 이상이거나 평균 이상인 차원만 포함
        const dimAvg = avgScores[dimension];
        const isExcellent = percentile >= 50 || score >= dimAvg;

        if (isExcellent) {
          excellentDimensions.push({
            dimension,
            score,
            threshold,
            reason: `${dimension}: ${score} (top ${percentile.toFixed(1)}% in fallback, avg: ${dimAvg.toFixed(1)})`
          });
        }
        topScore = Math.max(topScore, score);
      }

      // ✅ Fallback 메타데이터 추가
      const fallbackRank = sortedByAvg.findIndex(item => item.fileCase.id === fileCase.id) + 1;
      fileScores.set(fileCase.id, {
        fileCase,
        excellentDimensions,
        topScore,
        fallbackSelected: true,
        fallbackRank,
        fallbackAvgScore: avgScore,
        fallbackTotalFiles: sortedByAvg.length
      });
    }
  }

  // 5. 점수순 정렬 및 결과 생성
  const sortedResults = Array.from(fileScores.values())
    .sort((a, b) => b.topScore - a.topScore);

  const results = sortedResults.slice(0, maxResults).map((entry) => {
    const { fileCase, excellentDimensions, topScore, fallbackSelected, fallbackRank, fallbackAvgScore, fallbackTotalFiles } = entry as any;

    return {
      id: fileCase.id,
      projectName: fileCase.projectName,
      filePath: fileCase.filePath,
      fileRole: fileCase.fileRole,
      excellentIn: excellentDimensions.map((ed: any) => ed.dimension),
      excellentDetails: excellentDimensions,
      topScore,
      scores: {
        ...Object.fromEntries(dimensions.map(dim => [dim, fileCase.scores[dim] || 0]))
      },
      keywords: fileCase.keywords.slice(0, 10),
      content: fileCase.content,
      analysis: {
        linesOfCode: fileCase.analysis.linesOfCode,
        apiMethods: fileCase.analysis.apiMethods,
        componentsUsed: fileCase.analysis.componentsUsed,
        patterns: fileCase.analysis.patterns
      },
      // ✅ Fallback 메타데이터 (선택된 경우에만 포함)
      ...(fallbackSelected ? {
        fallbackSelected: true,
        fallbackRank,
        fallbackAvgScore,
        fallbackTotalFiles
      } : {})
    };
  });

  // 6. 검색 메타데이터 생성
  const fallbackUsed = results.some(r => r.fallbackSelected);
  const fallbackCount = results.filter(r => r.fallbackSelected).length;

  const searchMetadata = {
    dimensionsSearched: dimensions,
    thresholdsUsed: Object.fromEntries(
      dimensions.map(d => [d, effectiveThresholds[d]])
    ) as Record<keyof BestCaseScores, number>,
    candidateCount: candidates.length,
    cacheHit: false,
    fallbackUsed,
    fallbackCount,
    fallbackPercentile: fallbackUsed ? Math.ceil(candidates.length * 0.1) : undefined
  };

  console.error('[searchBestPractices] Results:', {
    candidates: candidates.length,
    found: results.length,
    fallbackUsed,
    thresholds: effectiveThresholds
  });

  return { examples: results, searchMetadata };
}

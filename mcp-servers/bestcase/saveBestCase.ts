import {
  BestCaseStorage,
  type BestCase,
  calculateWeightedScore,
  getExcellentCategories,
  shouldSaveBestCase
} from '../../packages/bestcase-db/dist/index.js';
import {
  calculateScoresFromMetadata,
  SCORING_VERSION,
  type ProjectMetadata
} from '../../packages/llm-analyzer/dist/index.js';

const storage = new BestCaseStorage();

interface SaveBestCaseInput {
  projectName: string;
  category: string;
  description: string;
  files: Array<{
    path: string;
    content: string;
    purpose: string;
  }>;
  patterns?: { [key: string]: any };
  tags?: string[];
}

interface SaveBestCaseOutput {
  id: string;
  success: boolean;
  /** 계산된 다차원 점수 */
  scores?: {
    structure: number;
    apiConnection: number;
    designSystem: number;
    utilityUsage: number;
    errorHandling: number;
    typeUsage: number;
    stateManagement: number;
    performance: number;
  };
  /** 가중 평균 총점 */
  totalScore?: number;
  /** 우수 영역 */
  excellentIn?: string[];
  /** 저장 기준 판정 결과 */
  saveDecision?: {
    shouldSave: boolean;
    reason: string;
  };
}

/**
 * 프로젝트의 BestCase를 저장합니다 (다차원 점수 자동 계산)
 *
 * patterns에 ProjectMetadata가 포함된 경우, 다차원 점수를 자동으로 계산하고
 * 저장 기준(totalScore >= 40 OR excellentIn.length > 0)을 만족하면 저장합니다.
 *
 * @example
 * // 기본 사용법
 * const result = await bestcase.saveBestCase({
 *   projectName: 'myapp',
 *   category: 'typescript-config',
 *   description: 'TypeScript 프로젝트 설정',
 *   files: [
 *     {
 *       path: 'tsconfig.json',
 *       content: '{ "compilerOptions": {...} }',
 *       purpose: 'TypeScript 컴파일러 설정'
 *     }
 *   ],
 *   tags: ['typescript', 'config']
 * });
 *
 * @example
 * // ProjectMetadata와 함께 사용 (자동 점수 계산)
 * const result = await bestcase.saveBestCase({
 *   projectName: 'ecommerce-frontend',
 *   category: 'auto-scan',
 *   description: 'Auto-scanned project',
 *   files: [],
 *   patterns: {
 *     metadata: {
 *       projectName: 'ecommerce-frontend',
 *       totalFiles: 120,
 *       apiType: 'grpc',
 *       frameworks: ['vue3', 'pinia'],
 *       // ... other metadata fields
 *     }
 *   },
 *   tags: ['auto-scan', 'vue3']
 * });
 *
 * if (result.success) {
 *   console.log(`Saved with total score: ${result.totalScore}/100`);
 *   console.log(`Excellent in: ${result.excellentIn?.join(', ')}`);
 * } else {
 *   console.log(`Not saved: ${result.saveDecision?.reason}`);
 * }
 */
export async function saveBestCase(input: SaveBestCaseInput): Promise<SaveBestCaseOutput> {
  // 프로젝트명에서 슬래시를 대시로 변환
  const sanitizedProjectName = input.projectName.replace(/\//g, '-').replace(/\\/g, '-');
  const id = `${sanitizedProjectName}-${input.category}-${Date.now()}`;

  // 다차원 점수 계산 (patterns.metadata가 ProjectMetadata인 경우)
  let scores;
  let totalScore;
  let excellentIn;
  let saveDecision;

  const metadata = input.patterns?.metadata as ProjectMetadata | undefined;
  if (metadata && metadata.projectName && metadata.totalFiles !== undefined) {
    console.error('[saveBestCase] Calculating multi-dimensional scores...');

    // 점수 계산
    scores = calculateScoresFromMetadata(metadata, true);
    totalScore = calculateWeightedScore(scores);
    excellentIn = getExcellentCategories(scores);

    console.error('[saveBestCase] Scores calculated:', {
      totalScore,
      excellentIn,
      scores
    });

    // 저장 기준 판정
    saveDecision = shouldSaveBestCase(scores);

    console.error('[saveBestCase] Save decision:', saveDecision);

    // 기준을 만족하지 못하면 저장하지 않음
    if (!saveDecision.shouldSave) {
      return {
        id,
        success: false,
        scores,
        totalScore,
        excellentIn,
        saveDecision
      };
    }
  }

  // BestCase 객체 생성
  const bestCase: BestCase = {
    id,
    projectName: input.projectName,
    category: input.category,
    description: input.description,
    files: input.files,
    patterns: input.patterns || {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: input.tags || []
    }
  };

  // 계산된 점수 추가
  if (scores) {
    bestCase.scores = scores;
    // 점수가 계산되면 현재 계산 로직 버전도 저장
    bestCase.scoringVersion = SCORING_VERSION;
  }
  if (totalScore !== undefined) {
    bestCase.totalScore = totalScore;
  }
  if (excellentIn) {
    bestCase.excellentIn = excellentIn;
  }

  // 저장
  await storage.save(bestCase);

  console.error('[saveBestCase] BestCase saved successfully:', id);

  return {
    id,
    success: true,
    scores,
    totalScore,
    excellentIn,
    saveDecision
  };
}
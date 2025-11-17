/**
 * 파일 단위 BestCase 저장 (v3.0)
 *
 * 점수와 상관없이 모든 파일을 저장합니다.
 * 키워드 기반 검색을 위해 자동으로 키워드를 추출합니다.
 */

import {
  FileCaseStorage,
  type FileCase,
  filePathToId,
  inferFileType,
  inferFileRole,
  extractKeywords
} from '../../packages/bestcase-db/dist/index.js';
import {
  calculateScoresFromMetadata,
  SCORING_VERSION,
  type FileMetadata
} from '../../packages/llm-analyzer/dist/index.js';

const storage = new FileCaseStorage();

interface SaveFileCaseInput {
  projectName: string;
  filePath: string;
  content: string;

  /**
   * 파일 메타데이터 (llm-analyzer의 FileMetadata)
   * 이 정보로 점수를 계산합니다.
   */
  fileMetadata?: FileMetadata;

  /**
   * 추가 키워드 (자동 추출 외)
   */
  additionalKeywords?: string[];

  /**
   * 추가 태그
   */
  tags?: string[];

  /**
   * API 메서드 목록
   */
  apiMethods?: string[];

  /**
   * 사용된 컴포넌트
   */
  componentsUsed?: string[];

  /**
   * 사용된 composables
   */
  composablesUsed?: string[];

  /**
   * 패턴 목록
   */
  patterns?: string[];

  /**
   * 엔티티 목록
   */
  entities?: string[];
}

interface SaveFileCaseOutput {
  id: string;
  success: boolean;
  /**
   * 추출된 키워드
   */
  keywords: string[];
  /**
   * 계산된 점수 (가중치 없음)
   */
  scores: {
    structure: number;
    apiConnection: number;
    designSystem: number;
    utilityUsage: number;
    errorHandling: number;
    typeUsage: number;
    stateManagement: number;
    performance: number;
  };
  /**
   * 파일 타입
   */
  fileType: string;
  /**
   * 파일 역할
   */
  fileRole: string;
}

/**
 * 파일 단위로 BestCase를 저장합니다.
 *
 * 점수와 상관없이 모든 파일을 저장하며, 자동으로 키워드를 추출합니다.
 * 검색 시 키워드나 특정 항목의 점수를 기준으로 찾을 수 있습니다.
 *
 * @example
 * // 기본 사용법
 * const result = await bestcase.saveFileCase({
 *   projectName: 'myapp',
 *   filePath: 'pages/users/index.vue',
 *   content: '<template>...</template>',
 *   apiMethods: ['grpc.UserService.list'],
 *   componentsUsed: ['ElTable', 'ElButton'],
 *   entities: ['User']
 * });
 *
 * console.log(result.keywords);  // ['search', 'list', 'table', 'grpc']
 * console.log(result.scores);    // { structure: 75, apiConnection: 85, ... }
 *
 * @example
 * // FileMetadata와 함께 사용 (자동 점수 계산)
 * const result = await bestcase.saveFileCase({
 *   projectName: 'ecommerce',
 *   filePath: 'pages/products/[id].vue',
 *   content: vueFileContent,
 *   fileMetadata: {
 *     fileName: '[id].vue',
 *     complexity: 'medium',
 *     patterns: ['error-boundary', 'loading-state'],
 *     // ...
 *   }
 * });
 */
export async function saveFileCase(input: SaveFileCaseInput): Promise<SaveFileCaseOutput> {
  const id = filePathToId(input.projectName, input.filePath);
  const fileType = inferFileType(input.filePath);
  const fileRole = inferFileRole(input.filePath);

  // 키워드 자동 추출
  const autoKeywords = extractKeywords(input.content, input.filePath);
  const allKeywords = Array.from(new Set([...autoKeywords, ...(input.additionalKeywords || [])]));

  // 점수 계산 (FileMetadata가 있으면 사용, 없으면 기본값)
  let scores = {
    structure: 50,
    apiConnection: 50,
    designSystem: 50,
    utilityUsage: 50,
    errorHandling: 50,
    typeUsage: 50,
    stateManagement: 50,
    performance: 50
  };

  if (input.fileMetadata) {
    scores = calculateScoresFromMetadata(input.fileMetadata, false);
  } else {
    // 간단한 휴리스틱 기반 점수 계산
    scores = calculateSimpleScores(input.content, allKeywords, input);
  }

  // FileCase 생성
  const fileCase: FileCase = {
    id,
    projectName: input.projectName,
    filePath: input.filePath,
    fileType,
    fileRole,
    content: input.content,
    keywords: allKeywords,
    scores,
    scoringVersion: SCORING_VERSION,
    analysis: {
      linesOfCode: input.content.split('\n').length,
      apiMethods: input.apiMethods || [],
      componentsUsed: input.componentsUsed || [],
      composablesUsed: input.composablesUsed || [],
      patterns: input.patterns || [],
      entities: input.entities || []
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
      tags: input.tags || []
    }
  };

  // 저장 (점수와 상관없이 모든 파일 저장)
  await storage.save(fileCase);

  console.error('[saveFileCase] File saved:', id);
  console.error('[saveFileCase] Keywords:', allKeywords);
  console.error('[saveFileCase] Scores:', scores);

  return {
    id,
    success: true,
    keywords: allKeywords,
    scores,
    fileType,
    fileRole
  };
}

/**
 * 간단한 휴리스틱 기반 점수 계산
 */
function calculateSimpleScores(
  content: string,
  keywords: string[],
  input: SaveFileCaseInput
): {
  structure: number;
  apiConnection: number;
  designSystem: number;
  utilityUsage: number;
  errorHandling: number;
  typeUsage: number;
  stateManagement: number;
  performance: number;
} {
  const lines = content.split('\n').length;
  const lowerContent = content.toLowerCase();

  // 기본 점수
  let structure = 40;
  let apiConnection = 30;
  let designSystem = 30;
  let utilityUsage = 30;
  let errorHandling = 30;
  let typeUsage = 30;
  let stateManagement = 30;
  let performance = 40;

  // 구조 점수
  if (lines > 50 && lines < 500) structure += 20; // 적절한 파일 크기
  if (content.includes('export default')) structure += 10;
  if (content.includes('<script setup')) structure += 15;
  if (content.includes('defineProps')) structure += 5;
  if (content.includes('defineEmits')) structure += 5;

  // API 연결 점수
  if (input.apiMethods && input.apiMethods.length > 0) {
    apiConnection += input.apiMethods.length * 10;
  }
  if (keywords.includes('grpc')) apiConnection += 15;
  if (keywords.includes('rest')) apiConnection += 10;
  if (lowerContent.includes('usegrpc') || lowerContent.includes('useapi')) apiConnection += 10;

  // 디자인 시스템 점수
  if (input.componentsUsed && input.componentsUsed.length > 0) {
    designSystem += input.componentsUsed.length * 5;
  }
  if (lowerContent.includes('el-') || lowerContent.includes('eltable')) designSystem += 15;
  if (lowerContent.includes('scss') || lowerContent.includes('style')) designSystem += 10;

  // 유틸리티 점수
  if (input.composablesUsed && input.composablesUsed.length > 0) {
    utilityUsage += input.composablesUsed.length * 10;
  }
  if (lowerContent.includes('lodash') || lowerContent.includes('datefns')) utilityUsage += 15;

  // 에러 핸들링 점수
  if (keywords.includes('error-handling')) errorHandling += 30;
  if (lowerContent.includes('try') && lowerContent.includes('catch')) errorHandling += 20;
  if (lowerContent.includes('onerror') || lowerContent.includes('error:')) errorHandling += 10;

  // 타입 사용 점수
  if (content.includes('interface ') || content.includes('type ')) typeUsage += 20;
  if (content.includes(': string') || content.includes(': number')) typeUsage += 15;
  if (!content.includes(': any')) typeUsage += 10;

  // 상태 관리 점수
  if (keywords.includes('state-management')) stateManagement += 20;
  if (lowerContent.includes('pinia') || lowerContent.includes('usestore')) stateManagement += 25;
  if (input.composablesUsed && input.composablesUsed.some(c => c.startsWith('use'))) {
    stateManagement += 10;
  }

  // 성능 점수
  if (keywords.includes('async')) performance += 10;
  if (lowerContent.includes('computed')) performance += 15;
  if (lowerContent.includes('lazy') || lowerContent.includes('defineAsyncComponent')) performance += 15;
  if (lowerContent.includes('memo') || lowerContent.includes('cache')) performance += 10;

  // 점수 정규화 (0-100)
  return {
    structure: Math.min(100, structure),
    apiConnection: Math.min(100, apiConnection),
    designSystem: Math.min(100, designSystem),
    utilityUsage: Math.min(100, utilityUsage),
    errorHandling: Math.min(100, errorHandling),
    typeUsage: Math.min(100, typeUsage),
    stateManagement: Math.min(100, stateManagement),
    performance: Math.min(100, performance)
  };
}

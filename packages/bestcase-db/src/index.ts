export { BestCaseStorage, type BestCase } from './storage.js';
export {
  type BestCaseScores,
  type ScoreGrade,
  type ScoreCategoryMeta,
  SCORE_THRESHOLDS,
  SAVE_CRITERIA,
  SCORE_CATEGORIES,
  getScoreGrade,
  calculateWeightedScore,
  getExcellentCategories,
  shouldSaveBestCase
} from './types.js';
export {
  type BestCaseIndex,
  type IndexSearchQuery,
  buildIndex,
  searchIndex,
  getIndexStats
} from './indexer.js';

// 파일 단위 BestCase (v3.0)
export {
  FileCaseStorage,
  type FileCase,
  type FileCaseQuery,
  filePathToId,
  inferFileType,
  inferFileRole,
  extractKeywords
} from './fileCase.js';
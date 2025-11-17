#!/usr/bin/env node
/**
 * MCP STDIO Server
 *
 * VS Code MCP Extension과 stdio 프로토콜로 통신하는 서버
 * Docker 컨테이너 내부에서 실행됩니다.
 */

import { runAgentScript } from './packages/ai-runner/dist/agentRunner.js';
import { analyzeAndRecommend } from './mcp-servers/bestcase/autoRecommend.js';
import * as guides from './mcp-servers/guides/dist/index.js';
import { extractProjectContext } from './packages/ai-runner/dist/projectContext.js';
import { FileCaseStorage } from './packages/bestcase-db/dist/index.js';
import type { BestCaseScores } from './packages/bestcase-db/dist/index.js';
import * as readline from 'readline';
import * as fs from 'fs';

const _fileCaseStorage = new FileCaseStorage();

// 캐시 클리어 콜백 (나중에 설정됨)
let onFileCaseSaved: (() => void) | null = null;

/**
 * 캐시 일관성을 위한 FileCaseStorage 래퍼
 *
 * FileCase 저장/삭제 시 캐시를 자동으로 클리어하여 데이터 일관성을 보장합니다.
 */
const fileCaseStorage = {
  ..._fileCaseStorage,

  // save 시 캐시 클리어
  async save(fileCase: any): Promise<void> {
    await _fileCaseStorage.save(fileCase);
    // 캐시 클리어 - 새 데이터 반영을 위해
    if (onFileCaseSaved) onFileCaseSaved();
    process.stderr.write(`[${new Date().toISOString()}] FileCase saved, cache cleared for consistency: ${JSON.stringify({ id: fileCase.id })}\n`);
  },

  // delete 시 캐시 클리어
  async delete(id: string): Promise<boolean> {
    const result = await _fileCaseStorage.delete(id);
    if (result) {
      if (onFileCaseSaved) onFileCaseSaved();
      process.stderr.write(`[${new Date().toISOString()}] FileCase deleted, cache cleared for consistency: ${JSON.stringify({ id })}\n`);
    }
    return result;
  },

  // list는 캐시를 활용
  list: _fileCaseStorage.list.bind(_fileCaseStorage),
  load: _fileCaseStorage.load.bind(_fileCaseStorage),
  search: _fileCaseStorage.search.bind(_fileCaseStorage),
  findByKeywords: _fileCaseStorage.findByKeywords.bind(_fileCaseStorage),
  findByFunction: _fileCaseStorage.findByFunction.bind(_fileCaseStorage),
  findByMinScore: _fileCaseStorage.findByMinScore.bind(_fileCaseStorage),
  findByRole: _fileCaseStorage.findByRole.bind(_fileCaseStorage),
  findByEntity: _fileCaseStorage.findByEntity.bind(_fileCaseStorage),
  initialize: _fileCaseStorage.initialize.bind(_fileCaseStorage)
};

// ============= 캐싱 시스템 (LRU with size limits) =============
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;  // Time to live in milliseconds
  lastAccess: number;  // For LRU eviction
}

// Environment variable controlled cache settings
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);  // 5분 기본
const CACHE_MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES || '100', 10);  // 최대 100개 엔트리

const cache = new Map<string, CacheEntry<unknown>>();
const cacheAccessOrder: string[] = [];  // LRU 순서 추적용

/**
 * LRU 기반 캐시 정리 - 최대 엔트리 수 초과 시 가장 오래된 항목 제거
 * 최적화: 별도 배열로 접근 순서 추적하여 O(n) 정렬 회피
 */
function evictLRU(): void {
  while (cache.size > CACHE_MAX_ENTRIES && cacheAccessOrder.length > 0) {
    const oldestKey = cacheAccessOrder.shift();
    if (oldestKey && cache.has(oldestKey)) {
      cache.delete(oldestKey);
      log('LRU cache eviction', { key: oldestKey });
    }
  }
}

/**
 * 캐시 접근 순서 업데이트
 */
function updateAccessOrder(key: string): void {
  const index = cacheAccessOrder.indexOf(key);
  if (index > -1) {
    cacheAccessOrder.splice(index, 1);
  }
  cacheAccessOrder.push(key);
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    const index = cacheAccessOrder.indexOf(key);
    if (index > -1) cacheAccessOrder.splice(index, 1);
    return null;
  }

  // LRU: 접근 시간 업데이트
  entry.lastAccess = now;
  updateAccessOrder(key);
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  const now = Date.now();

  // 이미 존재하면 접근 순서 갱신
  if (cache.has(key)) {
    updateAccessOrder(key);
  } else {
    cacheAccessOrder.push(key);
  }

  cache.set(key, {
    data,
    timestamp: now,
    ttl,
    lastAccess: now
  });

  // LRU 정리
  evictLRU();
}

function clearCache(): void {
  cache.clear();
  cacheAccessOrder.length = 0;
  log('Cache cleared');
}

/**
 * 캐시 통계 조회
 */
function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: cache.size,
    maxSize: CACHE_MAX_ENTRIES,
    ttlMs: CACHE_TTL
  };
}

// FileCaseStorage 저장 시 캐시 클리어 콜백 설정
onFileCaseSaved = clearCache;

// ============= 파일 시스템 감시자 (외부 BestCase 변경 감지) =============

// 감시자 상태 관리
let currentWatcher: fs.FSWatcher | null = null;
let watcherRetryCount = 0;
const MAX_WATCHER_RETRIES = 5;
const WATCHER_RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];  // 지수 백오프

/**
 * BestCase 저장소 디렉토리를 감시하여 외부 변경 시 캐시 무효화
 *
 * 외부 스크립트(예: scan-files-ai.ts)가 FileCaseStorage를 직접 사용하여
 * BestCase를 저장/삭제할 때도 캐시가 자동으로 무효화됩니다.
 */
function setupBestCaseWatcher(): void {
  const bestCasePath = process.env.BESTCASE_STORAGE_PATH || '/projects/.bestcases';

  // 디렉토리 존재 확인 및 자동 생성
  if (!fs.existsSync(bestCasePath)) {
    log('BestCase storage path does not exist, attempting to create', { path: bestCasePath });

    try {
      fs.mkdirSync(bestCasePath, { recursive: true });
      log('BestCase storage path created successfully', { path: bestCasePath });
    } catch (mkdirError) {
      const errorMsg = mkdirError instanceof Error ? mkdirError.message : String(mkdirError);
      log('Failed to create BestCase storage path', {
        path: bestCasePath,
        error: errorMsg,
        hint: 'Ensure the parent directory exists and has write permissions. The watcher will not start until the path is available.'
      });
      return;
    }
  }

  try {
    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = fs.watch(bestCasePath, { persistent: false }, (eventType, filename) => {
      // .json 파일 변경만 감지 (인덱스 파일 제외)
      if (filename && filename.endsWith('.json') && !filename.includes('index')) {
        // 디바운싱: 연속적인 변경을 하나로 처리
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          log('External BestCase change detected, clearing cache', {
            eventType,
            filename
          });
          clearCache();
          debounceTimer = null;
        }, 1000);  // 1초 디바운스
      }
    });

    watcher.on('error', (error) => {
      log('BestCase watcher error', { error: error.message });

      // 오류 복구: 감시자 재시작 시도
      if (watcherRetryCount < MAX_WATCHER_RETRIES) {
        const delay = WATCHER_RETRY_DELAYS[watcherRetryCount] || 16000;
        watcherRetryCount++;

        log('Attempting to restart BestCase watcher', {
          attempt: watcherRetryCount,
          maxAttempts: MAX_WATCHER_RETRIES,
          delayMs: delay
        });

        // 기존 감시자 정리
        watcher.close();
        currentWatcher = null;

        // 지연 후 재시작
        setTimeout(() => {
          setupBestCaseWatcher();
        }, delay);
      } else {
        log('BestCase watcher max retries reached, giving up', {
          totalAttempts: watcherRetryCount,
          hint: 'Cache invalidation for external changes will not work. Restart the server to retry.'
        });
      }
    });

    currentWatcher = watcher;
    watcherRetryCount = 0;  // 성공 시 재시도 카운트 초기화
    log('BestCase watcher started', { path: bestCasePath });

    // 프로세스 종료 시 감시자 정리
    process.on('exit', () => {
      if (currentWatcher) {
        currentWatcher.close();
        currentWatcher = null;
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('Failed to setup BestCase watcher', { error: errorMsg });

    // 설정 실패 시 재시도
    if (watcherRetryCount < MAX_WATCHER_RETRIES) {
      const delay = WATCHER_RETRY_DELAYS[watcherRetryCount] || 16000;
      watcherRetryCount++;

      log('Retrying BestCase watcher setup', {
        attempt: watcherRetryCount,
        maxAttempts: MAX_WATCHER_RETRIES,
        delayMs: delay
      });

      setTimeout(() => {
        setupBestCaseWatcher();
      }, delay);
    }
  }
}

// 서버 시작 시 감시자 설정
setupBestCaseWatcher();

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: Record<string, any>;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface ToolCallParams {
  name: string;
  arguments: Record<string, any>;
}

interface AutoRecommendOptions {
  currentFile: string;
  filePath: string;
  description: string;
  // NEW: 가이드 로딩 옵션
  maxGuides?: number;              // 최대 로드할 가이드 수 (기본: 5)
  maxGuideLength?: number;         // 최대 가이드 총 길이 (기본: 50000)
  mandatoryGuideIds?: string[];    // 필수 가이드 ID (기본: ['00-bestcase-priority'])
  skipGuideLoading?: boolean;      // 가이드 로딩 건너뛰기
  skipProjectContext?: boolean;    // 프로젝트 컨텍스트 분석 건너뛰기
  // NEW: 다차원 검색 옵션
  maxBestPractices?: number;       // 최대 우수 사례 수 (기본: 3, 0이면 비활성화)
  skipBestPracticeSearch?: boolean; // 다차원 검색 건너뛰기
  minScoreThreshold?: number | Partial<Record<keyof BestCaseScores, number>>;  // 단일 값 또는 차원별 임계값
  minScoreThresholdFloor?: number; // 동적 임계값 하한선 (기본: 50)
  enableDynamicThreshold?: boolean; // 동적 임계값 활성화 (기본: true)
  // NEW: 사용자 정의 키워드 및 강제 검색
  customKeywords?: Partial<Record<keyof BestCaseScores, string[]>>;  // 추가 키워드 병합
  forceBestPracticeSearch?: boolean;  // skipBestPracticeSearch 조건 무시하고 강제 검색
  // NEW: 결과 설명 옵션
  includeSelectionReasons?: boolean;  // 선택 이유 포함 (기본: true)
}

interface ExecuteParams {
  code: string;
  timeoutMs?: number;
  autoRecommend?: AutoRecommendOptions;
}

interface AutoContextResult {
  recommendations: any[];
  extractedKeywords: string[];
  guides: string;
  projectContext: any;
  warnings: string[];  // NEW: 경고 메시지 수집
  bestPracticeExamples: BestPracticeExample[];  // NEW: 다차원 점수 기반 우수 코드 예제
  searchMetadata?: {  // NEW: 검색 메타데이터 (임계값, 평균 점수 등)
    effectiveThresholds: Record<string, number>;
    candidatesCount: number;
    avgScores: Record<string, number>;
  } | null;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// ============= 로깅 및 보안 =============

// 환경 변수로 민감 데이터 마스킹 제어
const MASK_SENSITIVE_DATA = process.env.MASK_SENSITIVE_LOGS === 'true' || process.env.NODE_ENV === 'production';
const MAX_LOG_PREVIEW_LENGTH = parseInt(process.env.MAX_LOG_PREVIEW_LENGTH || '200', 10);

/**
 * 민감한 데이터 패턴 마스킹
 *
 * 운영 환경에서 로그에 민감한 정보가 노출되지 않도록 합니다.
 */
function maskSensitiveData(text: string): string {
  if (!MASK_SENSITIVE_DATA) return text;

  // 이메일 주소 마스킹
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_MASKED]');

  // API 키 패턴 마스킹 (일반적인 형식)
  text = text.replace(/\b(api[_-]?key|apikey|token|secret|password|auth)['":\s]*[=:]\s*['"]?[A-Za-z0-9_\-\.]{20,}['"]?/gi, '$1=[MASKED]');

  // Bearer 토큰 마스킹
  text = text.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [TOKEN_MASKED]');

  // JWT 토큰 마스킹 (xxx.xxx.xxx 형식)
  text = text.replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, '[JWT_MASKED]');

  // 신용카드 번호 패턴 마스킹
  text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_MASKED]');

  // 주민등록번호 패턴 마스킹 (한국)
  text = text.replace(/\b\d{6}[-]?\d{7}\b/g, '[SSN_MASKED]');

  return text;
}

/**
 * 로그용 안전한 미리보기 생성
 */
function safePreview(text: string, maxLength: number = MAX_LOG_PREVIEW_LENGTH): string {
  const truncated = text.length > maxLength
    ? text.substring(0, maxLength) + '...[truncated]'
    : text;

  return maskSensitiveData(truncated);
}

function log(message: string, data?: any): void {
  const timestamp = new Date().toISOString();

  // 데이터 내 민감 정보 마스킹
  let safeData = data;
  if (data && MASK_SENSITIVE_DATA) {
    try {
      const dataStr = JSON.stringify(data);
      safeData = JSON.parse(maskSensitiveData(dataStr));
    } catch {
      // JSON 변환 실패 시 원본 사용
      safeData = data;
    }
  }

  const logMessage = safeData
    ? `[${timestamp}] ${message}: ${JSON.stringify(safeData)}`
    : `[${timestamp}] ${message}`;
  process.stderr.write(logMessage + '\n');
}

function sendResponse(response: JsonRpcResponse): void {
  log('Sending response', { id: response.id, method: response.result ? 'success' : 'error' });
  process.stdout.write(JSON.stringify(response) + '\n');
}

// ============= 헬퍼 함수들 =============

/**
 * RAG 기반 코드 추천 가져오기
 */
async function fetchRecommendations(options: AutoRecommendOptions): Promise<{
  recommendations: any[];
  keywords: string[];
  warnings: string[];
}> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
  const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  const warnings: string[] = [];

  try {
    const ragResult = await analyzeAndRecommend({
      currentFile: options.currentFile,
      filePath: options.filePath,
      description: options.description,
      ollamaConfig: {
        url: ollamaUrl,
        embeddingModel: embeddingModel
      }
    });

    // RAG 내부 경고 수집
    if (ragResult.queryInfo.warnings) {
      warnings.push(...ragResult.queryInfo.warnings);
    }

    return {
      recommendations: ragResult.recommendations,
      keywords: ragResult.queryInfo.extractedKeywords,
      warnings
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('RAG fetch failed', { error: errorMsg });

    // 연결 실패 시 구체적인 경고 메시지
    let warning = `RAG recommendation failed: ${errorMsg}`;
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('fetch failed')) {
      warning = `Ollama server not available at ${ollamaUrl}. Ensure Ollama is running and OLLAMA_URL is correctly set. RAG features disabled.`;
    }

    warnings.push(warning);

    return {
      recommendations: [],
      keywords: [],
      warnings
    };
  }
}

/**
 * 추천 결과에서 키워드 및 API 타입 추론
 */
function analyzeRecommendations(recommendations: any[], extractedKeywords: string[]): {
  allKeywords: string[];
  apiType: 'grpc' | 'openapi' | 'any';
} {
  const allKeywords = new Set<string>(extractedKeywords);

  // 추천된 파일들에서 공통 키워드 추출
  recommendations.forEach((rec: any) => {
    if (rec.keywords) {
      rec.keywords.forEach((kw: string) => allKeywords.add(kw));
    }
    if (rec.analysis?.patterns) {
      rec.analysis.patterns.forEach((p: string) => allKeywords.add(p));
    }
  });

  // API 타입 추론
  let apiType: 'grpc' | 'openapi' | 'any' = 'any';
  for (const rec of recommendations) {
    if (rec.analysis?.apiMethods?.some((m: string) => m.includes('grpc'))) {
      apiType = 'grpc';
      break;
    }
    if (rec.keywords?.includes('grpc')) {
      apiType = 'grpc';
      break;
    }
    if (rec.keywords?.includes('rest') || rec.keywords?.includes('openapi')) {
      apiType = 'openapi';
      break;
    }
  }

  return {
    allKeywords: Array.from(allKeywords),
    apiType
  };
}

/**
 * 키워드 기반 가이드 자동 로딩
 */
async function loadGuidesForKeywords(
  keywords: string[],
  apiType: 'grpc' | 'openapi' | 'any',
  projectName: string,
  options: {
    maxGuides: number;
    maxLength: number;
    mandatoryIds: string[];
  }
): Promise<{
  combined: string;
  count: number;
  warning?: string;
}> {
  try {
    const guideSearchResult = await guides.searchGuides({
      keywords,
      apiType,
      mandatoryIds: options.mandatoryIds
    });

    if (guideSearchResult.guides.length === 0) {
      return {
        combined: '',
        count: 0,
        warning: 'No relevant guides found for the given keywords'
      };
    }

    const guideIds = guideSearchResult.guides.map((g: any) => g.id);
    const limitedIds = guideIds.slice(0, options.maxGuides);

    const combineResult = await guides.combineGuides({
      ids: limitedIds,
      context: {
        project: projectName,
        apiType
      }
    });

    let combined = combineResult.combined;

    // 최대 길이 제한
    if (combined.length > options.maxLength) {
      combined = combined.substring(0, options.maxLength);
      log('Guide truncated', { original: combineResult.combined.length, truncated: options.maxLength });
    }

    return {
      combined,
      count: limitedIds.length
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('Guide loading failed', { error: errorMsg });

    return {
      combined: '',
      count: 0,
      warning: `Failed to load guides: ${errorMsg}. Guides API may not be available.`
    };
  }
}

/**
 * 프로젝트 컨텍스트 추출
 */
async function getProjectContext(filePath: string): Promise<{
  context: any;
  warning?: string;
}> {
  try {
    const projectPath = process.env.PROJECTS_PATH || '/projects';
    const context = await extractProjectContext(projectPath);

    return { context };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('Project context extraction failed', { error: errorMsg });

    return {
      context: null,
      warning: `Failed to extract project context: ${errorMsg}. Project analysis features disabled.`
    };
  }
}

/**
 * 확장된 키워드 사전 (한글/영문 혼용 지원)
 */
const DIMENSION_KEYWORDS: Record<keyof BestCaseScores, string[]> = {
  apiConnection: [
    'api', 'grpc', 'rest', 'fetch', 'axios', 'client', 'server', 'endpoint', 'request', 'response',
    'http', 'websocket', 'graphql', 'backend', 'service', 'call', 'invoke',
    '서버', '클라이언트', '요청', '응답', '호출', '통신', '연결', '엔드포인트'
  ],
  errorHandling: [
    'error', 'try', 'catch', 'throw', 'exception', 'validation', 'validate', 'check', 'guard',
    'handle', 'handler', 'fallback', 'retry', 'recover', 'fail', 'success',
    '에러', '오류', '예외', '검증', '유효성', '처리', '실패', '성공', '재시도'
  ],
  typeUsage: [
    'type', 'interface', 'generic', 'typescript', 'typing', 'typed', 'schema', 'model', 'dto',
    'class', 'enum', 'union', 'intersection', 'extends', 'implements',
    '타입', '인터페이스', '제네릭', '스키마', '모델', '정의', '타입스크립트'
  ],
  stateManagement: [
    'state', 'store', 'pinia', 'vuex', 'reactive', 'ref', 'computed', 'watch', 'action', 'mutation',
    'getter', 'setter', 'persist', 'hydrate', 'subscribe', 'dispatch',
    '상태', '스토어', '반응형', '액션', '뮤테이션', '구독', '저장', '관리'
  ],
  designSystem: [
    'element', 'el-', 'ui', 'component', 'button', 'input', 'form', 'table', 'dialog', 'modal',
    'layout', 'style', 'css', 'scss', 'tailwind', 'theme', 'icon', 'card', 'menu', 'nav',
    '컴포넌트', '디자인', '레이아웃', '스타일', '테마', '아이콘', 'UI', '화면'
  ],
  structure: [
    'structure', 'pattern', 'architecture', 'composable', 'hook', 'mixin', 'plugin', 'module',
    'organize', 'layout', 'hierarchy', 'dependency', 'inject', 'provide', 'factory', 'singleton',
    '구조', '패턴', '아키텍처', '컴포저블', '훅', '모듈', '구성', '조직', '계층'
  ],
  performance: [
    'performance', 'optimize', 'lazy', 'cache', 'memo', 'virtual', 'debounce', 'throttle',
    'async', 'await', 'promise', 'concurrent', 'parallel', 'batch', 'chunk', 'stream',
    '성능', '최적화', '캐시', '지연', '비동기', '병렬', '메모이제이션', '가상화'
  ],
  utilityUsage: [
    'utility', 'helper', 'util', 'common', 'shared', 'lib', 'tool', 'format', 'parse', 'convert',
    'transform', 'sanitize', 'escape', 'encode', 'decode', 'serialize', 'deserialize',
    '유틸', '헬퍼', '도우미', '공통', '변환', '포맷', '파싱', '직렬화'
  ]
};

/**
 * 사용자 정의 키워드를 DIMENSION_KEYWORDS와 병합
 */
function mergeCustomKeywords(
  customKeywords?: Partial<Record<keyof BestCaseScores, string[]>>
): Record<keyof BestCaseScores, string[]> {
  if (!customKeywords) return DIMENSION_KEYWORDS;

  const merged = { ...DIMENSION_KEYWORDS };
  for (const [dimension, keywords] of Object.entries(customKeywords)) {
    if (keywords && Array.isArray(keywords)) {
      merged[dimension as keyof BestCaseScores] = [
        ...merged[dimension as keyof BestCaseScores],
        ...keywords
      ];
    }
  }
  return merged;
}

/**
 * 요청에서 중요한 점수 차원 추론 (확장된 키워드 사전 사용)
 *
 * 사용자 요청을 분석하여 어떤 점수 차원이 중요한지 결정합니다.
 */
function inferImportantDimensions(
  description: string,
  keywords: string[],
  customKeywords?: Partial<Record<keyof BestCaseScores, string[]>>
): Array<keyof BestCaseScores> {
  const dimensions: Array<keyof BestCaseScores> = [];
  const descLower = description.toLowerCase();
  const allKeywords = keywords.map(k => k.toLowerCase());
  const combined = descLower + ' ' + allKeywords.join(' ');

  // 사용자 정의 키워드 병합
  const effectiveKeywords = mergeCustomKeywords(customKeywords);

  // 각 차원별 매칭 점수 계산
  const dimensionScores: Record<keyof BestCaseScores, number> = {
    apiConnection: 0,
    errorHandling: 0,
    typeUsage: 0,
    stateManagement: 0,
    designSystem: 0,
    structure: 0,
    performance: 0,
    utilityUsage: 0
  };

  // 키워드 매칭으로 점수 계산
  for (const [dimension, keywordList] of Object.entries(effectiveKeywords)) {
    for (const keyword of keywordList) {
      if (combined.includes(keyword.toLowerCase())) {
        dimensionScores[dimension as keyof BestCaseScores]++;
      }
    }
  }

  // 점수가 있는 차원만 추가 (높은 점수 순)
  const sortedDimensions = Object.entries(dimensionScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([dim]) => dim as keyof BestCaseScores);

  if (sortedDimensions.length > 0) {
    // 최대 3개 차원만 선택 (너무 많으면 검색 부하 증가)
    dimensions.push(...sortedDimensions.slice(0, 3));
  } else {
    // 기본값: 구조와 API 연결
    dimensions.push('structure', 'apiConnection');
  }

  return dimensions;
}

/**
 * 캐시에 저장할 검색 결과 타입
 */
interface BestPracticeSearchCache {
  examples: BestPracticeExample[];
  metadata: {
    effectiveThresholds: Record<string, number>;
    candidatesCount: number;
    avgScores: Record<string, number>;
  };
}

/**
 * 우수 사례 예제 타입
 */
interface BestPracticeExample {
  id: string;
  projectName: string;
  filePath: string;
  fileRole: string;
  excellentIn: Array<keyof BestCaseScores>;
  topScore: number;
  scores: Partial<Record<keyof BestCaseScores, number>>;
  keywords: string[];
  content: string;
  analysis: {
    linesOfCode: number;
    apiMethods: string[];
    componentsUsed: string[];
    patterns: string[];
  };
  selectionReasons?: string[];
}

/**
 * 다차원 점수 기반 우수 코드 검색 (캐싱 + 동적 임계값 + 다중 차원 기록 + 선택 이유)
 *
 * 특정 차원에서 높은 점수를 가진 파일을 검색합니다.
 */
async function searchBestPracticeExamples(
  dimensions: Array<keyof BestCaseScores>,
  fileRole?: string,
  maxResults: number = 3,
  options: {
    minScoreThreshold?: number | Partial<Record<keyof BestCaseScores, number>>;
    minScoreThresholdFloor?: number;  // 동적 임계값 하한선
    enableDynamicThreshold?: boolean;
    includeSelectionReasons?: boolean;
  } = {}
): Promise<{
  examples: BestPracticeExample[];
  warning?: string;
  searchMetadata?: {
    effectiveThresholds: Record<string, number>;
    candidatesCount: number;
    avgScores: Record<string, number>;
  };
}> {
  const thresholdFloor = options.minScoreThresholdFloor ?? 50;  // 동적 임계값 하한선
  const enableDynamic = options.enableDynamicThreshold ?? true;
  const includeReasons = options.includeSelectionReasons ?? true;

  // 차원별 임계값 처리
  const perDimensionThresholds: Record<keyof BestCaseScores, number> = {
    apiConnection: 75,
    errorHandling: 75,
    typeUsage: 75,
    stateManagement: 75,
    designSystem: 75,
    structure: 75,
    performance: 75,
    utilityUsage: 75
  };

  if (typeof options.minScoreThreshold === 'number') {
    // 단일 값이면 모든 차원에 적용
    for (const dim of Object.keys(perDimensionThresholds) as Array<keyof BestCaseScores>) {
      perDimensionThresholds[dim] = options.minScoreThreshold;
    }
  } else if (options.minScoreThreshold && typeof options.minScoreThreshold === 'object') {
    // 차원별 값이면 개별 적용
    for (const [dim, value] of Object.entries(options.minScoreThreshold)) {
      if (value !== undefined) {
        perDimensionThresholds[dim as keyof BestCaseScores] = value;
      }
    }
  }

  try {
    // 캐시 키 생성 (차원별 임계값 포함)
    const thresholdKey = dimensions.map(d => `${d}:${perDimensionThresholds[d]}`).join(',');
    const cacheKey = `bestpractice:${thresholdKey}:${fileRole || 'any'}`;
    const cached = getCached<BestPracticeSearchCache>(cacheKey);
    if (cached) {
      log('Best practice cache hit', { cacheKey });
      return {
        examples: cached.examples.slice(0, maxResults),
        searchMetadata: cached.metadata  // 캐시 히트 시에도 메타데이터 반환
      };
    }

    // 전체 파일 목록 캐시 (메모리 최적화: 필요한 필드만 캐싱)
    interface CachedFileCase {
      id: string;
      projectName: string;
      filePath: string;
      fileRole: string;
      scores: BestCaseScores;
      keywords: string[];
      content: string;
      analysis: {
        linesOfCode: number;
        apiMethods: string[];
        componentsUsed: string[];
        patterns: string[];
      };
    }

    let allCases = getCached<CachedFileCase[]>('all_file_cases');
    if (!allCases) {
      log('Loading all file cases...');
      const fullCases = await fileCaseStorage.list();

      // 메모리 최적화: 필요한 필드만 추출하여 캐싱
      allCases = fullCases.map((fc: any) => ({
        id: fc.id,
        projectName: fc.projectName,
        filePath: fc.filePath,
        fileRole: fc.fileRole,
        scores: fc.scores,
        keywords: fc.keywords || [],
        content: fc.content,
        analysis: {
          linesOfCode: fc.analysis?.linesOfCode || 0,
          apiMethods: fc.analysis?.apiMethods || [],
          componentsUsed: fc.analysis?.componentsUsed || [],
          patterns: fc.analysis?.patterns || []
        }
      }));

      setCache('all_file_cases', allCases, CACHE_TTL);
      log('File cases cached', {
        count: allCases.length,
        memoryOptimized: true
      });
    }

    // 파일 역할 필터링
    let candidates = allCases;
    if (fileRole) {
      candidates = allCases.filter((fc) => fc.fileRole === fileRole);
    }

    if (candidates.length === 0) {
      return {
        examples: [],
        warning: `No files found for role: ${fileRole || 'any'}`
      };
    }

    // 각 차원별 평균 점수 계산 (동적 임계값용)
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

    for (const dimension of dimensions) {
      const scores = candidates.map((fc: any) => fc.scores[dimension] || 0);
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      avgScores[dimension] = avg;
    }

    // 동적 임계값 조정 (차원별로 적용, 하한선 보장)
    const effectiveThresholds = { ...perDimensionThresholds };
    if (enableDynamic && candidates.length > 0) {
      for (const dimension of dimensions) {
        const originalThreshold = perDimensionThresholds[dimension];
        const avgScore = avgScores[dimension];

        if (avgScore < originalThreshold) {
          // 동적 조정: 평균 + 10% 또는 +10점, 하지만 하한선 이상 유지
          const dynamicThreshold = Math.max(avgScore * 1.1, avgScore + 10);
          effectiveThresholds[dimension] = Math.max(dynamicThreshold, thresholdFloor);

          log('Dynamic threshold adjusted for dimension', {
            dimension,
            original: originalThreshold,
            average: avgScore,
            effective: effectiveThresholds[dimension],
            floor: thresholdFloor
          });
        }
      }
    }

    // 각 파일별 차원 점수 및 우수 차원 기록
    const fileScores: Map<string, {
      fileCase: any;
      excellentDimensions: Array<keyof BestCaseScores>;
      topScore: number;
      selectionReasons: string[];
    }> = new Map();

    // 각 파일의 차원별 점수 평가
    for (const fileCase of candidates) {
      const excellentDimensions: Array<keyof BestCaseScores> = [];
      const selectionReasons: string[] = [];
      let topScore = 0;

      for (const dimension of dimensions) {
        const score = fileCase.scores[dimension] || 0;
        const threshold = effectiveThresholds[dimension];

        if (score >= threshold) {
          excellentDimensions.push(dimension);
          topScore = Math.max(topScore, score);

          if (includeReasons) {
            selectionReasons.push(
              `${dimension}: ${score}점 (임계값 ${threshold}점 충족)`
            );
          }
        }
      }

      if (excellentDimensions.length > 0) {
        fileScores.set(fileCase.id, {
          fileCase,
          excellentDimensions,
          topScore,
          selectionReasons
        });
      }
    }

    // Fallback: 임계값을 낮춰서 재검색
    if (fileScores.size === 0 && enableDynamic) {
      log('No files found above threshold, falling back to top percentile');

      // 상위 10% 파일 선택
      const percentile = Math.ceil(candidates.length * 0.1);
      const sortedByAvg = candidates
        .map((fc: any) => ({
          fileCase: fc,
          avgScore: dimensions.reduce((sum, dim) => sum + (fc.scores[dim] || 0), 0) / dimensions.length
        }))
        .sort((a: any, b: any) => b.avgScore - a.avgScore)
        .slice(0, percentile);

      for (const { fileCase, avgScore } of sortedByAvg) {
        const excellentDimensions: Array<keyof BestCaseScores> = [];
        const selectionReasons: string[] = [];
        let topScore = 0;

        for (const dimension of dimensions) {
          const score = fileCase.scores[dimension] || 0;
          excellentDimensions.push(dimension);
          topScore = Math.max(topScore, score);
        }

        if (includeReasons) {
          selectionReasons.push(
            `상위 ${Math.round((percentile / candidates.length) * 100)}% 선택 (평균 점수: ${avgScore.toFixed(1)})`
          );
        }

        fileScores.set(fileCase.id, {
          fileCase,
          excellentDimensions,
          topScore,
          selectionReasons
        });
      }
    }

    // 점수순 정렬 및 결과 생성
    const sortedResults = Array.from(fileScores.values())
      .sort((a, b) => b.topScore - a.topScore);

    const results: BestPracticeExample[] = sortedResults.slice(0, maxResults).map(({ fileCase, excellentDimensions, topScore, selectionReasons }) => ({
      id: fileCase.id,
      projectName: fileCase.projectName,
      filePath: fileCase.filePath,
      fileRole: fileCase.fileRole,
      excellentIn: excellentDimensions,  // 배열로 변경: 여러 차원 기록
      topScore,
      scores: {
        // 요청된 차원의 점수만 포함
        ...Object.fromEntries(dimensions.map(dim => [dim, fileCase.scores[dim] || 0]))
      } as Partial<Record<keyof BestCaseScores, number>>,
      keywords: fileCase.keywords.slice(0, 10),
      content: fileCase.content,
      analysis: {
        linesOfCode: fileCase.analysis.linesOfCode,
        apiMethods: fileCase.analysis.apiMethods,
        componentsUsed: fileCase.analysis.componentsUsed,
        patterns: fileCase.analysis.patterns
      },
      // NEW: 선택 이유 포함
      ...(includeReasons && { selectionReasons })
    }));

    // 메타데이터 생성
    const searchMetadata = {
      effectiveThresholds: Object.fromEntries(dimensions.map(d => [d, effectiveThresholds[d]])) as Record<string, number>,
      candidatesCount: candidates.length,
      avgScores: Object.fromEntries(dimensions.map(d => [d, avgScores[d]])) as Record<string, number>
    };

    // 결과와 메타데이터를 함께 캐싱
    const cacheData: BestPracticeSearchCache = {
      examples: results,
      metadata: searchMetadata
    };
    setCache(cacheKey, cacheData, CACHE_TTL);

    log('Best practice search results', {
      dimensions,
      effectiveThresholds: searchMetadata.effectiveThresholds,
      candidates: candidates.length,
      found: results.length
    });

    return {
      examples: results,
      searchMetadata
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('Best practice search failed', { error: errorMsg });

    return {
      examples: [],
      warning: `Failed to search best practice examples: ${errorMsg}`
    };
  }
}

/**
 * 자동 컨텍스트 생성 (RAG + 가이드 + 프로젝트 분석 + 다차원 검색)
 */
async function createAutoContext(options: AutoRecommendOptions): Promise<AutoContextResult> {
  const warnings: string[] = [];

  // 1. RAG 추천 가져오기
  log('Fetching RAG recommendations...');
  const ragResult = await fetchRecommendations(options);
  if (ragResult.warnings.length > 0) {
    warnings.push(...ragResult.warnings);
  }

  const recommendations = ragResult.recommendations;
  const extractedKeywords = ragResult.keywords;
  log('RAG recommendations', { count: recommendations.length, keywords: extractedKeywords });

  // 2. 가이드 자동 로딩
  let autoLoadedGuides = '';
  if (!options.skipGuideLoading && recommendations.length > 0) {
    log('Auto-loading guides...');
    const { allKeywords, apiType } = analyzeRecommendations(recommendations, extractedKeywords);

    const guideResult = await loadGuidesForKeywords(
      allKeywords,
      apiType,
      recommendations[0]?.projectName || 'unknown',
      {
        maxGuides: options.maxGuides || 5,
        maxLength: options.maxGuideLength || 50000,
        mandatoryIds: options.mandatoryGuideIds || ['00-bestcase-priority']
      }
    );

    autoLoadedGuides = guideResult.combined;
    if (guideResult.warning) {
      warnings.push(guideResult.warning);
    }
    log('Guides loaded', { count: guideResult.count, length: autoLoadedGuides.length });
  } else if (recommendations.length === 0) {
    warnings.push('No recommendations found, skipping guide loading');
  }

  // 3. 프로젝트 컨텍스트 분석
  let projectContext = null;
  if (!options.skipProjectContext) {
    log('Extracting project context...');
    const contextResult = await getProjectContext(options.filePath);
    projectContext = contextResult.context;
    if (contextResult.warning) {
      warnings.push(contextResult.warning);
    }
    if (projectContext) {
      log('Project context extracted', {
        apiType: projectContext.apiInfo?.type,
        designSystem: projectContext.designSystemInfo?.detected
      });
    }
  }

  // 4. 다차원 점수 기반 우수 코드 검색
  let bestPracticeExamples: any[] = [];
  let searchMetadata: any = null;
  const maxBestPractices = options.maxBestPractices !== undefined ? options.maxBestPractices : 3;

  // forceBestPracticeSearch가 true면 skipBestPracticeSearch 무시
  const shouldSearch = options.forceBestPracticeSearch ||
    (!options.skipBestPracticeSearch && maxBestPractices > 0 && (recommendations.length > 0 || extractedKeywords.length > 0));

  if (shouldSearch && maxBestPractices > 0) {
    log('Searching best practice examples...', { forced: options.forceBestPracticeSearch });

    // 파일 역할 추론
    let inferredRole: string | undefined;
    if (options.filePath.includes('pages/')) inferredRole = 'page';
    else if (options.filePath.includes('components/')) inferredRole = 'component';
    else if (options.filePath.includes('composables/')) inferredRole = 'composable';
    else if (options.filePath.includes('stores/')) inferredRole = 'store';

    // 중요 차원 추론 (사용자 정의 키워드 포함)
    const importantDimensions = inferImportantDimensions(
      options.description,
      extractedKeywords,
      options.customKeywords
    );
    log('Important dimensions', { dimensions: importantDimensions });

    // 다차원 검색 (캐싱 + 동적 임계값 + 다중 차원 기록 + 선택 이유)
    const bestPracticeResult = await searchBestPracticeExamples(
      importantDimensions,
      inferredRole,
      maxBestPractices,
      {
        minScoreThreshold: options.minScoreThreshold ?? 75,
        minScoreThresholdFloor: options.minScoreThresholdFloor ?? 50,
        enableDynamicThreshold: options.enableDynamicThreshold ?? true,
        includeSelectionReasons: options.includeSelectionReasons ?? true
      }
    );

    bestPracticeExamples = bestPracticeResult.examples;
    searchMetadata = bestPracticeResult.searchMetadata;

    if (bestPracticeResult.warning) {
      warnings.push(bestPracticeResult.warning);
    }

    log('Best practice examples loaded', {
      count: bestPracticeExamples.length,
      excellentIn: bestPracticeExamples.map(e => e.excellentIn),
      metadata: searchMetadata
    });
  } else if (options.skipBestPracticeSearch && !options.forceBestPracticeSearch) {
    log('Best practice search skipped by user');
  } else if (maxBestPractices === 0) {
    log('Best practice search disabled (maxBestPractices=0)');
  }

  return {
    recommendations,
    extractedKeywords,
    guides: autoLoadedGuides,
    projectContext,
    warnings,
    bestPracticeExamples,
    searchMetadata
  };
}

// ============= 요청 처리 =============

rl.on('line', async (line: string) => {
  let request: JsonRpcRequest;

  // JSON 파싱 시도 - 상세한 오류 메시지 제공
  try {
    request = JSON.parse(line) as JsonRpcRequest;
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    // 민감 데이터 마스킹된 미리보기 사용
    const maskedPreview = safePreview(line, 100);
    log('JSON parse error', { error: errorMsg, lineLength: line.length, linePreview: maskedPreview });

    sendResponse({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
        data: {
          parseError: errorMsg,
          receivedLength: line.length,
          // 민감 데이터 마스킹된 미리보기
          preview: safePreview(line, MAX_LOG_PREVIEW_LENGTH)
        }
      }
    });
    return;
  }

  // JSON-RPC 요청 유효성 검증
  if (!request.jsonrpc || request.jsonrpc !== '2.0') {
    log('Invalid JSON-RPC version', { received: request.jsonrpc });
    sendResponse({
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32600,
        message: 'Invalid Request: jsonrpc must be "2.0"',
        data: { received: request.jsonrpc }
      }
    });
    return;
  }

  if (!request.method || typeof request.method !== 'string') {
    log('Invalid method', { received: request.method });
    sendResponse({
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32600,
        message: 'Invalid Request: method must be a string',
        data: { received: typeof request.method }
      }
    });
    return;
  }

  try {
    log('Received request', { method: request.method, id: request.id });

    // initialize 메서드: MCP 프로토콜 초기화
    if (request.method === 'initialize') {
      log('Initialize MCP server');
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'mcp-code-mode',
            version: '1.0.0'
          }
        }
      });
    }

    // notifications/initialized: 초기화 완료 알림
    else if (request.method === 'notifications/initialized') {
      // 알림은 응답 불필요
    }

    // tools/list 메서드: 사용 가능한 도구 목록
    else if (request.method === 'tools/list') {
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'execute',
              description: `Execute TypeScript code in sandbox with automatic RAG-based code recommendations. Anthropic MCP Code Mode approach for 98% token reduction.

When autoRecommend is provided, the server automatically:
1. Analyzes the current file and fetches similar code via RAG (hybrid keyword + vector search)
2. Searches for best practice examples based on multi-dimensional scores (API connection, error handling, etc.)
3. Loads relevant development guides based on keywords
4. Extracts project context (API type, design system, etc.)
5. Injects all information into sandbox context

Sandbox APIs:
- context.recommendations - Pre-loaded similar code via RAG
- context.bestPracticeExamples - High-scoring code examples by dimension (apiConnection, errorHandling, etc.)
- context.hasBestPractices - Boolean indicating if best practices are available
- context.guides - Auto-loaded development guides
- context.projectContext - Project analysis (API type, design system)
- context.warnings - Any issues during auto-loading
- filesystem.readFile/writeFile/searchFiles
- bestcase.searchFileCases({ keywords, fileRole })
- guides.searchGuides/combineGuides
- metadata.extractProjectContext`,
              inputSchema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'TypeScript code to execute in sandbox'
                  },
                  timeoutMs: {
                    type: 'number',
                    description: 'Timeout in milliseconds',
                    default: 30000
                  },
                  autoRecommend: {
                    type: 'object',
                    description: 'Auto-fetch recommendations, guides, and project context',
                    properties: {
                      currentFile: {
                        type: 'string',
                        description: 'Current file content to analyze'
                      },
                      filePath: {
                        type: 'string',
                        description: 'File path (e.g., pages/users/index.vue)'
                      },
                      description: {
                        type: 'string',
                        description: 'What to implement'
                      },
                      maxGuides: {
                        type: 'number',
                        description: 'Maximum number of guides to load (default: 5)',
                        default: 5
                      },
                      maxGuideLength: {
                        type: 'number',
                        description: 'Maximum total guide length in characters (default: 50000)',
                        default: 50000
                      },
                      mandatoryGuideIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Required guide IDs (default: ["00-bestcase-priority"])'
                      },
                      skipGuideLoading: {
                        type: 'boolean',
                        description: 'Skip automatic guide loading',
                        default: false
                      },
                      skipProjectContext: {
                        type: 'boolean',
                        description: 'Skip project context extraction',
                        default: false
                      },
                      maxBestPractices: {
                        type: 'number',
                        description: 'Maximum number of best practice examples to load (default: 3, 0 to disable)',
                        default: 3
                      },
                      skipBestPracticeSearch: {
                        type: 'boolean',
                        description: 'Skip multi-dimensional best practice search',
                        default: false
                      },
                      minScoreThreshold: {
                        oneOf: [
                          { type: 'number' },
                          {
                            type: 'object',
                            description: 'Per-dimension thresholds',
                            additionalProperties: { type: 'number' }
                          }
                        ],
                        description: 'Minimum score threshold (single number or per-dimension object, default: 75)',
                        default: 75
                      },
                      minScoreThresholdFloor: {
                        type: 'number',
                        description: 'Lower bound for dynamic threshold adjustment (default: 50)',
                        default: 50
                      },
                      enableDynamicThreshold: {
                        type: 'boolean',
                        description: 'Enable dynamic threshold adjustment based on average scores (default: true)',
                        default: true
                      },
                      customKeywords: {
                        type: 'object',
                        description: 'Custom keywords to merge with DIMENSION_KEYWORDS for domain-specific terms',
                        additionalProperties: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      },
                      forceBestPracticeSearch: {
                        type: 'boolean',
                        description: 'Force best practice search even when skipBestPracticeSearch conditions apply',
                        default: false
                      },
                      includeSelectionReasons: {
                        type: 'boolean',
                        description: 'Include reasons why each file was selected (default: true)',
                        default: true
                      }
                    },
                    required: ['currentFile', 'filePath', 'description']
                  }
                },
                required: ['code']
              }
            }
          ]
        }
      });
    }

    // tools/call 메서드: 도구 실행
    else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params as ToolCallParams;
      log('Tool call', { tool: name, args });

      if (name === 'execute') {
        const execArgs = args as ExecuteParams;
        log('Executing code', {
          codeLength: execArgs.code?.length,
          hasAutoRecommend: !!execArgs.autoRecommend
        });

        // 입력 검증
        if (!execArgs.code || typeof execArgs.code !== 'string') {
          sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32602,
              message: 'Invalid params: code must be a non-empty string',
              data: { received: typeof execArgs.code }
            }
          });
          return;
        }

        if (execArgs.autoRecommend) {
          const { currentFile, filePath, description } = execArgs.autoRecommend;
          if (!currentFile || typeof currentFile !== 'string') {
            sendResponse({
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32602,
                message: 'Invalid params: autoRecommend.currentFile must be a non-empty string',
                data: { received: typeof currentFile }
              }
            });
            return;
          }
          if (!filePath || typeof filePath !== 'string') {
            sendResponse({
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32602,
                message: 'Invalid params: autoRecommend.filePath must be a non-empty string',
                data: { received: typeof filePath }
              }
            });
            return;
          }
          if (!description || typeof description !== 'string') {
            sendResponse({
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32602,
                message: 'Invalid params: autoRecommend.description must be a non-empty string',
                data: { received: typeof description }
              }
            });
            return;
          }
        }

        // 자동 컨텍스트 생성
        let autoContext: AutoContextResult = {
          recommendations: [],
          extractedKeywords: [],
          guides: '',
          projectContext: null,
          warnings: [],
          bestPracticeExamples: []
        };

        if (execArgs.autoRecommend) {
          log('Auto-context enabled');
          try {
            autoContext = await createAutoContext(execArgs.autoRecommend);
          } catch (contextError) {
            const errorMsg = contextError instanceof Error ? contextError.message : String(contextError);
            log('Auto-context creation failed', { error: errorMsg });
            autoContext.warnings.push(`Auto-context creation failed: ${errorMsg}. Proceeding with empty context.`);
          }
        }

        // Context 주입
        const wrappedCode = `
// Auto-injected context with RAG recommendations, guides, project info, and best practices
const context = {
  recommendations: ${JSON.stringify(autoContext.recommendations, null, 2)},
  hasRecommendations: ${autoContext.recommendations.length > 0},
  bestPracticeExamples: ${JSON.stringify(autoContext.bestPracticeExamples, null, 2)},
  hasBestPractices: ${autoContext.bestPracticeExamples.length > 0},
  guides: ${JSON.stringify(autoContext.guides)},
  hasGuides: ${autoContext.guides.length > 0},
  projectContext: ${JSON.stringify(autoContext.projectContext)},
  extractedKeywords: ${JSON.stringify(autoContext.extractedKeywords)},
  warnings: ${JSON.stringify(autoContext.warnings)}
};

// User code starts here
${execArgs.code}
`;

        const result = await runAgentScript({
          code: wrappedCode,
          timeoutMs: execArgs.timeoutMs || 30000
        });
        log('Execution result', { success: !result.error });

        // 응답 생성
        const responseText = JSON.stringify({
          ok: result.ok,
          output: result.output,
          logs: result.logs,
          error: result.error,
          // 자동 컨텍스트 정보
          recommendations: autoContext.recommendations.length > 0
            ? autoContext.recommendations.map(r => ({
                filePath: r.filePath,
                fileRole: r.fileRole,
                keywords: r.keywords,
                similarity: r.similarity,
                content: r.content,
                analysis: r.analysis
              }))
            : undefined,
          guidesLoaded: autoContext.guides.length > 0,
          guidesLength: autoContext.guides.length,
          projectInfo: autoContext.projectContext ? {
            apiType: autoContext.projectContext.apiInfo?.type,
            designSystem: autoContext.projectContext.designSystemInfo?.detected,
            utilityLibrary: autoContext.projectContext.utilityLibraryInfo?.detected,
            framework: autoContext.projectContext.framework
          } : undefined,
          extractedKeywords: autoContext.extractedKeywords.length > 0
            ? autoContext.extractedKeywords
            : undefined,
          // NEW: 검색 메타데이터 (임계값, 평균 점수 등)
          searchMetadata: autoContext.searchMetadata || undefined,
          // NEW: 캐시 통계
          cacheStats: getCacheStats(),
          // 경고 메시지 포함
          warnings: autoContext.warnings.length > 0
            ? autoContext.warnings
            : undefined
        }, null, 2);

        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: responseText
              }
            ]
          }
        });
      }
      else {
        log('Unknown tool', { tool: name });
        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}. Only 'execute' tool is available.`
          }
        });
      }
    }

    // 지원하지 않는 메서드
    else {
      log('Unknown method', { method: request.method });
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    log('Request processing error', {
      error: errorMessage,
      stack: errorStack,
      requestMethod: request.method,
      requestId: request.id
    });

    sendResponse({
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: {
          message: errorMessage,
          method: request.method,
          hint: 'Check server logs for more details'
        }
      }
    });
  }
});

// 시작 메시지
process.stderr.write('MCP STDIO Server started\n');

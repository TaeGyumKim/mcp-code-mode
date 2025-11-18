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
import * as path from 'path';

const fileCaseStorage = new FileCaseStorage();

// ============= 설정 파일 로딩 =============

interface MCPConfig {
  projectMarkers?: string[];
  dimensionFloors?: Partial<Record<keyof BestCaseScores, number>>;
  cacheOptions?: {
    ttlMs?: number;
    maxEntries?: number;
  };
  autoRecommendDefaults?: Partial<AutoRecommendOptions>;
}

/**
 * MCP 설정 파일 로드 (mcp.json)
 * 프로젝트 루트에서 mcp.json을 찾아 설정을 로드합니다.
 */
function loadMCPConfig(projectRoot: string): MCPConfig | null {
  try {
    const configPath = path.join(projectRoot, 'mcp.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent) as MCPConfig;
      log('MCP config loaded', { path: configPath, config });
      return config;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('Failed to load MCP config', { error: errorMsg });
  }
  return null;
}

// ============= LRU 캐싱 시스템 (환경 변수 제어) =============
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;  // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000');  // 기본 5분, 환경변수로 제어
const MAX_CACHE_SIZE = parseInt(process.env.CACHE_MAX_ENTRIES || '100');  // 최대 캐시 엔트리 수

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  // LRU: 접근 시간 및 횟수 업데이트
  entry.accessCount++;
  entry.lastAccessed = now;

  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  // 캐시 크기 제한 (LRU 제거)
  if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
    evictLRU();
  }

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    accessCount: 1,
    lastAccessed: Date.now()
  });
}

function evictLRU(): void {
  // LRU 알고리즘: 가장 오래 전에 접근한 항목 제거
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of cache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
    log('LRU eviction', { evictedKey: oldestKey, cacheSize: cache.size });
  }
}

function clearCache(): void {
  const size = cache.size;
  cache.clear();
  log('Cache cleared', { clearedEntries: size });
}

function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL
  };
}

// FileCaseStorage 저장 시 캐시 클리어 콜백 설정
let onFileCaseSaved: (() => void) | null = null;
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
        }, 3000);  // 3초 디바운스 (도커 재시작 시 다중 이벤트 방지)
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
  forceBestPracticeSearch?: boolean; // 다른 조건과 상관없이 검색 강제 실행
  minScoreThreshold?: number | Record<keyof BestCaseScores, number>;  // 점수 임계값 (숫자 or 차원별 객체)
  minScoreFloor?: number;          // 동적 임계값 최소 하한선 (기본: 50)
  enableDynamicThreshold?: boolean; // 동적 임계값 활성화 (기본: true)
  customKeywords?: Partial<Record<keyof BestCaseScores, string[]>>;  // 사용자 정의 키워드 (차원별)
  // NEW: 고급 설정 옵션
  projectMarkers?: string[];       // 커스텀 프로젝트 루트 마커 (기본 마커에 추가)
  dimensionFloors?: Partial<Record<keyof BestCaseScores, number>>;  // 차원별 하한선 (기본: minScoreFloor)
  includeMetadata?: boolean;       // 검색 메타데이터와 선택 이유 포함 여부 (기본: false)
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
  bestPracticeExamples: any[];  // NEW: 다차원 점수 기반 우수 코드 예제
  searchMetadata: any;  // NEW: 검색 메타데이터 (차원, 임계값, 캐시 히트 등)
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
/**
 * 파일 경로에서 프로젝트 루트 추론
 * 예: "/projects/my-app/pages/index.vue" → "/projects/my-app"
 *
 * @param filePath - 대상 파일 경로
 * @param customMarkers - 추가 프로젝트 마커 (선택적)
 */
function inferProjectRoot(filePath: string, customMarkers?: string[]): string {
  const defaultProjectsPath = process.env.PROJECTS_PATH || '/projects';

  // filePath가 없으면 기본 경로 사용
  if (!filePath) {
    return defaultProjectsPath;
  }

  // 상대 경로를 절대 경로로 변환 (PROJECTS_PATH 기준)
  if (!filePath.startsWith('/')) {
    filePath = `${defaultProjectsPath}/${filePath}`;
    log('Converted relative path to absolute', { result: filePath });
  }

  // 기본 프로젝트 마커 디렉토리들
  const defaultMarkers = ['pages', 'components', 'composables', 'stores', 'src', 'app', 'lib', 'packages', 'apps'];

  // 커스텀 마커 병합 (중복 제거)
  const projectMarkers = customMarkers
    ? [...new Set([...defaultMarkers, ...customMarkers])]
    : defaultMarkers;

  const parts = filePath.split('/').filter(Boolean);

  // 프로젝트 마커를 찾아서 그 이전까지가 프로젝트 루트
  for (let i = parts.length - 1; i >= 0; i--) {
    if (projectMarkers.includes(parts[i])) {
      const root = '/' + parts.slice(0, i).join('/');
      log('Project root inferred from marker', { marker: parts[i], root });
      return root;
    }
  }

  // 마커를 찾지 못하면 파일의 상위 2단계를 프로젝트 루트로 간주
  // 예: /projects/my-app/file.vue → /projects/my-app
  if (parts.length >= 2) {
    const root = '/' + parts.slice(0, Math.min(parts.length - 1, 2)).join('/');
    log('Project root inferred from path depth', { root });
    return root;
  }

  log('Project root fallback to default', { default: defaultProjectsPath });
  return defaultProjectsPath;
}

async function getProjectContext(filePath: string, customMarkers?: string[]): Promise<{
  context: any;
  warning?: string;
}> {
  try {
    // 개선: filePath에서 프로젝트 루트 추론 (커스텀 마커 지원)
    const projectPath = inferProjectRoot(filePath, customMarkers);
    log('Inferred project root', { filePath, projectPath, customMarkers });

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
 * 요청에서 중요한 점수 차원 추론 (사용자 정의 키워드 지원)
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

  // 키워드 사전 병합 (기본 + 사용자 정의)
  const mergedKeywords: Record<keyof BestCaseScores, string[]> = { ...DIMENSION_KEYWORDS };
  if (customKeywords) {
    for (const [dimension, customList] of Object.entries(customKeywords)) {
      const dim = dimension as keyof BestCaseScores;
      if (customList && customList.length > 0) {
        mergedKeywords[dim] = [...mergedKeywords[dim], ...customList];
        log('Custom keywords added', { dimension: dim, count: customList.length });
      }
    }
  }

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
  for (const [dimension, keywordList] of Object.entries(mergedKeywords)) {
    for (const keyword of keywordList) {
      if (combined.includes(keyword)) {
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
 * 다차원 점수 기반 우수 코드 검색 (캐싱 + 동적 임계값 + 차원별 설정 + 설명)
 *
 * 특정 차원에서 높은 점수를 가진 파일을 검색합니다.
 */
async function searchBestPracticeExamples(
  dimensions: Array<keyof BestCaseScores>,
  fileRole?: string,
  maxResults: number = 3,
  options: {
    minScoreThreshold?: number | Record<keyof BestCaseScores, number>;
    minScoreFloor?: number;
    enableDynamicThreshold?: boolean;
    dimensionFloors?: Partial<Record<keyof BestCaseScores, number>>;  // 차원별 하한선
  } = {}
): Promise<{
  examples: any[];
  warning?: string;
  searchMetadata?: {  // 설명 및 가시성 향상
    dimensionsSearched: Array<keyof BestCaseScores>;
    thresholdsUsed: Record<keyof BestCaseScores, number>;
    candidateCount: number;
    cacheHit: boolean;
  };
}> {
  const minThresholdInput = options.minScoreThreshold ?? 75;
  const minFloor = options.minScoreFloor ?? 50;  // 기본 하한선: 최소 50점
  const enableDynamic = options.enableDynamicThreshold ?? true;
  const dimensionFloors = options.dimensionFloors || {};  // 차원별 하한선 (선택)

  // 차원별 임계값 구성
  const dimensionThresholds: Record<keyof BestCaseScores, number> = {
    apiConnection: 75,
    errorHandling: 75,
    typeUsage: 75,
    stateManagement: 75,
    designSystem: 75,
    structure: 75,
    performance: 75,
    utilityUsage: 75
  };

  // 사용자 설정 적용
  if (typeof minThresholdInput === 'number') {
    // 단일 값: 모든 차원에 적용
    for (const dim of dimensions) {
      dimensionThresholds[dim] = minThresholdInput;
    }
  } else if (typeof minThresholdInput === 'object') {
    // 차원별 값
    for (const [dim, threshold] of Object.entries(minThresholdInput)) {
      dimensionThresholds[dim as keyof BestCaseScores] = Math.max(threshold, minFloor);
    }
  }

  try {
    // 캐시 키 생성 (차원별 임계값 포함)
    const thresholdStr = dimensions.map(d => `${d}:${dimensionThresholds[d]}`).join(',');
    const cacheKey = `bestpractice:${thresholdStr}:${fileRole || 'any'}`;
    const cached = getCached<{examples: any[], metadata: any}>(cacheKey);
    if (cached) {
      log('Best practice cache hit', { cacheKey });
      return {
        examples: cached.examples.slice(0, maxResults),
        searchMetadata: { ...cached.metadata, cacheHit: true }
      };
    }

    // 전체 파일 목록 캐시 (5분간 유효)
    let allCases = getCached<any[]>('all_file_cases');
    if (!allCases) {
      log('Loading all file cases...');
      allCases = await fileCaseStorage.list();
      setCache('all_file_cases', allCases, CACHE_TTL);
      log('File cases cached', { count: allCases.length });
    }

    // 파일 역할 필터링
    let candidates = allCases;
    if (fileRole) {
      candidates = allCases.filter((fc: any) => fc.fileRole === fileRole);
    }

    if (candidates.length === 0) {
      return {
        examples: [],
        warning: `No files found for role: ${fileRole || 'any'}`
      };
    }

    // 각 파일별 차원 점수 및 우수 차원 기록
    const fileScores: Map<string, {
      fileCase: any;
      excellentDimensions: Array<{
        dimension: keyof BestCaseScores;
        score: number;
        threshold: number;
        reason: string;
      }>;
      topScore: number;
    }> = new Map();

    // 동적 임계값: 차원별로 상위 N% 선택
    const effectiveThresholds = { ...dimensionThresholds };
    if (enableDynamic && candidates.length > 0) {
      // 각 차원별 평균 점수 계산
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

        // 차원별 하한선 적용 (우선순위: dimensionFloors > minFloor)
        const dimFloor = dimensionFloors[dimension] ?? minFloor;

        // 평균이 임계값보다 낮으면 동적으로 조정 (차원별 하한선 적용)
        if (avg < dimensionThresholds[dimension]) {
          const adjusted = Math.max(avg * 1.1, avg + 10);  // 평균 + 10% 또는 +10점
          effectiveThresholds[dimension] = Math.max(adjusted, dimFloor);  // 차원별 하한선 보장
          log('Dynamic threshold adjusted', {
            dimension,
            original: dimensionThresholds[dimension],
            adjusted: effectiveThresholds[dimension],
            average: avg,
            floor: dimFloor,
            customFloor: dimensionFloors[dimension] !== undefined
          });
        }
      }
    }

    // 각 파일의 차원별 점수 평가
    for (const fileCase of candidates) {
      const excellentDimensions: Array<{
        dimension: keyof BestCaseScores;
        score: number;
        threshold: number;
        reason: string;  // 선택 이유 설명
      }> = [];
      let topScore = 0;

      for (const dimension of dimensions) {
        const score = fileCase.scores[dimension] || 0;
        const threshold = effectiveThresholds[dimension];

        if (score >= threshold) {
          const exceedsBy = score - threshold;
          const reason = `${dimension}: ${score} (threshold: ${threshold}, +${exceedsBy.toFixed(1)})`;
          excellentDimensions.push({
            dimension,
            score,
            threshold,
            reason
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

      for (const { fileCase } of sortedByAvg) {
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
          const reason = `${dimension}: ${score} (top percentile fallback)`;
          excellentDimensions.push({
            dimension,
            score,
            threshold,
            reason
          });
          topScore = Math.max(topScore, score);
        }

        fileScores.set(fileCase.id, {
          fileCase,
          excellentDimensions,
          topScore
        });
      }
    }

    // 점수순 정렬 및 결과 생성
    const sortedResults = Array.from(fileScores.values())
      .sort((a, b) => b.topScore - a.topScore);

    const results = sortedResults.slice(0, maxResults).map(({ fileCase, excellentDimensions, topScore }) => ({
      id: fileCase.id,
      projectName: fileCase.projectName,
      filePath: fileCase.filePath,
      fileRole: fileCase.fileRole,
      excellentIn: excellentDimensions.map(ed => ed.dimension),  // 차원 목록
      excellentDetails: excellentDimensions,  // 상세 정보 (점수, 임계값, 이유)
      topScore,
      scores: {
        // 요청된 차원의 점수만 포함
        ...Object.fromEntries(dimensions.map(dim => [dim, fileCase.scores[dim] || 0]))
      },
      keywords: fileCase.keywords.slice(0, 10),
      content: fileCase.content,
      analysis: {
        linesOfCode: fileCase.analysis.linesOfCode,
        apiMethods: fileCase.analysis.apiMethods,
        componentsUsed: fileCase.analysis.componentsUsed,
        patterns: fileCase.analysis.patterns
      }
    }));

    // 검색 메타데이터 생성 (가시성 향상)
    const searchMetadata = {
      dimensionsSearched: dimensions,
      thresholdsUsed: Object.fromEntries(
        dimensions.map(d => [d, effectiveThresholds[d]])
      ) as Record<keyof BestCaseScores, number>,
      candidateCount: candidates.length,
      cacheHit: false
    };

    // 결과 캐싱 (메타데이터 포함)
    setCache(cacheKey, { examples: results, metadata: searchMetadata }, CACHE_TTL);

    log('Best practice search results', {
      dimensions,
      thresholds: effectiveThresholds,
      candidates: candidates.length,
      found: results.length
    });

    return { examples: results, searchMetadata };
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

  // 0-1. filePath 정규화 (상대 경로 → 절대 경로)
  const defaultProjectsPath = process.env.PROJECTS_PATH || '/projects';
  if (options.filePath && !options.filePath.startsWith('/')) {
    options.filePath = `${defaultProjectsPath}/${options.filePath}`;
    log('Normalized filePath to absolute', { filePath: options.filePath });
  }

  // 0-2. 설정 파일 로드 및 옵션 병합
  const projectRoot = inferProjectRoot(options.filePath, options.projectMarkers);
  const mcpConfig = loadMCPConfig(projectRoot);

  // 설정 파일 값과 사용자 옵션 병합 (사용자 옵션이 우선)
  const mergedOptions: AutoRecommendOptions = {
    ...options,
    projectMarkers: options.projectMarkers || mcpConfig?.projectMarkers,
    dimensionFloors: { ...mcpConfig?.dimensionFloors, ...options.dimensionFloors },
    ...mcpConfig?.autoRecommendDefaults,
    ...options  // 사용자 옵션이 최우선
  };

  log('Merged options with config', { hasConfig: !!mcpConfig, projectRoot });

  // 1. RAG 추천 가져오기
  log('Fetching RAG recommendations...');
  const ragResult = await fetchRecommendations(mergedOptions);
  if (ragResult.warnings.length > 0) {
    warnings.push(...ragResult.warnings);
  }

  const recommendations = ragResult.recommendations;
  const extractedKeywords = ragResult.keywords;
  log('RAG recommendations', { count: recommendations.length, keywords: extractedKeywords });

  // 2. 가이드 자동 로딩 (개선: 추천이 없어도 키워드나 설명이 있으면 로딩)
  let autoLoadedGuides = '';
  const hasSearchableContent = recommendations.length > 0 || extractedKeywords.length > 0 || mergedOptions.description;

  if (!mergedOptions.skipGuideLoading && hasSearchableContent) {
    log('Auto-loading guides...', {
      hasRecommendations: recommendations.length > 0,
      hasKeywords: extractedKeywords.length > 0,
      hasDescription: !!mergedOptions.description
    });

    const { allKeywords, apiType } = recommendations.length > 0
      ? analyzeRecommendations(recommendations, extractedKeywords)
      : { allKeywords: extractedKeywords, apiType: undefined };

    const guideResult = await loadGuidesForKeywords(
      allKeywords,
      apiType,
      recommendations[0]?.projectName || 'unknown',
      {
        maxGuides: mergedOptions.maxGuides || 5,
        maxLength: mergedOptions.maxGuideLength || 50000,
        mandatoryIds: mergedOptions.mandatoryGuideIds || ['00-bestcase-priority']
      }
    );

    autoLoadedGuides = guideResult.combined;
    if (guideResult.warning) {
      warnings.push(guideResult.warning);
    }
    log('Guides loaded', { count: guideResult.count, length: autoLoadedGuides.length });
  } else if (!hasSearchableContent) {
    log('No searchable content (recommendations, keywords, or description), skipping guide loading');
  }

  // 3. 프로젝트 컨텍스트 분석 (커스텀 마커 지원)
  let projectContext = null;
  if (!mergedOptions.skipProjectContext) {
    log('Extracting project context...', { customMarkers: mergedOptions.projectMarkers });
    const contextResult = await getProjectContext(mergedOptions.filePath, mergedOptions.projectMarkers);
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
  const maxBestPractices = mergedOptions.maxBestPractices !== undefined ? mergedOptions.maxBestPractices : 3;

  // 개선: skipBestPracticeSearch가 명시적으로 true일 때만 생략
  // 그렇지 않으면 설명과 키워드에 기반해 베스트 프랙티스 검색
  const shouldSearch = mergedOptions.forceBestPracticeSearch ||
    (!mergedOptions.skipBestPracticeSearch && maxBestPractices > 0 && hasSearchableContent);

  if (shouldSearch) {
    log('Searching best practice examples...', {
      forced: mergedOptions.forceBestPracticeSearch,
      hasRecommendations: recommendations.length > 0,
      hasKeywords: extractedKeywords.length > 0
    });

    // 파일 역할 추론 (개선: 더 정교한 패턴 매칭 + projectContext 활용)
    let inferredRole: string | undefined;
    const normalizedPath = mergedOptions.filePath.toLowerCase();

    // 정확한 디렉토리 경계 확인 (pages-edit 같은 오탐 방지)
    if (/\/pages\//.test(normalizedPath) || normalizedPath.endsWith('/pages')) inferredRole = 'page';
    else if (/\/components\//.test(normalizedPath) || normalizedPath.endsWith('/components')) inferredRole = 'component';
    else if (/\/composables\//.test(normalizedPath) || normalizedPath.endsWith('/composables')) inferredRole = 'composable';
    else if (/\/stores\//.test(normalizedPath) || normalizedPath.endsWith('/stores')) inferredRole = 'store';
    else if (/\/utils\/|\/helpers\/|\/lib\//.test(normalizedPath)) inferredRole = 'utility';
    else if (/\/layouts\//.test(normalizedPath)) inferredRole = 'layout';
    else if (/\/plugins\//.test(normalizedPath)) inferredRole = 'plugin';
    else if (/\/middleware\//.test(normalizedPath)) inferredRole = 'middleware';

    // projectContext에서 역할 추론 (우선순위 높음)
    if (!inferredRole && projectContext) {
      // projectContext의 패턴 정보 활용
      const patterns = projectContext.patterns || {};
      const relativePath = mergedOptions.filePath.replace(/^\/projects\/[^/]+\//, '');

      // API 타입에 따른 추론
      if (patterns.pages && patterns.pages.some((p: string) => relativePath.includes(p))) {
        inferredRole = 'page';
      } else if (patterns.components && patterns.components.some((p: string) => relativePath.includes(p))) {
        inferredRole = 'component';
      } else if (projectContext.apiInfo?.type === 'grpc' && relativePath.includes('proto')) {
        inferredRole = 'api-definition';
      }
    }

    log('Inferred file role', { role: inferredRole, path: mergedOptions.filePath });

    // 중요 차원 추론 (사용자 정의 키워드 지원)
    const importantDimensions = inferImportantDimensions(
      mergedOptions.description,
      extractedKeywords,
      mergedOptions.customKeywords
    );
    log('Important dimensions', { dimensions: importantDimensions });

    // 다차원 검색 (캐싱 + 동적 임계값 + 차원별 설정 + 하한선 + 설명)
    const bestPracticeResult = await searchBestPracticeExamples(
      importantDimensions,
      inferredRole,
      maxBestPractices,
      {
        minScoreThreshold: mergedOptions.minScoreThreshold ?? 75,
        minScoreFloor: mergedOptions.minScoreFloor ?? 50,
        enableDynamicThreshold: mergedOptions.enableDynamicThreshold ?? true,
        dimensionFloors: mergedOptions.dimensionFloors  // 차원별 하한선 전달 (설정 파일 + 사용자 옵션)
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
  } else if (mergedOptions.skipBestPracticeSearch) {
    log('Best practice search skipped by user');
  } else if (maxBestPractices === 0) {
    log('Best practice search disabled (maxBestPractices=0)');
  }

  // 메타데이터 노출 여부 결정
  const includeMetadata = mergedOptions.includeMetadata ?? false;

  // 베스트 프랙티스 예제에서 상세 정보 선택적 노출
  const finalBestPracticeExamples = includeMetadata
    ? bestPracticeExamples  // excellentDetails 포함
    : bestPracticeExamples.map(({ excellentDetails, ...rest }) => rest);  // 제거

  return {
    recommendations,
    extractedKeywords,
    guides: autoLoadedGuides,
    projectContext,
    warnings,
    bestPracticeExamples: finalBestPracticeExamples,
    ...(includeMetadata && { searchMetadata })  // 메타데이터 조건부 포함
  };
}

// ============= 요청 처리 =============

rl.on('line', async (line: string) => {
  if (!line.trim()) return;

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
                        description: 'File path - supports both absolute (/projects/app/pages/index.vue) and relative (pages/index.vue) paths'
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
                      forceBestPracticeSearch: {
                        type: 'boolean',
                        description: 'Force best practice search regardless of other conditions',
                        default: false
                      },
                      minScoreThreshold: {
                        description: 'Minimum score threshold (number for all dimensions, object for dimension-specific)',
                        oneOf: [
                          { type: 'number' },
                          { type: 'object' }
                        ]
                      },
                      minScoreFloor: {
                        type: 'number',
                        description: 'Minimum floor for dynamic thresholds (default: 50)',
                        default: 50
                      },
                      enableDynamicThreshold: {
                        type: 'boolean',
                        description: 'Enable dynamic threshold adjustment based on average scores (default: true)',
                        default: true
                      },
                      customKeywords: {
                        type: 'object',
                        description: 'Custom domain-specific keywords per dimension (e.g., {apiConnection: ["myapi", "customrpc"]})'
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

        // 자동 컨텍스트 생성
        let autoContext: AutoContextResult = {
          recommendations: [],
          extractedKeywords: [],
          guides: '',
          projectContext: null,
          warnings: [],
          bestPracticeExamples: [],
          searchMetadata: null
        };

        if (execArgs.autoRecommend) {
          log('Auto-context enabled');
          autoContext = await createAutoContext(execArgs.autoRecommend);
        }

        // Context 주입 (검색 메타데이터 포함)
        const wrappedCode = `
// Auto-injected context with RAG recommendations, guides, project info, and best practices
const context = {
  recommendations: ${JSON.stringify(autoContext.recommendations, null, 2)},
  hasRecommendations: ${autoContext.recommendations.length > 0},
  bestPracticeExamples: ${JSON.stringify(autoContext.bestPracticeExamples, null, 2)},
  hasBestPractices: ${autoContext.bestPracticeExamples.length > 0},
  searchMetadata: ${JSON.stringify(autoContext.searchMetadata)},  // 검색 메타데이터 (차원, 임계값 등)
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

    sendResponse({
      jsonrpc: '2.0',
      id: (error as any)?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: errorMessage
      }
    });
  }
});

// ============= Global Error Handlers =============

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const errorMsg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';

  log('Unhandled promise rejection', {
    error: errorMsg,
    stack: stack,
    promise: String(promise)
  });

  // 프로세스를 crash하지 않고 계속 실행
  // (MCP 서버는 계속 살아있어야 함)
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  log('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });

  // Critical error이므로 프로세스 종료
  process.exit(1);
});

// 시작 메시지
process.stderr.write('MCP STDIO Server started\n');

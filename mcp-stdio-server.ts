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
import { searchBestPractices } from './mcp-servers/bestcase/searchBestPractices.js';
import { inferImportantDimensionsV2, type WeightedKeyword } from './mcp-servers/bestcase/dimensionKeywords.js';
import { globalCacheManager, generateBestPracticeCacheKey } from './mcp-servers/cache/cacheManager.js';
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

// ============= 캐시 관리 =============
// 캐시는 globalCacheManager (mcp-servers/cache/cacheManager.ts)를 사용합니다.

function clearCache(pattern?: string): void {
  if (pattern) {
    const deleted = globalCacheManager.invalidate(pattern);
    log('Cache invalidated by pattern', { pattern, deletedEntries: deleted });
  } else {
    globalCacheManager.clear();
    log('Cache cleared');
  }
}

function getCacheStats(): {
  size: number;
  maxSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  memoryUsageBytes: number;
  memoryUsageMB: number;
} {
  const stats = globalCacheManager.getStats();
  return {
    ...stats,
    memoryUsageMB: Math.round(stats.memoryUsageBytes / 1024 / 1024 * 100) / 100
  };
}

// FileCaseStorage 저장 시 캐시 클리어 콜백 설정
let onFileCaseSaved: (() => void) | null = null;
onFileCaseSaved = clearCache;

// ============= 파일 시스템 감시자 (외부 BestCase 변경 감지) =============

// 감시자 상태 관리
let currentWatcher: fs.FSWatcher | null = null;
let watcherRetryCount = 0;
const MAX_WATCHER_RETRIES = parseInt(process.env.MAX_WATCHER_RETRIES || '5');
const WATCHER_RETRY_DELAYS = (process.env.WATCHER_RETRY_DELAYS || '1000,2000,4000,8000,16000')
  .split(',')
  .map(Number);  // 지수 백오프

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
        }, parseInt(process.env.WATCHER_DEBOUNCE_MS || '3000'));  // 기본 3초 디바운스 (도커 재시작 시 다중 이벤트 방지)
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
  currentFile?: string;            // 현재 파일 내용 (키워드 추출용, optional)
  filePath?: string;               // 파일 경로 (optional, 없으면 키워드 기반 검색)
  description?: string;            // 작업 설명 (optional)
  keywords?: string[];             // 사용자 제공 키워드 (optional, 자동 추출 가능)
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

  // Windows/상대 경로를 Unix 절대 경로로 변환
  if (!filePath.startsWith('/')) {
    // Windows 절대 경로 감지 (C:\, D:\, etc.)
    if (/^[a-zA-Z]:\\/.test(filePath)) {
      const withoutDrive = filePath.replace(/^[a-zA-Z]:/, '');
      filePath = `${defaultProjectsPath}${withoutDrive.replace(/\\/g, '/')}`;
      log('Converted Windows path to Unix', { result: filePath });
    } else {
      // 상대 경로 처리
      filePath = `${defaultProjectsPath}/${filePath}`;
      log('Converted relative path to absolute', { result: filePath });
    }
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

async function getProjectContext(filePath: string, customMarkers?: string[], currentFile?: string): Promise<{
  context: any;
  warning?: string;
}> {
  try {
    // 개선: filePath에서 프로젝트 루트 추론 (커스텀 마커 지원)
    const projectPath = inferProjectRoot(filePath, customMarkers);
    log('Inferred project root', { filePath, projectPath, customMarkers });

    let context = await extractProjectContext(projectPath);

    // NEW: currentFile이 제공되면 파일 내용 분석을 통해 context 강화
    if (currentFile) {
      const { enhanceContextWithFile } = await import('./packages/ai-runner/dist/projectContext.js');
      context = enhanceContextWithFile(context, currentFile);
      log('Project context enhanced with file analysis', {
        designSystem: context.designSystemInfo.detected,
        apiType: context.apiInfo.type
      });
    }

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
    // 1. 스마트 캐시 키 생성 (동적 임계값 고려)
    const cacheKeyData = generateBestPracticeCacheKey({
      dimensions,
      fileRole,
      thresholds: dimensionThresholds,
      enableDynamicThreshold: enableDynamic
      // effectiveThresholds는 아직 모르므로 일단 제외
    });

    // 2. 캐시 조회
    const cached = globalCacheManager.get<{
      examples: any[];
      searchMetadata: any;
    }>(cacheKeyData.key);

    if (cached) {
      log('BestPractice cache hit', {
        key: cacheKeyData.key,
        examples: cached.data.examples.length
      });

      return {
        examples: cached.data.examples,
        searchMetadata: {
          ...cached.data.searchMetadata,
          cacheHit: true
        }
      };
    }

    log('BestPractice cache miss', { key: cacheKeyData.key });

    // 3. 검색 수행
    const result = await searchBestPractices({
      dimensions,
      dimensionThresholds,
      dimensionFloors,
      minFloor,
      enableDynamicThreshold: enableDynamic,
      fileRole,
      maxResults
    });

    // 4. 결과 캐싱 (실효 임계값 메타데이터 포함)
    const effectiveThresholds = result.searchMetadata.thresholdsUsed;
    const finalCacheKey = enableDynamic
      ? generateBestPracticeCacheKey({
          dimensions,
          fileRole,
          thresholds: dimensionThresholds,
          enableDynamicThreshold: enableDynamic,
          effectiveThresholds
        }).key
      : cacheKeyData.key;

    globalCacheManager.set(
      finalCacheKey,
      {
        examples: result.examples,
        searchMetadata: result.searchMetadata
      },
      {
        metadata: {
          dimensions,
          fileRole,
          originalThresholds: dimensionThresholds,
          effectiveThresholds,
          enableDynamicThreshold: enableDynamic
        }
      }
    );

    log('BestPractice result cached', {
      key: finalCacheKey,
      examples: result.examples.length,
      metadata: { effectiveThresholds }
    });

    return {
      examples: result.examples,
      searchMetadata: {
        ...result.searchMetadata,
        cacheHit: false
      }
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

  // 0-1. filePath 정규화 (Windows/상대 경로 → Unix 절대 경로)
  const defaultProjectsPath = process.env.PROJECTS_PATH || '/projects';
  if (options.filePath && !options.filePath.startsWith('/')) {
    // Windows 절대 경로 감지 (C:\, D:\, etc.)
    if (/^[a-zA-Z]:\\/.test(options.filePath)) {
      // Windows 경로를 Unix 스타일로 변환
      // D:\01.Work\01.Projects\... → /projects/01.Work/01.Projects/...
      const withoutDrive = options.filePath.replace(/^[a-zA-Z]:/, '');
      options.filePath = `${defaultProjectsPath}${withoutDrive.replace(/\\/g, '/')}`;
      log('Normalized Windows path to Unix', { filePath: options.filePath });
    } else {
      // 상대 경로 처리
      options.filePath = `${defaultProjectsPath}/${options.filePath}`;
      log('Normalized relative path to absolute', { filePath: options.filePath });
    }
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

  // 1. ✅ 프로젝트 컨텍스트 분석 먼저 실행 (package.json에서 apiType 읽기)
  let projectContext = null;
  if (!mergedOptions.skipProjectContext) {
    log('Extracting project context...', { customMarkers: mergedOptions.projectMarkers });
    const contextResult = await getProjectContext(
      mergedOptions.filePath,
      mergedOptions.projectMarkers,
      mergedOptions.currentFile  // NEW: 파일 내용 전달
    );
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

  // 2. RAG 추천 가져오기
  log('Fetching RAG recommendations...');
  const ragResult = await fetchRecommendations(mergedOptions);
  if (ragResult.warnings.length > 0) {
    warnings.push(...ragResult.warnings);
  }

  const recommendations = ragResult.recommendations;
  const extractedKeywords = ragResult.keywords;
  log('RAG recommendations', { count: recommendations.length, keywords: extractedKeywords });

  // 3. ✅ 가이드 자동 로딩 (projectContext의 apiType 우선 사용)
  let autoLoadedGuides = '';
  const hasSearchableContent = recommendations.length > 0 || extractedKeywords.length > 0 || mergedOptions.description;

  if (!mergedOptions.skipGuideLoading && hasSearchableContent) {
    log('Auto-loading guides...', {
      hasRecommendations: recommendations.length > 0,
      hasKeywords: extractedKeywords.length > 0,
      hasDescription: !!mergedOptions.description
    });

    // ✅ apiType: projectContext에서 먼저 가져오고, 없으면 recommendations에서 추론
    const { allKeywords, apiType: apiTypeFromRecs } = recommendations.length > 0
      ? analyzeRecommendations(recommendations, extractedKeywords)
      : { allKeywords: extractedKeywords, apiType: undefined };

    const apiType = projectContext?.apiInfo?.type || apiTypeFromRecs;

    const guideResult = await loadGuidesForKeywords(
      allKeywords,
      apiType,
      recommendations[0]?.projectName || 'unknown',
      {
        maxGuides: mergedOptions.maxGuides || 10,  // 기본값 5 → 10으로 증가
        maxLength: mergedOptions.maxGuideLength || 50000,
        mandatoryIds: mergedOptions.mandatoryGuideIds || ['00-bestcase-priority']
      }
    );

    autoLoadedGuides = guideResult.combined;
    if (guideResult.warning) {
      warnings.push(guideResult.warning);
    }
    log('Guides loaded', { count: guideResult.count, length: autoLoadedGuides.length, apiType });
  } else if (!hasSearchableContent) {
    log('No searchable content (recommendations, keywords, or description), skipping guide loading');
  }


  // 4. 다차원 점수 기반 우수 코드 검색
  let bestPracticeExamples: any[] = [];
  let searchMetadata: any = null;
  const maxBestPractices = mergedOptions.maxBestPractices !== undefined ? mergedOptions.maxBestPractices : 5;  // 기본값 3 → 5로 증가

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
    const normalizedPath = mergedOptions.filePath?.toLowerCase() || '';

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
    if (!inferredRole && projectContext && mergedOptions.filePath) {
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

    // 중요 차원 추론 (V2: TF-IDF 스타일 + 가중치)
    const customKeywordsWeighted: Partial<Record<keyof BestCaseScores, WeightedKeyword[]>> | undefined =
      mergedOptions.customKeywords
        ? Object.fromEntries(
            Object.entries(mergedOptions.customKeywords).map(([dim, keywords]) => [
              dim,
              keywords?.map(k => ({ keyword: k, weight: 2.0 })) || []
            ])
          )
        : undefined;

    const dimensionInference = inferImportantDimensionsV2(
      mergedOptions.description,
      extractedKeywords,
      customKeywordsWeighted,
      3  // 최대 3개 차원
    );

    const importantDimensions = dimensionInference.dimensions;

    log('Important dimensions inferred (V2)', {
      dimensions: importantDimensions,
      scores: dimensionInference.scores,
      details: dimensionInference.details.map(d => ({
        dimension: d.dimension,
        score: d.score.toFixed(2),
        matchedKeywords: d.matchedKeywords.slice(0, 3)
      }))
    });

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

        // autoRecommend 자동 활성화: 항상 켜져 있음 (비용 절감 및 최대 활용)
        let shouldAutoRecommend = !!execArgs.autoRecommend;
        let autoRecommendOptions = execArgs.autoRecommend;

        // 기본 프로젝트 경로
        const defaultProjectsPath = process.env.PROJECTS_PATH || '/projects';

        if (!shouldAutoRecommend) {
          // 코드에서 프로젝트 파일 경로 자동 감지 시도

          // Windows 절대 경로: C:\path\to\file.vue 또는 D:\path\to\file.ts
          const windowsAbsPattern = /['"`]([a-zA-Z]:[\\/][^'"`]+\.(?:vue|ts|js|tsx|jsx|json|css|scss))['"`]/;

          // Unix 절대 경로: /path/to/file.vue 또는 /projects/path/to/file.ts
          const unixAbsPattern = /['"`](\/[^'"`]+\.(?:vue|ts|js|tsx|jsx|json|css|scss))['"`]/;

          let detectedPath: string | undefined = undefined;

          // Windows 절대 경로 시도
          const windowsMatch = execArgs.code.match(windowsAbsPattern);
          if (windowsMatch) {
            detectedPath = windowsMatch[1];
            log('Auto-detected Windows file path', { filePath: detectedPath });
          }

          // Unix 절대 경로 시도 (프로젝트 경로 내부인지 확인)
          if (!detectedPath) {
            const unixMatch = execArgs.code.match(unixAbsPattern);
            if (unixMatch && unixMatch[1].startsWith(defaultProjectsPath)) {
              detectedPath = unixMatch[1];
              log('Auto-detected Unix file path', { filePath: detectedPath });
            }
          }

          // ✅ MCP 설정 로드: detectedPath로부터 프로젝트 루트 추론
          let projectRoot = defaultProjectsPath;
          if (detectedPath) {
            projectRoot = inferProjectRoot(detectedPath);
            log('Inferred project root for MCP config', { detectedPath, projectRoot });
          }
          const mcpConfig = loadMCPConfig(projectRoot);

          // 파일 경로 유무와 상관없이 항상 autoRecommend 활성화
          // 경로가 없으면 키워드 기반 검색만 수행
          autoRecommendOptions = {
            currentFile: execArgs.code,  // 💡 코드 내용 전달 (키워드 추출용)
            filePath: detectedPath, // undefined면 키워드 기반 검색
            keywords: [], // createAutoContext에서 코드 내용 분석해서 자동 추출
            ...mcpConfig?.autoRecommendDefaults
          };
          shouldAutoRecommend = true;

          if (detectedPath) {
            log('AutoRecommend enabled (always-on)', { mode: 'file-based', filePath: detectedPath, projectRoot });
          } else {
            log('AutoRecommend enabled (always-on)', { mode: 'keyword-based', codeLength: execArgs.code?.length });
          }
        }

        log('Executing code', {
          codeLength: execArgs.code?.length,
          autoRecommendEnabled: shouldAutoRecommend,  // 실제 활성화 여부
          userProvidedAutoRecommend: !!execArgs.autoRecommend  // 사용자가 제공했는지 여부
        });

        if (shouldAutoRecommend && autoRecommendOptions) {
          log('Fetching auto-context (RAG + guides + project info)...');
          autoContext = await createAutoContext(autoRecommendOptions);
          log('Auto-context fetched', {
            recommendations: autoContext.recommendations.length,
            guides: autoContext.guides.length,
            keywords: autoContext.extractedKeywords.length,
            warnings: autoContext.warnings.length
          });
        }

        // Context 주입 (검색 메타데이터 포함)
        // 안전한 직렬화: JSON.stringify를 한 번만 사용하여 구문 오류 방지
        const contextObject = {
          recommendations: autoContext.recommendations,
          hasRecommendations: autoContext.recommendations.length > 0,
          bestPracticeExamples: autoContext.bestPracticeExamples,
          hasBestPractices: autoContext.bestPracticeExamples.length > 0,
          searchMetadata: autoContext.searchMetadata,
          guides: autoContext.guides,
          hasGuides: autoContext.guides.length > 0,
          projectContext: autoContext.projectContext,
          extractedKeywords: autoContext.extractedKeywords,
          warnings: autoContext.warnings
        };

        // ✅ Context 객체를 코드에 직접 주입 (템플릿 리터럴 특수 문자 문제 방지)
        let contextJson: string;
        try {
          contextJson = JSON.stringify(contextObject);
        } catch (stringifyError) {
          const errorMsg = stringifyError instanceof Error ? stringifyError.message : String(stringifyError);
          log('Context serialization failed, using minimal context', { error: errorMsg });
          // Fallback: 최소한의 컨텍스트만 제공
          contextJson = JSON.stringify({
            recommendations: [],
            hasRecommendations: false,
            bestPracticeExamples: [],
            hasBestPractices: false,
            searchMetadata: null,
            guides: '',
            hasGuides: false,
            projectContext: null,
            extractedKeywords: [],
            warnings: [`Context serialization failed: ${errorMsg}`, ...autoContext.warnings]
          });
        }

        // ✅ 사용자 코드의 템플릿 리터럴 특수 문자 이스케이프
        const escapedUserCode = execArgs.code
          .replace(/\\/g, '\\\\')   // 백슬래시 이스케이프
          .replace(/`/g, '\\`')     // 백틱 이스케이프
          .replace(/\$/g, '\\$');   // $ 이스케이프

        const wrappedCode = `
// ============================================================
// 🎯 AUTO-INJECTED CONTEXT - 코드 작성 시 반드시 참고하세요!
// ============================================================
//
// 📚 사용 가능한 Context:
//
// 1. context.recommendations - 유사한 코드 (${autoContext.recommendations.length}개) 📋
//    목적: 현재 작업과 비슷한 파일 참고 (구조 복사용)
//    포함: filePath, content, keywords, similarity
//    활용: 전체 구조와 패턴을 참고하여 빠르게 시작
//    예시: context.recommendations[0].content
//
// 2. context.bestPracticeExamples - 우수한 코드 (${autoContext.bestPracticeExamples.length}개) ⭐
//    목적: 특정 차원에서 우수한 파일 참고 (품질 개선용)
//    포함: filePath, content, excellentIn, topScore, scores
//    활용: API 연결, 에러 처리 등 우수 패턴 학습
//    예시: context.bestPracticeExamples[0].content
//    차원: apiConnection, errorHandling, typeUsage, stateManagement 등
//
// 3. context.guides - 가이드 문서 📖
//    목적: 프로젝트 지침 및 모범 사례
//    포함: API 연결 방법, 에러 처리 패턴, 디자인 시스템 사용법
//    활용: 필수 지침을 준수하여 일관성 유지
//
// 4. context.projectContext - 프로젝트 정보 🏗️
//    목적: 프로젝트 환경 이해
//    포함: apiInfo.type (grpc/rest/graphql), designSystem, framework
//
// 💡 활용 우선순위:
//    1단계: recommendations로 구조 파악 (비슷한 코드)
//    2단계: bestPracticeExamples로 품질 개선 (우수한 패턴)
//    3단계: guides로 지침 확인 (필수 규칙)
//
// ⚠️ 중요한 규칙:
// - ❌ export default / export const / import 문법 사용 금지 (샌드박스 제약)
// - ✅ 변수 할당 후 마지막 표현식으로 반환
// - ✅ recommendations의 구조 + bestPracticeExamples의 품질 패턴 결합
// - ✅ guides의 필수 지침 준수
//
// 예시:
//   const result = \`<template>...</template>\`;
//   result;  // 마지막 표현식이 자동 반환됨
//
// ============================================================

const context = ${contextJson};

// ============================================================
// 📝 User code starts here
// ============================================================
${escapedUserCode}
`;
        const result = await runAgentScript({
          code: wrappedCode,
          timeoutMs: execArgs.timeoutMs || 30000
        });
        log('Execution result', { success: !result.error });

        // 응답 생성 (안전한 JSON 직렬화)
        let responseText: string;
        try {
          const responseData = {
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
            // ✅ 가이드 내용을 LLM 응답에 포함 (LLM이 가이드를 보고 활용 가능)
            guides: autoContext.guides.length > 0 ? autoContext.guides : undefined,
            guidesLoaded: autoContext.guides.length > 0,
            guidesLength: autoContext.guides.length,
            // ✅ BestCase 우수 사례를 LLM 응답에 포함 (LLM이 품질 패턴 학습 가능)
            bestPracticeExamples: autoContext.bestPracticeExamples.length > 0
              ? autoContext.bestPracticeExamples.map(bp => ({
                  filePath: bp.filePath,
                  fileRole: bp.fileRole,
                  excellentIn: bp.excellentIn,
                  topScore: bp.topScore,
                  scores: bp.scores,
                  keywords: bp.keywords,
                  content: bp.content,
                  analysis: bp.analysis
                }))
              : undefined,
            // ✅ Always include projectInfo (even if projectContext is null)
            projectInfo: {
              apiType: autoContext.projectContext?.apiInfo?.type || 'unknown',
              apiPackages: autoContext.projectContext?.apiInfo?.packages || [],
              apiConfidence: autoContext.projectContext?.apiInfo?.confidence || 'low',
              designSystem: autoContext.projectContext?.designSystemInfo?.detected || [],
              utilityLibrary: autoContext.projectContext?.utilityLibraryInfo?.detected || [],
              framework: autoContext.projectContext?.framework,
              hasPackageJson: autoContext.projectContext?.hasPackageJson || false
            },
            extractedKeywords: autoContext.extractedKeywords.length > 0
              ? autoContext.extractedKeywords
              : undefined,
            // 검색 메타데이터 포함
            searchMetadata: autoContext.searchMetadata || undefined,
            // 경고 메시지 포함
            warnings: autoContext.warnings.length > 0
              ? autoContext.warnings
              : undefined
          };

          // JSON 직렬화 (포맷팅 없이 압축)
          responseText = JSON.stringify(responseData);
          log('Response serialized', { size: responseText.length });
        } catch (serializeError) {
          const errorMsg = serializeError instanceof Error ? serializeError.message : String(serializeError);
          log('Response serialization failed, using fallback', { error: errorMsg });

          // Fallback: content 제외하고 재시도
          responseText = JSON.stringify({
            ok: result.ok,
            output: result.output,
            logs: result.logs,
            error: result.error,
            recommendations: autoContext.recommendations.length > 0
              ? autoContext.recommendations.map(r => ({
                  filePath: r.filePath,
                  fileRole: r.fileRole,
                  keywords: r.keywords,
                  similarity: r.similarity,
                  contentPreview: r.content ? r.content.substring(0, 500) + '... [truncated]' : '[No content]',
                  analysis: r.analysis
                }))
              : undefined,
            guides: autoContext.guides.length > 0
              ? autoContext.guides.substring(0, 10000) + '... [truncated]'
              : undefined,
            guidesLoaded: autoContext.guides.length > 0,
            guidesLength: autoContext.guides.length,
            bestPracticeExamples: autoContext.bestPracticeExamples.length > 0
              ? autoContext.bestPracticeExamples.map((bp: any) => ({
                  filePath: bp.filePath,
                  fileRole: bp.fileRole,
                  excellentIn: bp.excellentIn,
                  topScore: bp.topScore,
                  scores: bp.scores,
                  keywords: bp.keywords,
                  contentPreview: bp.content ? bp.content.substring(0, 500) + '... [truncated]' : '[No content]'
                }))
              : undefined,
            // ✅ Always include projectInfo (even if projectContext is null)
            projectInfo: {
              apiType: autoContext.projectContext?.apiInfo?.type || 'unknown',
              apiPackages: autoContext.projectContext?.apiInfo?.packages || [],
              apiConfidence: autoContext.projectContext?.apiInfo?.confidence || 'low',
              designSystem: autoContext.projectContext?.designSystemInfo?.detected || [],
              utilityLibrary: autoContext.projectContext?.utilityLibraryInfo?.detected || [],
              framework: autoContext.projectContext?.framework,
              hasPackageJson: autoContext.projectContext?.hasPackageJson || false
            },
            extractedKeywords: autoContext.extractedKeywords.length > 0
              ? autoContext.extractedKeywords
              : undefined,
            searchMetadata: autoContext.searchMetadata ? {
              totalResults: autoContext.searchMetadata.totalResults,
              vectorCount: autoContext.searchMetadata.vectorCount,
              keywordCount: autoContext.searchMetadata.keywordCount,
              cacheHit: autoContext.searchMetadata.cacheHit,
              dimensions: autoContext.searchMetadata.dimensions
            } : undefined,
            warnings: ['Response too large, content truncated', ...autoContext.warnings]
          });
        }

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

    log('Error handling request', { error: errorMessage, stack: errorStack });

    sendResponse({
      jsonrpc: '2.0',
      id: request?.id || null,
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

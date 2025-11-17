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

const fileCaseStorage = new FileCaseStorage();

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
  maxBestPractices?: number;       // 최대 우수 사례 수 (기본: 3)
  skipBestPracticeSearch?: boolean; // 다차원 검색 건너뛰기
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
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function log(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = data
    ? `[${timestamp}] ${message}: ${JSON.stringify(data)}`
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
 * 요청에서 중요한 점수 차원 추론
 *
 * 사용자 요청을 분석하여 어떤 점수 차원이 중요한지 결정합니다.
 */
function inferImportantDimensions(description: string, keywords: string[]): Array<keyof BestCaseScores> {
  const dimensions: Array<keyof BestCaseScores> = [];
  const descLower = description.toLowerCase();
  const allKeywords = keywords.map(k => k.toLowerCase());
  const combined = descLower + ' ' + allKeywords.join(' ');

  // API 연결 관련
  if (combined.includes('api') || combined.includes('grpc') || combined.includes('rest') ||
      combined.includes('fetch') || combined.includes('axios') || combined.includes('client')) {
    dimensions.push('apiConnection');
  }

  // 에러 처리 관련
  if (combined.includes('error') || combined.includes('에러') || combined.includes('try') ||
      combined.includes('catch') || combined.includes('예외') || combined.includes('validation')) {
    dimensions.push('errorHandling');
  }

  // 타입 관련
  if (combined.includes('type') || combined.includes('interface') || combined.includes('타입') ||
      combined.includes('typescript') || combined.includes('정의')) {
    dimensions.push('typeUsage');
  }

  // 상태 관리 관련
  if (combined.includes('state') || combined.includes('store') || combined.includes('pinia') ||
      combined.includes('상태') || combined.includes('reactive') || combined.includes('ref')) {
    dimensions.push('stateManagement');
  }

  // 디자인 시스템 관련
  if (combined.includes('element') || combined.includes('el-') || combined.includes('ui') ||
      combined.includes('component') || combined.includes('컴포넌트') || combined.includes('디자인')) {
    dimensions.push('designSystem');
  }

  // 구조/패턴 관련
  if (combined.includes('structure') || combined.includes('pattern') || combined.includes('구조') ||
      combined.includes('패턴') || combined.includes('아키텍처') || combined.includes('composable')) {
    dimensions.push('structure');
  }

  // 성능 관련
  if (combined.includes('performance') || combined.includes('성능') || combined.includes('최적화') ||
      combined.includes('optimize') || combined.includes('lazy') || combined.includes('cache')) {
    dimensions.push('performance');
  }

  // 유틸리티 관련
  if (combined.includes('utility') || combined.includes('helper') || combined.includes('util') ||
      combined.includes('유틸') || combined.includes('헬퍼')) {
    dimensions.push('utilityUsage');
  }

  // 기본값: 구조와 API 연결
  if (dimensions.length === 0) {
    dimensions.push('structure', 'apiConnection');
  }

  return dimensions;
}

/**
 * 다차원 점수 기반 우수 코드 검색
 *
 * 특정 차원에서 높은 점수를 가진 파일을 검색합니다.
 */
async function searchBestPracticeExamples(
  dimensions: Array<keyof BestCaseScores>,
  fileRole?: string,
  maxResults: number = 3
): Promise<{
  examples: any[];
  warning?: string;
}> {
  try {
    const results: any[] = [];
    const seenIds = new Set<string>();

    // 각 차원별로 최고 점수 파일 검색
    for (const dimension of dimensions) {
      if (results.length >= maxResults) break;

      const query: any = {
        minScores: { [dimension]: 75 },  // 75점 이상인 파일
        limit: 2  // 차원당 최대 2개
      };

      if (fileRole) {
        query.fileRole = fileRole;
      }

      const cases = await fileCaseStorage.search(query);

      // 중복 제거하며 추가
      for (const fileCase of cases) {
        if (!seenIds.has(fileCase.id) && results.length < maxResults) {
          seenIds.add(fileCase.id);
          results.push({
            id: fileCase.id,
            projectName: fileCase.projectName,
            filePath: fileCase.filePath,
            fileRole: fileCase.fileRole,
            excellentIn: dimension,
            score: fileCase.scores[dimension],
            keywords: fileCase.keywords.slice(0, 10),
            content: fileCase.content,
            analysis: {
              linesOfCode: fileCase.analysis.linesOfCode,
              apiMethods: fileCase.analysis.apiMethods,
              componentsUsed: fileCase.analysis.componentsUsed,
              patterns: fileCase.analysis.patterns
            }
          });
        }
      }
    }

    log('Best practice search results', { dimensions, found: results.length });

    return { examples: results };
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
  if (!options.skipBestPracticeSearch && (recommendations.length > 0 || extractedKeywords.length > 0)) {
    log('Searching best practice examples...');

    // 파일 역할 추론
    let inferredRole: string | undefined;
    if (options.filePath.includes('pages/')) inferredRole = 'page';
    else if (options.filePath.includes('components/')) inferredRole = 'component';
    else if (options.filePath.includes('composables/')) inferredRole = 'composable';
    else if (options.filePath.includes('stores/')) inferredRole = 'store';

    // 중요 차원 추론
    const importantDimensions = inferImportantDimensions(options.description, extractedKeywords);
    log('Important dimensions', { dimensions: importantDimensions });

    // 다차원 검색
    const bestPracticeResult = await searchBestPracticeExamples(
      importantDimensions,
      inferredRole,
      options.maxBestPractices || 3  // 기본값 3개 예제
    );

    bestPracticeExamples = bestPracticeResult.examples;
    if (bestPracticeResult.warning) {
      warnings.push(bestPracticeResult.warning);
    }

    log('Best practice examples loaded', {
      count: bestPracticeExamples.length,
      excellentIn: bestPracticeExamples.map(e => e.excellentIn)
    });
  } else if (options.skipBestPracticeSearch) {
    log('Best practice search skipped by user');
  }

  return {
    recommendations,
    extractedKeywords,
    guides: autoLoadedGuides,
    projectContext,
    warnings,
    bestPracticeExamples
  };
}

// ============= 요청 처리 =============

rl.on('line', async (line: string) => {
  try {
    const request = JSON.parse(line) as JsonRpcRequest;
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
                        description: 'Maximum number of best practice examples to load (default: 3)',
                        default: 3
                      },
                      skipBestPracticeSearch: {
                        type: 'boolean',
                        description: 'Skip multi-dimensional best practice search',
                        default: false
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
          bestPracticeExamples: []
        };

        if (execArgs.autoRecommend) {
          log('Auto-context enabled');
          autoContext = await createAutoContext(execArgs.autoRecommend);
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

// 시작 메시지
process.stderr.write('MCP STDIO Server started\n');

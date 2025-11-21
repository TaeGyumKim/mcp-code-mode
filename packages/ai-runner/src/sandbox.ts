import { VM } from 'vm2';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as filesystem from '../../../mcp-servers/filesystem/index.js';
import * as bestcase from '../../../mcp-servers/bestcase/index.js';
import * as guides from '../../../mcp-servers/guides/dist/index.js';
import { MetadataAnalyzer } from '../../llm-analyzer/src/metadataAnalyzer.js';
import * as designSystemMapping from '../../llm-analyzer/src/designSystemMapping.js';
import * as utilityLibraryMapping from '../../llm-analyzer/src/utilityLibraryMapping.js';
import { compareBestCaseMetadata } from '../../llm-analyzer/src/bestcaseComparator.js';
import { extractProjectContext, type ProjectContext } from './projectContext.js';

export interface SandboxResult {
  ok: boolean;
  output?: any;
  logs?: string[];
  error?: string;
}

/**
 * 문자열과 주석을 정확하게 제거하는 헬퍼 함수
 *
 * 이스케이프 문자와 중첩된 템플릿 리터럴을 올바르게 처리합니다.
 * @internal - 테스트용으로만 export됨
 */
export function removeStringsAndComments(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];

    // 1. 블록 주석 제거: /* ... */
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      result += ' '; // 공백으로 대체
      continue;
    }

    // 2. 라인 주석 제거: // ...
    if (char === '/' && nextChar === '/') {
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      result += '\n'; // 줄바꿈 유지
      i++;
      continue;
    }

    // 3. 정규식 리터럴 제거: /pattern/flags
    // 정규식은 = ( [ , ; : ! & | ? + - * / % return new 등 뒤에 올 수 있음
    if (char === '/' && /[=(\[,;:!&|?+\-*/%\s]/.test(code[i - 1] || ' ')) {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }
        if (code[i] === '/') {
          i++;
          // flags (g, i, m 등) 건너뛰기
          while (i < code.length && /[gimsuvy]/.test(code[i])) {
            i++;
          }
          break;
        }
        i++;
      }
      continue;
    }

    // 4. 템플릿 리터럴 제거: `...`
    if (char === '`') {
      result += '""';
      i++;
      let templateDepth = 1;

      while (i < code.length && templateDepth > 0) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }

        // 템플릿 표현식 시작: ${
        if (code[i] === '$' && code[i + 1] === '{') {
          i += 2;
          let braceDepth = 1;

          // 중괄호 균형 맞춰서 표현식 끝 찾기
          while (i < code.length && braceDepth > 0) {
            if (code[i] === '\\') {
              i += 2;
              continue;
            }
            if (code[i] === '{') braceDepth++;
            if (code[i] === '}') braceDepth--;

            // 표현식 내부의 문자열은 재귀적으로 처리하지 않고 단순 건너뛰기
            if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
              const quote = code[i];
              i++;
              while (i < code.length) {
                if (code[i] === '\\') {
                  i += 2;
                  continue;
                }
                if (code[i] === quote) {
                  i++;
                  break;
                }
                i++;
              }
              continue;
            }

            i++;
          }
          continue;
        }

        if (code[i] === '`') {
          templateDepth--;
          i++;
          break;
        }

        i++;
      }
      continue;
    }

    // 5. 큰따옴표 문자열 제거: "..."
    if (char === '"') {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }
        if (code[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // 6. 작은따옴표 문자열 제거: '...'
    if (char === "'") {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2; // 이스케이프 문자 건너뛰기
          continue;
        }
        if (code[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // 7. 일반 문자 추가
    result += char;
    i++;
  }

  return result;
}

/**
 * TypeScript 문법 감지 (템플릿 리터럴 및 문자열 내부 제외)
 * @internal - 테스트용으로만 export됨
 */
export function detectTypeScriptSyntax(code: string): boolean {
  const cleanedCode = removeStringsAndComments(code);

  // 1. interface 선언
  const hasInterface = /\binterface\s+\w+/.test(cleanedCode);

  // 2. type alias 선언
  const hasTypeAlias = /\btype\s+\w+\s*=/.test(cleanedCode);

  // 3. 변수 선언 타입 어노테이션: const/let/var name: Type
  const hasVariableTypeAnnotation = /\b(const|let|var)\s+\w+\s*:\s*\w+/.test(cleanedCode);

  // 4. 함수 파라미터 타입 어노테이션: (name: Type) 또는 (name?: Type)
  const hasParameterTypeAnnotation = /\(\s*\w+\s*\??\s*:\s*\w+/.test(cleanedCode);

  // 5. 함수 반환 타입: ): Type { 또는 ): Type =>
  const hasFunctionReturnType = /\)\s*:\s*\w+\s*(\{|=>)/.test(cleanedCode);

  // 6. as 타입 어설션: value as Type
  const hasTypeAssertion = /\bas\s+\w+/.test(cleanedCode);

  // 7. enum 선언: enum Name { ... }
  const hasEnum = /\benum\s+\w+\s*\{/.test(cleanedCode);

  // 8. 제네릭 꺾쇠괄호: Array<Type>, func<Type>()
  const hasGeneric = /<\w+[\w\s,|&]*>/.test(cleanedCode);

  // 9. namespace/module 선언: namespace Name { ... }
  const hasNamespace = /\bnamespace\s+\w+\s*\{/.test(cleanedCode);

  // 10. declare 선언: declare const/function/class/var
  const hasDeclare = /\bdeclare\s+(const|let|var|function|class|namespace|module|enum|type|interface)/.test(cleanedCode);

  // 11. readonly 접근 제어자
  const hasReadonly = /\breadonly\s+\w+\s*:/.test(cleanedCode);

  // 12. public/private/protected 접근 제어자
  const hasAccessModifier = /\b(public|private|protected)\s+\w+\s*:/.test(cleanedCode);

  // 13. Non-null assertion: value!
  const hasNonNullAssertion = /\w+!\s*\./.test(cleanedCode);

  return (
    hasInterface ||
    hasTypeAlias ||
    hasVariableTypeAnnotation ||
    hasParameterTypeAnnotation ||
    hasFunctionReturnType ||
    hasTypeAssertion ||
    hasEnum ||
    hasGeneric ||
    hasNamespace ||
    hasDeclare ||
    hasReadonly ||
    hasAccessModifier ||
    hasNonNullAssertion
  );
}

/**
 * JSX/TSX 문법 감지 (템플릿 리터럴 및 문자열 내부 제외)
 */
function detectJSXSyntax(code: string): boolean {
  const cleanedCode = removeStringsAndComments(code);

  // JSX 패턴: const variable = <tag> 형식
  const hasJSXAssignment = /=\s*<\w+/.test(cleanedCode);

  // JSX 태그가 코드 문맥에서 실제로 사용되는지 확인
  const hasJSXTags = /<(template|div|span|p|section|header|footer|main|article|aside|nav|ul|ol|li|table|tr|td|th|form|input|button|a|img|svg|path|circle|rect|line|polygon|polyline|text|g|defs|clipPath|mask|pattern|linearGradient|radialGradient)\b/.test(cleanedCode);

  return hasJSXAssignment || hasJSXTags;
}

/**
 * ES6 module 문법 감지 (템플릿 리터럴 및 문자열 내부 제외)
 */
function detectES6ModuleSyntax(code: string): boolean {
  const cleanedCode = removeStringsAndComments(code);

  // ES6 module 키워드 감지
  const hasImport = /^\s*import\s+/m.test(cleanedCode);  // 줄 시작에 import
  const hasExport = /^\s*export\s+/m.test(cleanedCode);  // 줄 시작에 export

  return hasImport || hasExport;
}

/**
 * TypeScript를 JavaScript로 트랜스파일
 *
 * TypeScript Compiler API를 사용하여 완벽한 TypeScript 지원 제공
 */
async function transpileTypeScript(code: string): Promise<string> {
  try {
    // 동적 import로 TypeScript 로드 (빌드 시 번들링 방지)
    const ts = await import('typescript');

    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        removeComments: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
      }
    });

    return result.outputText;
  } catch (error) {
    // 트랜스파일 실패 시 원본 코드 반환
    console.error('[transpileTypeScript] Failed to transpile:', error instanceof Error ? error.message : String(error));
    return code;
  }
}

/**
 * import/require 문 자동 제거 및 IIFE unwrap (전처리)
 *
 * vm2에서는 import/require가 차단되지만,
 * 사용자 편의를 위해 import/require 문을 자동으로 제거합니다.
 * fs, path 등은 sandbox에 직접 주입되므로 import/require 불필요합니다.
 *
 * 또한 최상위 IIFE를 자동으로 unwrap하여 중복 wrap을 방지합니다.
 */
async function preprocessCode(code: string): Promise<string> {
  // 0. 코드 앞뒤 공백 제거
  code = code.trim();

  // 1. TypeScript 문법이 있으면 먼저 JavaScript로 변환
  let wasTranspiled = false;
  if (detectTypeScriptSyntax(code)) {
    console.error('[preprocessCode] TypeScript detected, transpiling to JavaScript...');
    code = await transpileTypeScript(code);
    wasTranspiled = true;
  }

  // 2. import 문 제거 (여러 줄에 걸친 것도 포함)
  // import type { ... } from '...'; 제거
  code = code.replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*/g, '');
  code = code.replace(/import\s+type\s+[\w*]+\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // import { ... } from '...'; 제거 (여러 줄 가능)
  code = code.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // import * as Name from '...'; 제거
  code = code.replace(/import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // import Name from '...'; 제거
  code = code.replace(/import\s+\w+\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // import Name, { ... } from '...'; 제거
  code = code.replace(/import\s+\w+,\s*\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // import '...'; 제거
  code = code.replace(/import\s+['"][^'"]+['"];?\s*/g, '');

  // 3. TypeScript 타입 어노테이션 제거 (TypeScript transpiler를 거치지 않은 경우만)
  // TypeScript transpiler가 이미 모든 타입을 제거했으므로, 추가 regex 처리는 불필요하고 위험함
  //
  // 주의: 만약 TypeScript 문법이 없는 경우, regex 기반 타입 제거는 위험하므로 최소한만 적용
  if (!wasTranspiled) {
    // Vue PropType 제거만 안전하게 적용: as PropType<...> -> (빈 문자열)
    code = code.replace(/\s+as\s+PropType<[^>]+>/g, '');

    // 나머지 TypeScript 관련 제거는 TypeScript transpiler가 처리하도록 함
    // (regex 기반 타입 제거는 object literal의 콜론을 망가뜨릴 수 있어 위험)
  }

  // 4. named exports 제거
  code = code.replace(/export\s*\{[^}]*\}\s*;?\s*/gm, '');

  // 5. export const/let/var/function/class 제거
  code = code.replace(/export\s+(const|let|var|function|class|async\s+function)\s+/g, '$1 ');

  // 6. export default 처리
  if (code.includes('export default')) {
    // 6a. export default async function
    code = code.replace(
      /export\s+default\s+async\s+function(\s+\w+)?\s*\(([^)]*)\)\s*\{/g,
      'await (async function$1($2) {'
    );

    // 6b. export default function
    code = code.replace(
      /export\s+default\s+function(\s+\w+)?\s*\(([^)]*)\)\s*\{/g,
      '(function$1($2) {'
    );

    // 6c. ✅ IIFE 패턴이 코드 내 어디든 존재하면 )(를 추가
    // (context injection으로 인해 코드 시작 부분이 아닐 수 있음)
    if (/(?:await\s+)?\((?:async\s+)?function/.test(code)) {
      code = code.trimEnd();
      if (!code.endsWith(')()') && !code.endsWith(')();')) {
        code += ')()';
      }
    }

    // 6d. export default class
    code = code.replace(/export\s+default\s+class/g, 'class');

    // 6e. ✅ export default 객체 리터럴 처리
    // 객체 리터럴이 statement position에 오면 block으로 해석되는 문제 방지
    // export default { ... }; → return { ... };
    code = code.replace(/export\s+default\s+(\{[\s\S]*?\})\s*;?/g, 'return $1;');

    // 6f. 나머지 export default (배열, 문자열, 숫자 등)
    code = code.replace(/export\s+default\s+/g, 'return ');
  }

  return code;
}

/**
 * TypeScript 코드를 안전한 샌드박스에서 실행합니다
 *
 * Anthropic MCP Code Mode 방식:
 * - MCP 도구를 최소화 (execute 하나)
 * - Sandbox API로 기능 제공
 * - 클라이언트가 TypeScript 코드 작성
 *
 * 사용 가능한 API:
 * - filesystem: 파일 읽기/쓰기/검색
 * - bestcase: BestCase 저장/로드/검색
 * - guides: 가이드 검색/로드/병합
 * - metadata: 메타데이터 추출 및 분석
 */
export async function runInSandbox(code: string, timeoutMs: number = 30000): Promise<SandboxResult> {
  const logs: string[] = [];

  // ✅ import/export 문 자동 제거 및 코드 전처리
  const preprocessedCode = await preprocessCode(code);

  try {

    const vm = new VM({
      timeout: timeoutMs,
      sandbox: {
        // Node.js 기본 모듈 (안전한 모듈만 주입)
        fs,      // fs.promises (비동기만)
        path,    // 경로 유틸리티

        // Filesystem API
        filesystem,

        // BestCase API
        bestcase,

        // Guides API (동적 가이드 로딩)
        guides,

        // ===== Vue 3 / Nuxt 3 Mock Functions =====
        // Vue Composition API
        ref: (value: any) => ({ value }),
        computed: (getter: () => any) => ({ value: getter() }),
        watch: () => {},
        watchEffect: () => {},
        onMounted: () => {},
        onUnmounted: () => {},
        onBeforeMount: () => {},
        onBeforeUnmount: () => {},
        onUpdated: () => {},
        onBeforeUpdate: () => {},
        reactive: (obj: any) => obj,
        readonly: (obj: any) => obj,
        toRef: (obj: any, key: string) => ({ value: obj[key] }),
        toRefs: (obj: any) => obj,
        isRef: (val: any) => false,
        unref: (val: any) => val,
        shallowRef: (value: any) => ({ value }),
        triggerRef: () => {},
        customRef: () => ({ value: undefined }),
        shallowReactive: (obj: any) => obj,
        shallowReadonly: (obj: any) => obj,
        toRaw: (obj: any) => obj,
        markRaw: (obj: any) => obj,
        provide: () => {},
        inject: () => undefined,
        nextTick: async () => {},

        // Nuxt Composables
        definePageMeta: () => {},
        defineNuxtComponent: () => ({}),
        defineNuxtPlugin: () => {},
        defineNuxtRouteMiddleware: () => {},
        useRouter: () => ({
          push: () => {},
          replace: () => {},
          go: () => {},
          back: () => {},
          forward: () => {},
          currentRoute: { value: {} }
        }),
        useRoute: () => ({
          path: '/',
          query: {},
          params: {},
          hash: '',
          fullPath: '/',
          matched: [],
          name: undefined,
          meta: {},
          redirectedFrom: undefined
        }),
        useCookie: (name: string) => ({ value: undefined }),
        useState: (key: string, init?: () => any) => ({ value: init ? init() : undefined }),
        useFetch: async () => ({ data: { value: null }, pending: { value: false }, error: { value: null }, refresh: async () => {} }),
        useAsyncData: async () => ({ data: { value: null }, pending: { value: false }, error: { value: null }, refresh: async () => {} }),
        useLazyFetch: async () => ({ data: { value: null }, pending: { value: false }, error: { value: null }, refresh: async () => {} }),
        useLazyAsyncData: async () => ({ data: { value: null }, pending: { value: false }, error: { value: null }, refresh: async () => {} }),
        useHead: () => {},
        useSeoMeta: () => {},
        useServerSeoMeta: () => {},
        useNuxtApp: () => ({
          provide: () => {},
          hook: () => {},
          callHook: () => {},
          $config: {}
        }),
        useRuntimeConfig: () => ({ public: {}, app: {} }),
        navigateTo: () => {},
        abortNavigation: () => {},
        setPageLayout: () => {},

        // Supabase Mock
        useSupabaseClient: () => ({}),
        useSupabaseUser: () => ({ value: null }),
        useSupabaseSession: () => ({ value: null }),
        useSupabaseAuthOptionsAsync: async () => ({}),

        // Custom Composables (Project-specific mocks)
        LoadingManager: class {
          static instance: any;
          static getInstance() {
            if (!this.instance) {
              this.instance = new this();
            }
            return this.instance;
          }
          constructor() {}
          show() {}
          hide() {}
          isLoading() { return false; }
        },
        useMobileCheck: () => ({ isMobile: { value: false } }),
        useFormatting: () => ({
          formatDate: (date: any) => String(date),
          formatNumber: (num: any) => String(num),
          formatCurrency: (amount: any) => String(amount)
        }),
        useBackendClient: () => new Proxy({}, {
          get: (target, prop) => {
            // Return async function for any method call
            return async (...args: any[]) => ({ data: null, response: null });
          }
        }),
        useCartStore: () => ({}),
        useBrandStore: () => ({
          getBrandId: (name: string) => null,
          getBrandName: (id: number) => ''
        }),
        useAuth: () => ({ data: { value: null }, status: { value: 'unauthenticated' } }),

        // Additional Project-specific Composables (luxurypanda-v2)
        useOrderCookie: () => ({ value: null }),
        useCategories: () => ({
          categories: { value: [] },
          loading: { value: false },
          getDepthCategory: (path: string) => [],
          getCategoryNodes: async () => []
        }),
        usePaging: (initialData?: any) => ({
          currentPage: { value: 1 },
          totalPages: { value: 1 },
          pageSize: { value: 10 },
          items: { value: initialData || [] },
          goToPage: (page: number) => {},
          nextPage: () => {},
          prevPage: () => {}
        }),
        useBrand: async () => ({
          brands: { value: [] },
          loading: { value: false },
          getBrandId: (name: string) => null,
          getBrandName: (id: number) => '',
          getBrands: async () => []
        }),
        useWish: () => ({
          items: { value: [] },
          addToWish: async () => {},
          removeFromWish: async () => {}
        }),
        useRecent: () => ({ items: { value: [] } }),

        // Swiper Library (swiper.js)
        Pagination: {},
        Navigation: {},
        FreeMode: {},
        Autoplay: {},
        EffectFade: {},

        // Utility Libraries
        DateTime: {
          now: () => ({
            toISO: () => new Date().toISOString(),
            toJSDate: () => new Date()
          }),
          fromISO: (iso: string) => ({
            toISO: () => iso,
            toJSDate: () => new Date(iso)
          }),
          fromJSDate: (date: Date) => ({
            toISO: () => date.toISOString(),
            toJSDate: () => date
          })
        },

        // Utility Functions
        getStaticUrl: (path: string) => `https://static.example.com${path}`,
        moneyFormat: (amount: any) => String(amount),
        moneyToNumber: (amount: any) => typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, '')) || 0,
        rfdc: (obj: any) => JSON.parse(JSON.stringify(obj)), // fast deep clone mock
        fastRedact: (opts?: any) => (obj: any) => obj, // fast-redact mock
        storeToRefs: (store: any) => store, // Pinia storeToRefs mock
        changeUint8ArrayToString: (arr: Uint8Array) => new TextDecoder().decode(arr),

        // ConnectRPC (@connectrpc/connect) mocks
        createContextKey: (defaultValue: any) => ({ id: Symbol('context-key'), defaultValue }),
        createPromiseClient: (service: any) => ({}),
        createGrpcWebTransport: (opts: any) => ({}),
        ConnectError: class extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'ConnectError';
          }
        },

        // Proto Enums/Constants (mock common ones)
        GetMileagesRequest_Status: { ACTIVE: 0, EXPIRED: 1, USED: 2 },
        OrderItemState: { PENDING: 0, CONFIRMED: 1, SHIPPED: 2, DELIVERED: 3 },

        // Global objects
        process: {
          env: {
            NODE_ENV: 'development',
            NUXT_PUBLIC_API_BASE: 'http://localhost:3000'
          }
        },
        pkg: { version: '1.0.0', name: 'mock-package' },

        // Vue Props
        defineProps: (props: any) => ({}),
        defineEmits: (emits: any) => () => {},
        defineExpose: (exposed: any) => {},
        withDefaults: (props: any, defaults: any) => props,

        // Metadata API (메타데이터 추출)
        metadata: {
          /**
           * MetadataAnalyzer 인스턴스 생성
           *
           * @example
           * const analyzer = metadata.createAnalyzer({
           *   ollamaUrl: 'http://localhost:11434',
           *   model: 'qwen2.5-coder:7b'
           * });
           *
           * const projectMeta = await analyzer.analyzeProject(path, files, 3);
           */
          createAnalyzer: (config: { ollamaUrl: string; model: string }) => {
            return new MetadataAnalyzer(config);
          },

          /**
           * BestCase 메타데이터와 프로젝트 메타데이터 비교
           *
           * @example
           * const comparison = metadata.compareBestCase(
           *   projectMeta,
           *   bestCase.patterns.metadata,
           *   bestCase.files
           * );
           *
           * console.log('Missing patterns:', comparison.missingPatterns);
           * console.log('TODOs:', comparison.todos);
           */
          compareBestCase: compareBestCaseMetadata,

          /**
           * 프로젝트 컨텍스트 추출
           *
           * @param projectPath 프로젝트 경로 (절대 경로)
           * @example
           * // 환경변수 사용 (권장)
           * const projectPath = process.env.EXAMPLE_PROJECT_PATH || '/projects/your-project';
           * const context = await metadata.extractProjectContext(projectPath);
           * console.log('API Type:', context.apiInfo.type);
           * console.log('Design System:', context.designSystemInfo.detected);
           */
          extractProjectContext,

          /**
           * 디자인 시스템 정보 가져오기
           *
           * @example
           * const dsInfo = metadata.getDesignSystemInfo('openerd-nuxt3');
           * console.log(dsInfo.components.table.name); // "CommonTable"
           */
          getDesignSystemInfo: designSystemMapping.getDesignSystemInfo,

          /**
           * 특정 컴포넌트 타입에 대한 디자인 시스템 컴포넌트 가져오기
           *
           * @example
           * const tableComponent = metadata.getComponentForDesignSystem('openerd-nuxt3', 'table');
           * console.log(tableComponent.name); // "CommonTable"
           * console.log(tableComponent.usage); // "<CommonTable :data="items" ... />"
           */
          getComponentForDesignSystem: designSystemMapping.getComponentForDesignSystem,

          /**
           * 지원되는 모든 디자인 시스템 ID 목록
           *
           * @example
           * const systems = metadata.getSupportedDesignSystems();
           * // ['openerd-nuxt3', 'element-plus', 'vuetify', ...]
           */
          getSupportedDesignSystems: designSystemMapping.getSupportedDesignSystems,

          /**
           * 디자인 시스템의 컴포넌트 매핑 가져오기
           *
           * @example
           * const components = metadata.getComponentMap('openerd-nuxt3');
           * // { table: 'CommonTable', button: 'CommonButton', ... }
           */
          getComponentMap: designSystemMapping.getComponentMap,

          /**
           * 모든 디자인 시스템 정보
           */
          DESIGN_SYSTEMS: designSystemMapping.DESIGN_SYSTEMS,

          /**
           * 유틸리티 라이브러리 정보 가져오기
           *
           * @example
           * const libInfo = metadata.getUtilityLibraryInfo('vueuse');
           * console.log(libInfo.functions.useLocalStorage.name); // "useLocalStorage"
           */
          getUtilityLibraryInfo: utilityLibraryMapping.getUtilityLibraryInfo,

          /**
           * 특정 함수 타입에 대한 유틸리티 라이브러리 함수 가져오기
           *
           * @example
           * const func = metadata.getFunctionForUtilityLibrary('vueuse', 'useLocalStorage');
           * console.log(func.name); // "useLocalStorage"
           * console.log(func.usage); // "const state = useLocalStorage('key', defaultValue)"
           */
          getFunctionForUtilityLibrary: utilityLibraryMapping.getFunctionForUtilityLibrary,

          /**
           * 지원되는 모든 유틸리티 라이브러리 ID 목록
           *
           * @example
           * const libraries = metadata.getSupportedUtilityLibraries();
           * // ['vueuse', 'lodash', 'date-fns', 'axios', 'dayjs']
           */
          getSupportedUtilityLibraries: utilityLibraryMapping.getSupportedUtilityLibraries,

          /**
           * 유틸리티 라이브러리의 함수 매핑 가져오기
           *
           * @example
           * const functions = metadata.getFunctionMap('vueuse');
           * // { useLocalStorage: 'useLocalStorage', useMouse: 'useMouse', ... }
           */
          getFunctionMap: utilityLibraryMapping.getFunctionMap,

          /**
           * 카테고리별 함수 목록 가져오기
           *
           * @example
           * const stateFunctions = metadata.getFunctionsByCategory('vueuse', 'state');
           * // ['useLocalStorage', 'useSessionStorage', 'useStorage']
           */
          getFunctionsByCategory: utilityLibraryMapping.getFunctionsByCategory,

          /**
           * 모든 유틸리티 라이브러리 정보
           */
          UTILITY_LIBRARIES: utilityLibraryMapping.UTILITY_LIBRARIES,

          /**
           * 메타데이터 기반 자동 가이드 로딩
           *
           * 메타데이터에서 키워드를 추출하고, 관련 가이드를 자동으로 검색/병합합니다.
           *
           * @param metadata ProjectMetadata 또는 FileMetadata
           * @param options 추가 옵션 (apiType, designSystem, utilityLibrary, mandatoryIds 등)
           * @returns 병합된 가이드 문자열과 사용된 가이드 목록
           *
           * @example
           * const projectMeta = await analyzer.analyzeProject(projectPath, files);
           * const { combined, guides: usedGuides } = await metadata.loadGuides(projectMeta, {
           *   apiType: projectMeta.apiType,
           *   designSystem: projectMeta.designSystem,
           *   mandatoryIds: ['00-bestcase-priority']
           * });
           *
           * console.log('Loaded guides:', usedGuides.map(g => g.id).join(', '));
           * console.log('Combined guide length:', combined.length);
           */
          loadGuides: async (metadata: any, options: {
            apiType?: 'grpc' | 'openapi' | 'any';
            designSystem?: string;
            utilityLibrary?: string;
            mandatoryIds?: string[];
            limit?: number;
          } = {}) => {
            // 1. 메타데이터에서 키워드 추출
            const keywords: string[] = [];

            // 프로젝트 메타데이터인 경우
            if (metadata.patterns && Array.isArray(metadata.patterns)) {
              keywords.push(...metadata.patterns);
            }

            // 프레임워크 추가
            if (metadata.frameworks && Array.isArray(metadata.frameworks)) {
              keywords.push(...metadata.frameworks);
            }

            // 엔티티 추가
            if (metadata.entities && Array.isArray(metadata.entities)) {
              keywords.push(...metadata.entities);
            }

            // 기능 추가
            if (metadata.features && Array.isArray(metadata.features)) {
              keywords.push(...metadata.features);
            }

            // 파일 메타데이터인 경우
            if (metadata.category) {
              keywords.push(metadata.category);
            }

            // 옵션에서 키워드 추가
            if (options.apiType) {
              keywords.push(options.apiType);
            }

            if (options.designSystem) {
              keywords.push(options.designSystem);
              keywords.push('design-system');
            }

            if (options.utilityLibrary) {
              keywords.push(options.utilityLibrary);
              keywords.push('utility');
            }

            // 중복 제거
            const uniqueKeywords = Array.from(new Set(keywords));

            // 2. 가이드 검색
            const searchResult = await guides.searchGuides({
              keywords: uniqueKeywords,
              apiType: options.apiType,
              mandatoryIds: options.mandatoryIds,
              designSystem: options.designSystem,
              utilityLibrary: options.utilityLibrary
            });

            // 3. 가이드 ID 목록 생성
            const guideIds = searchResult.guides.map((g: any) => g.id);

            // 4. 가이드 병합
            const combineResult = await guides.combineGuides({
              ids: guideIds,
              context: {
                project: metadata.projectName || 'unknown',
                apiType: options.apiType || 'any'
              }
            });

            return {
              combined: combineResult.combined,
              guides: combineResult.usedGuides,
              keywords: uniqueKeywords
            };
          }
        },

        // Console API
        console: {
          log: (...args: any[]) => {
            logs.push(args.map(a => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (err) {
                  return String(a);
                }
              }
              return String(a);
            }).join(' '));
          },
          error: (...args: any[]) => {
            logs.push('[ERROR] ' + args.map(a => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (err) {
                  return String(a);
                }
              }
              return String(a);
            }).join(' '));
          }
        }
      }
    });

    // IIFE인지 확인: 코드가 )()로 끝나면 IIFE로 간주
    // ✅ context injection으로 인해 다른 문장(const context = ...)이 앞에 올 수 있음
    //    이 경우 마지막 IIFE 호출 결과를 리턴하도록 수정
    const endsWithIIFECall = /\)\(\)\s*;?\s*$/.test(preprocessedCode.trim());

    let finalCode: string;
    if (endsWithIIFECall) {
      // IIFE 호출이 있으면, 마지막 await 앞에 return 추가
      const codeWithReturn = preprocessedCode.replace(
        /(^|[\s\S]*\n\s*)(await\s+\([^)]*function[\s\S]+\)\(\)\s*;?\s*)$/,
        '$1return $2'
      );
      finalCode = `(async () => { ${codeWithReturn} })()`;
    } else {
      finalCode = `(async () => { ${preprocessedCode} })()`;
    }


    const result = await vm.run(finalCode);

    return {
      ok: true,
      output: result,
      logs
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 일반적인 실수에 대한 친절한 가이드 제공
    let helpfulMessage = errorMessage;

    // export/import 문법 사용 감지 (ES6 module) - 전처리 후에도 남아있는지 확인
    // 주의: 전처리를 거친 코드(preprocessedCode)를 검사합니다
    if (errorMessage.includes('Unexpected token') && detectES6ModuleSyntax(preprocessedCode)) {
      helpfulMessage = `❌ ES6 module 문법(export/import)을 완전히 제거하지 못했습니다.

원인: 복잡한 export/import 패턴이 자동 변환에서 누락되었을 수 있습니다.

✅ 해결책: 단순 표현식이나 변수 할당을 사용하세요:
   ❌ export default \`<template>...\`;
   ✅ const result = \`<template>...\`;
   ✅ result;  // 마지막 표현식이 반환됨

   ❌ import { something } from 'module';
   ✅ // sandbox API 사용: context, filesystem, bestcase, guides

💡 단순한 export default는 자동으로 처리됩니다:
   export default async function run() {...}  →  자동 변환됨

📚 샌드박스는 스크립트 모드로 실행되며, module 문법은 지원하지 않습니다.`;
    }
    // JSX 문법 사용 감지 (문자열 내부 제외)
    else if (errorMessage.includes('Unexpected identifier') || errorMessage.includes('Unexpected token <')) {
      if (detectJSXSyntax(preprocessedCode)) {
        helpfulMessage = `❌ JSX/TSX 문법은 샌드박스에서 사용할 수 없습니다.

원인: const variable = <template>... 같은 JSX 문법을 사용했습니다.

✅ 해결책: 백틱(\`)을 사용하여 문자열로 저장하세요:
   const variable = \`<template>...\`;

📚 샌드박스는 순수 JavaScript만 실행 가능합니다.`;
      }
    }
    // interface/type 사용 감지 (템플릿 리터럴 내부 제외)
    else if (detectTypeScriptSyntax(preprocessedCode)) {
      helpfulMessage = `❌ TypeScript 문법(interface, type)은 샌드박스에서 사용할 수 없습니다.

원인: interface나 type 선언을 사용했습니다.

✅ 해결책: 타입 선언을 제거하고 순수 JavaScript로 작성하세요:
   ❌ interface Data { name: string; }
   ✅ const data = { name: "value" };

   ❌ const value: string = "text";
   ✅ const value = "text";

💡 템플릿 리터럴 안의 TypeScript 코드는 문자열이므로 괜찮습니다:
   ✅ const template = \`<script lang="ts" setup>\`;

📚 최신 JavaScript(ES6+) 문법은 지원되지만, TypeScript 전용 문법은 불가합니다.`;
    }

    // filesystem API 오용 감지 (존재하지 않는 API)
    if (code.includes('filesystem.list') || code.includes('filesystem.stat') || code.includes('filesystem.walk')) {
      helpfulMessage = `❌ 존재하지 않는 filesystem API를 사용했습니다.

원인: filesystem.list(), filesystem.stat(), filesystem.walk() 등을 사용했습니다.

✅ 실제 사용 가능한 API (3개만 존재):
   1. filesystem.readFile({ path: '/projects/...' })
      - 파일 내용 읽기
      - 반환: { content: string, size: number }

   2. filesystem.writeFile({ path: '/projects/...', content: '...' })
      - 파일 쓰기

   3. filesystem.searchFiles({ path: '/projects/...', pattern: '**/*.js', recursive: true })
      - 파일 검색 (glob 패턴)
      - 반환: { files: string[] }

💡 파일 목록을 얻으려면:
   ❌ const files = await filesystem.list(dir);
   ✅ const result = await filesystem.searchFiles({
        path: '/projects/myapp',
        pattern: '**/*.{js,ts,vue}',
        recursive: true
      });
      const files = result.files;

📚 예제: scripts/examples/find-usePaging-correct.js`;
    }

    // filesystem API 잘못된 사용 감지 (Node.js fs 스타일)
    if (code.match(/filesystem\.(readFile|writeFile|searchFiles)\s*\([^{]/)) {
      helpfulMessage = `❌ filesystem API를 Node.js fs 스타일로 사용했습니다.

원인: filesystem.readFile(path, 'utf8') 같은 Node.js fs API 스타일을 사용했습니다.

✅ 올바른 사용법 (객체 형식):
   ❌ const content = await filesystem.readFile(path, 'utf8');
   ✅ const result = await filesystem.readFile({ path: path });
      const content = result.content;

   ❌ await filesystem.writeFile(path, content, 'utf8');
   ✅ await filesystem.writeFile({ path: path, content: content });

   ❌ const files = await filesystem.searchFiles(dir, '*.ts', true);
   ✅ const result = await filesystem.searchFiles({
        path: dir,
        pattern: '*.ts',
        recursive: true
      });
      const files = result.files;

💡 중요: 모든 인자를 객체로 전달해야 합니다!

📚 예제: scripts/examples/check-vue-file-correct.js`;
    }

    return {
      ok: false,
      logs,
      error: helpfulMessage
    };
  }
}
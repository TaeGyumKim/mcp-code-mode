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
 * TypeScript 문법 감지 (템플릿 리터럴 및 문자열 내부 제외)
 */
function detectTypeScriptSyntax(code: string): boolean {
  let cleanedCode = code
    .replace(/`[^`]*`/gs, '""')  // 템플릿 리터럴 제거
    .replace(/'[^']*'/g, '""')    // 작은따옴표 문자열 제거
    .replace(/"[^"]*"/g, '""')    // 큰따옴표 문자열 제거
    .replace(/\/\/.*$/gm, '')     // 주석 제거
    .replace(/\/\*[\s\S]*?\*\//g, ''); // 블록 주석 제거

  const hasInterface = /\binterface\s+\w+/.test(cleanedCode);
  const hasTypeAlias = /\btype\s+\w+\s*=/.test(cleanedCode);
  const hasTypeAnnotation = /:\s*\w+(\[\]|<[^>]+>)?\s*(=|;|\))/.test(cleanedCode);

  return hasInterface || hasTypeAlias || hasTypeAnnotation;
}

/**
 * JSX/TSX 문법 감지 (템플릿 리터럴 및 문자열 내부 제외)
 */
function detectJSXSyntax(code: string): boolean {
  let cleanedCode = code
    .replace(/`[^`]*`/gs, '""')  // 템플릿 리터럴 제거
    .replace(/'[^']*'/g, '""')    // 작은따옴표 문자열 제거
    .replace(/"[^"]*"/g, '""')    // 큰따옴표 문자열 제거
    .replace(/\/\/.*$/gm, '')     // 주석 제거
    .replace(/\/\*[\s\S]*?\*\//g, ''); // 블록 주석 제거

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
  let cleanedCode = code
    .replace(/`[^`]*`/gs, '""')  // 템플릿 리터럴 제거
    .replace(/'[^']*'/g, '""')    // 작은따옴표 문자열 제거
    .replace(/"[^"]*"/g, '""')    // 큰따옴표 문자열 제거
    .replace(/\/\/.*$/gm, '')     // 주석 제거
    .replace(/\/\*[\s\S]*?\*\//g, ''); // 블록 주석 제거

  // ES6 module 키워드 감지
  const hasImport = /^\s*import\s+/m.test(cleanedCode);  // 줄 시작에 import
  const hasExport = /^\s*export\s+/m.test(cleanedCode);  // 줄 시작에 export

  return hasImport || hasExport;
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
function preprocessCode(code: string): string {
  // import 문 전체 제거
  code = code.replace(/import\s+.+?from\s+['"][^'"]+['"];?\s*/g, '');

  // 단독 import 문 제거 (예: import 'module')
  code = code.replace(/import\s+['"][^'"]+['"];?\s*/g, '');

  // export default 처리 - 표현식을 IIFE로 변환
  if (code.includes('export default')) {
    code = code.replace(/export\s+default\s+/g, '');
    code = code.replace(/;?\s*$/, '');
    code = `(() => { return ${code}; })()`;
  }

  // export const/let/var/function/class 제거
  code = code.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

  // require 문 제거 (const fs = require('fs').promises 등)
  code = code.replace(/const\s+\w+\s*=\s*require\s*\([^)]+\)(\.\w+)*\s*;?\s*/g, '');
  code = code.replace(/let\s+\w+\s*=\s*require\s*\([^)]+\)(\.\w+)*\s*;?\s*/g, '');
  code = code.replace(/var\s+\w+\s*=\s*require\s*\([^)]+\)(\.\w+)*\s*;?\s*/g, '');

  // 단독 require 호출 제거
  code = code.replace(/require\s*\([^)]+\)\s*;?\s*/g, '');

  // TypeScript 타입 annotation 제거 (간단한 패턴만)
  // const name: Type = value → const name = value
  code = code.replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+=/g, '$1 $2 =');

  // 최상위 IIFE unwrap (중복 wrap 방지)
  // (async () => { ... })() 또는 (() => { ... })() 형식 감지
  const iifePattern = /^\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\)\s*\(\s*\)\s*;?\s*$/;
  const syncIifePattern = /^\s*\(\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\)\s*\(\s*\)\s*;?\s*$/;

  let match = code.match(iifePattern);
  if (match) {
    code = match[1].trim();
  } else {
    match = code.match(syncIifePattern);
    if (match) {
      code = match[1].trim();
    }
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
  
  try {
    // ✅ import 문 자동 제거 (전처리)
    const preprocessedCode = preprocessCode(code);

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

    const result = await vm.run(`
      (async () => {
        ${preprocessedCode}
      })()
    `);

    return {
      ok: true,
      output: result,
      logs
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 일반적인 실수에 대한 친절한 가이드 제공
    let helpfulMessage = errorMessage;

    // export/import 문법 사용 감지 (ES6 module) - 문자열 내부 제외
    if (errorMessage.includes('Unexpected token') && detectES6ModuleSyntax(code)) {
      helpfulMessage = `❌ ES6 module 문법(export/import)은 샌드박스에서 사용할 수 없습니다.

원인: export default, export const, import 등을 사용했습니다.

✅ 해결책: 단순 표현식이나 변수 할당을 사용하세요:
   ❌ export default \`<template>...\`;
   ✅ const result = \`<template>...\`;
   ✅ result;  // 마지막 표현식이 반환됨

   ❌ import { something } from 'module';
   ✅ // sandbox API 사용: context, filesystem, bestcase, guides

📚 샌드박스는 스크립트 모드로 실행되며, module 문법은 지원하지 않습니다.`;
    }
    // JSX 문법 사용 감지 (문자열 내부 제외)
    else if (errorMessage.includes('Unexpected identifier') || errorMessage.includes('Unexpected token <')) {
      if (detectJSXSyntax(code)) {
        helpfulMessage = `❌ JSX/TSX 문법은 샌드박스에서 사용할 수 없습니다.

원인: const variable = <template>... 같은 JSX 문법을 사용했습니다.

✅ 해결책: 백틱(\`)을 사용하여 문자열로 저장하세요:
   const variable = \`<template>...\`;

📚 샌드박스는 순수 JavaScript만 실행 가능합니다.`;
      }
    }
    // interface/type 사용 감지 (템플릿 리터럴 내부 제외)
    else if (detectTypeScriptSyntax(code)) {
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
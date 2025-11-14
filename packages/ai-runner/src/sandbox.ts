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
 * import/require 문 자동 제거 (전처리)
 *
 * vm2에서는 import/require가 차단되지만,
 * 사용자 편의를 위해 import/require 문을 자동으로 제거합니다.
 * fs, path 등은 sandbox에 직접 주입되므로 import/require 불필요합니다.
 */
function preprocessCode(code: string): string {
  // import 문 전체 제거
  code = code.replace(/import\s+.+?from\s+['"][^'"]+['"];?\s*/g, '');

  // 단독 import 문 제거 (예: import 'module')
  code = code.replace(/import\s+['"][^'"]+['"];?\s*/g, '');

  // require 문 제거 (const fs = require('fs').promises 등)
  code = code.replace(/const\s+\w+\s*=\s*require\s*\([^)]+\)(\.\w+)*\s*;?\s*/g, '');
  code = code.replace(/let\s+\w+\s*=\s*require\s*\([^)]+\)(\.\w+)*\s*;?\s*/g, '');
  code = code.replace(/var\s+\w+\s*=\s*require\s*\([^)]+\)(\.\w+)*\s*;?\s*/g, '');

  // 단독 require 호출 제거
  code = code.replace(/require\s*\([^)]+\)\s*;?\s*/g, '');

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
          UTILITY_LIBRARIES: utilityLibraryMapping.UTILITY_LIBRARIES
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

    // JSX 문법 사용 감지
    if (errorMessage.includes('Unexpected identifier') || errorMessage.includes('Unexpected token <')) {
      if (code.includes('<template>') || code.includes('<div') || code.includes('</')) {
        helpfulMessage = `❌ JSX/TSX 문법은 샌드박스에서 사용할 수 없습니다.

원인: const variable = <template>... 같은 JSX 문법을 사용했습니다.

✅ 해결책: 백틱(\`)을 사용하여 문자열로 저장하세요:
   const variable = \`<template>...\`;

📚 샌드박스는 순수 JavaScript만 실행 가능합니다.`;
      }
    }

    // interface/type 사용 감지
    if (code.includes('interface ') || (code.includes('type ') && code.includes(' = {'))) {
      helpfulMessage = `❌ TypeScript 문법(interface, type)은 샌드박스에서 사용할 수 없습니다.

원인: interface나 type 선언을 사용했습니다.

✅ 해결책: 타입 선언을 제거하고 순수 JavaScript로 작성하세요:
   ❌ interface Data { name: string; }
   ✅ const data = { name: "value" };

   ❌ const value: string = "text";
   ✅ const value = "text";

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
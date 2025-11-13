import { VM } from 'vm2';
import * as filesystem from '../../../mcp-servers/filesystem/index.js';
import * as bestcase from '../../../mcp-servers/bestcase/index.js';
import * as guides from '../../../mcp-servers/guides/dist/index.js';
import { MetadataAnalyzer } from '../../llm-analyzer/src/metadataAnalyzer.js';
import * as designSystemMapping from '../../llm-analyzer/src/designSystemMapping.js';
import * as utilityLibraryMapping from '../../llm-analyzer/src/utilityLibraryMapping.js';

export interface SandboxResult {
  ok: boolean;
  output?: any;
  logs?: string[];
  error?: string;
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
    const vm = new VM({
      timeout: timeoutMs,
      sandbox: {
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
        ${code}
      })()
    `);

    return {
      ok: true,
      output: result,
      logs
    };
  } catch (error) {
    return {
      ok: false,
      logs,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
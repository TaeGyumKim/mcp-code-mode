/**
 * 유틸리티 라이브러리별 composables/함수 매핑
 *
 * MCP 작업 시 프로젝트의 유틸리티 라이브러리를 감지하여,
 * 해당 라이브러리가 제공하는 composables/함수를 자동으로 활용
 */

export interface UtilityFunction {
  name: string;
  category: string;  // state, event, dom, animation, utility, etc
  description: string;
  usage?: string;
  params?: string[];
}

export interface UtilityLibraryInfo {
  id: string;
  name: string;
  description: string;
  packageName: string;
  docsUrl: string;
  functions: Record<string, UtilityFunction>;
}

/**
 * 주요 유틸리티 라이브러리 매핑
 */
export const UTILITY_LIBRARIES: Record<string, UtilityLibraryInfo> = {
  'vueuse': {
    id: 'vueuse',
    name: 'VueUse',
    description: 'Collection of essential Vue Composition Utilities',
    packageName: '@vueuse/core',
    docsUrl: 'https://vueuse.org',
    functions: {
      // State Management
      useLocalStorage: {
        name: 'useLocalStorage',
        category: 'state',
        description: 'Reactive LocalStorage',
        usage: 'const state = useLocalStorage("key", defaultValue)',
        params: ['key', 'defaultValue', 'options']
      },
      useSessionStorage: {
        name: 'useSessionStorage',
        category: 'state',
        description: 'Reactive SessionStorage',
        usage: 'const state = useSessionStorage("key", defaultValue)',
        params: ['key', 'defaultValue', 'options']
      },
      useStorage: {
        name: 'useStorage',
        category: 'state',
        description: 'Reactive custom storage',
        usage: 'const state = useStorage("key", defaultValue, storage)',
        params: ['key', 'defaultValue', 'storage', 'options']
      },

      // Mouse & Touch
      useMouse: {
        name: 'useMouse',
        category: 'event',
        description: 'Reactive mouse position',
        usage: 'const { x, y, sourceType } = useMouse()',
        params: ['options']
      },
      useMousePressed: {
        name: 'useMousePressed',
        category: 'event',
        description: 'Reactive mouse pressed state',
        usage: 'const { pressed } = useMousePressed()',
        params: ['options']
      },
      useDraggable: {
        name: 'useDraggable',
        category: 'event',
        description: 'Make elements draggable',
        usage: 'const { x, y, style } = useDraggable(target)',
        params: ['target', 'options']
      },

      // DOM & Elements
      useElementSize: {
        name: 'useElementSize',
        category: 'dom',
        description: 'Reactive element size',
        usage: 'const { width, height } = useElementSize(target)',
        params: ['target', 'initialSize', 'options']
      },
      useElementVisibility: {
        name: 'useElementVisibility',
        category: 'dom',
        description: 'Tracks element visibility',
        usage: 'const isVisible = useElementVisibility(target)',
        params: ['target', 'options']
      },
      useIntersectionObserver: {
        name: 'useIntersectionObserver',
        category: 'dom',
        description: 'Intersection Observer API',
        usage: 'useIntersectionObserver(target, callback, options)',
        params: ['target', 'callback', 'options']
      },

      // Animation
      useTransition: {
        name: 'useTransition',
        category: 'animation',
        description: 'Transition between values',
        usage: 'const output = useTransition(source, options)',
        params: ['source', 'options']
      },
      useInterval: {
        name: 'useInterval',
        category: 'animation',
        description: 'Reactive interval',
        usage: 'useInterval(callback, interval)',
        params: ['callback', 'interval', 'options']
      },
      useTimeout: {
        name: 'useTimeout',
        category: 'animation',
        description: 'Reactive timeout',
        usage: 'useTimeout(callback, delay)',
        params: ['callback', 'delay', 'options']
      },

      // Network
      useFetch: {
        name: 'useFetch',
        category: 'network',
        description: 'Reactive fetch',
        usage: 'const { data, error, isFetching } = useFetch(url)',
        params: ['url', 'options']
      },
      useAsyncState: {
        name: 'useAsyncState',
        category: 'network',
        description: 'Reactive async state',
        usage: 'const { state, isReady, execute } = useAsyncState(promise)',
        params: ['promise', 'initialState', 'options']
      },

      // Utility
      useDebounce: {
        name: 'useDebounce',
        category: 'utility',
        description: 'Debounce reactive value',
        usage: 'const debounced = useDebounce(value, delay)',
        params: ['value', 'delay', 'options']
      },
      useThrottle: {
        name: 'useThrottle',
        category: 'utility',
        description: 'Throttle reactive value',
        usage: 'const throttled = useThrottle(value, delay)',
        params: ['value', 'delay', 'trailing', 'leading']
      },
      useClipboard: {
        name: 'useClipboard',
        category: 'utility',
        description: 'Reactive clipboard',
        usage: 'const { text, copy, copied, isSupported } = useClipboard()',
        params: ['options']
      }
    }
  },

  'lodash': {
    id: 'lodash',
    name: 'Lodash',
    description: 'Modern JavaScript utility library',
    packageName: 'lodash',
    docsUrl: 'https://lodash.com',
    functions: {
      // Array
      chunk: {
        name: 'chunk',
        category: 'array',
        description: 'Creates an array of elements split into groups',
        usage: '_.chunk(array, size)',
        params: ['array', 'size']
      },
      uniq: {
        name: 'uniq',
        category: 'array',
        description: 'Creates duplicate-free version of array',
        usage: '_.uniq(array)',
        params: ['array']
      },
      flatten: {
        name: 'flatten',
        category: 'array',
        description: 'Flattens array a single level deep',
        usage: '_.flatten(array)',
        params: ['array']
      },

      // Object
      get: {
        name: 'get',
        category: 'object',
        description: 'Gets value at path of object',
        usage: '_.get(object, path, defaultValue)',
        params: ['object', 'path', 'defaultValue']
      },
      set: {
        name: 'set',
        category: 'object',
        description: 'Sets value at path of object',
        usage: '_.set(object, path, value)',
        params: ['object', 'path', 'value']
      },
      merge: {
        name: 'merge',
        category: 'object',
        description: 'Recursively merges own and inherited enumerable properties',
        usage: '_.merge(object, sources)',
        params: ['object', '...sources']
      },

      // Function
      debounce: {
        name: 'debounce',
        category: 'function',
        description: 'Creates a debounced function',
        usage: '_.debounce(func, wait, options)',
        params: ['func', 'wait', 'options']
      },
      throttle: {
        name: 'throttle',
        category: 'function',
        description: 'Creates a throttled function',
        usage: '_.throttle(func, wait, options)',
        params: ['func', 'wait', 'options']
      },

      // String
      camelCase: {
        name: 'camelCase',
        category: 'string',
        description: 'Converts string to camel case',
        usage: '_.camelCase(string)',
        params: ['string']
      },
      kebabCase: {
        name: 'kebabCase',
        category: 'string',
        description: 'Converts string to kebab case',
        usage: '_.kebabCase(string)',
        params: ['string']
      }
    }
  },

  'date-fns': {
    id: 'date-fns',
    name: 'date-fns',
    description: 'Modern JavaScript date utility library',
    packageName: 'date-fns',
    docsUrl: 'https://date-fns.org',
    functions: {
      format: {
        name: 'format',
        category: 'format',
        description: 'Format date using provided string',
        usage: 'format(date, "yyyy-MM-dd")',
        params: ['date', 'format', 'options']
      },
      parseISO: {
        name: 'parseISO',
        category: 'parse',
        description: 'Parse ISO 8601 date string',
        usage: 'parseISO("2021-01-01")',
        params: ['dateString', 'options']
      },
      addDays: {
        name: 'addDays',
        category: 'manipulation',
        description: 'Add days to date',
        usage: 'addDays(date, amount)',
        params: ['date', 'amount']
      },
      subDays: {
        name: 'subDays',
        category: 'manipulation',
        description: 'Subtract days from date',
        usage: 'subDays(date, amount)',
        params: ['date', 'amount']
      },
      differenceInDays: {
        name: 'differenceInDays',
        category: 'comparison',
        description: 'Get difference in days between dates',
        usage: 'differenceInDays(dateLeft, dateRight)',
        params: ['dateLeft', 'dateRight', 'options']
      },
      isAfter: {
        name: 'isAfter',
        category: 'comparison',
        description: 'Is the first date after the second one',
        usage: 'isAfter(date, dateToCompare)',
        params: ['date', 'dateToCompare']
      },
      isBefore: {
        name: 'isBefore',
        category: 'comparison',
        description: 'Is the first date before the second one',
        usage: 'isBefore(date, dateToCompare)',
        params: ['date', 'dateToCompare']
      }
    }
  },

  'axios': {
    id: 'axios',
    name: 'Axios',
    description: 'Promise based HTTP client',
    packageName: 'axios',
    docsUrl: 'https://axios-http.com',
    functions: {
      get: {
        name: 'get',
        category: 'request',
        description: 'Send GET request',
        usage: 'axios.get(url, config)',
        params: ['url', 'config']
      },
      post: {
        name: 'post',
        category: 'request',
        description: 'Send POST request',
        usage: 'axios.post(url, data, config)',
        params: ['url', 'data', 'config']
      },
      put: {
        name: 'put',
        category: 'request',
        description: 'Send PUT request',
        usage: 'axios.put(url, data, config)',
        params: ['url', 'data', 'config']
      },
      delete: {
        name: 'delete',
        category: 'request',
        description: 'Send DELETE request',
        usage: 'axios.delete(url, config)',
        params: ['url', 'config']
      },
      create: {
        name: 'create',
        category: 'instance',
        description: 'Create axios instance',
        usage: 'axios.create(config)',
        params: ['config']
      }
    }
  },

  'dayjs': {
    id: 'dayjs',
    name: 'Day.js',
    description: '2KB immutable date library',
    packageName: 'dayjs',
    docsUrl: 'https://day.js.org',
    functions: {
      format: {
        name: 'format',
        category: 'display',
        description: 'Format date',
        usage: 'dayjs().format("YYYY-MM-DD")',
        params: ['format']
      },
      add: {
        name: 'add',
        category: 'manipulation',
        description: 'Add time',
        usage: 'dayjs().add(7, "day")',
        params: ['value', 'unit']
      },
      subtract: {
        name: 'subtract',
        category: 'manipulation',
        description: 'Subtract time',
        usage: 'dayjs().subtract(7, "day")',
        params: ['value', 'unit']
      },
      diff: {
        name: 'diff',
        category: 'comparison',
        description: 'Get difference',
        usage: 'dayjs().diff(date, "day")',
        params: ['date', 'unit', 'float']
      },
      isBefore: {
        name: 'isBefore',
        category: 'comparison',
        description: 'Check if before',
        usage: 'dayjs().isBefore(date)',
        params: ['date', 'unit']
      },
      isAfter: {
        name: 'isAfter',
        category: 'comparison',
        description: 'Check if after',
        usage: 'dayjs().isAfter(date)',
        params: ['date', 'unit']
      }
    }
  },

  // 🎨 하이브리드: 디자인 시스템 + 유틸리티 라이브러리
  'openerd-nuxt3': {
    id: 'openerd-nuxt3',
    name: 'OpenERD Nuxt3',
    description: 'OpenERD Nuxt3 Design System - Composables & Utilities',
    packageName: '@openerd/nuxt3',
    docsUrl: 'https://openerd.com/docs',
    functions: {
      // State Management Composables
      useTable: {
        name: 'useTable',
        category: 'state',
        description: 'Table state management composable',
        usage: 'const { data, loading, refresh } = useTable(fetchFunction)',
        params: ['fetchFunction', 'options']
      },
      useForm: {
        name: 'useForm',
        category: 'state',
        description: 'Form state management composable',
        usage: 'const { values, errors, handleSubmit } = useForm(schema)',
        params: ['schema', 'options']
      },
      useModal: {
        name: 'useModal',
        category: 'state',
        description: 'Modal state management composable',
        usage: 'const { isOpen, open, close } = useModal()',
        params: ['options']
      },
      usePagination: {
        name: 'usePagination',
        category: 'state',
        description: 'Pagination state management',
        usage: 'const { page, pageSize, total, setPage } = usePagination()',
        params: ['initialPage', 'initialPageSize']
      },
      useAuth: {
        name: 'useAuth',
        category: 'state',
        description: 'Authentication state management',
        usage: 'const { user, isAuthenticated, login, logout } = useAuth()',
        params: []
      },

      // UI Composables
      useAlert: {
        name: 'useAlert',
        category: 'ui',
        description: 'Alert/Toast notification composable',
        usage: 'const { success, error, warning, info } = useAlert()',
        params: []
      },
      useLoading: {
        name: 'useLoading',
        category: 'ui',
        description: 'Loading state management',
        usage: 'const { isLoading, startLoading, stopLoading } = useLoading()',
        params: []
      },
      useDialog: {
        name: 'useDialog',
        category: 'ui',
        description: 'Dialog state management',
        usage: 'const { show, hide, confirm } = useDialog()',
        params: ['options']
      },

      // Validation
      useValidation: {
        name: 'useValidation',
        category: 'validation',
        description: 'Form validation composable',
        usage: 'const { validate, errors, isValid } = useValidation(rules)',
        params: ['rules']
      },

      // API
      useApi: {
        name: 'useApi',
        category: 'api',
        description: 'API call wrapper composable',
        usage: 'const { data, error, execute } = useApi(endpoint)',
        params: ['endpoint', 'options']
      },

      // Utility Functions
      formatDate: {
        name: 'formatDate',
        category: 'utility',
        description: 'Date formatting utility',
        usage: 'formatDate(date, "YYYY-MM-DD")',
        params: ['date', 'format']
      },
      formatNumber: {
        name: 'formatNumber',
        category: 'utility',
        description: 'Number formatting utility',
        usage: 'formatNumber(1234.56, { decimals: 2 })',
        params: ['number', 'options']
      },
      formatCurrency: {
        name: 'formatCurrency',
        category: 'utility',
        description: 'Currency formatting utility',
        usage: 'formatCurrency(1234.56, "KRW")',
        params: ['amount', 'currency']
      },
      debounce: {
        name: 'debounce',
        category: 'utility',
        description: 'Debounce utility function',
        usage: 'const debouncedFn = debounce(fn, 300)',
        params: ['function', 'delay']
      },
      throttle: {
        name: 'throttle',
        category: 'utility',
        description: 'Throttle utility function',
        usage: 'const throttledFn = throttle(fn, 300)',
        params: ['function', 'delay']
      }
    }
  },

  // 🎨 하이브리드: Element Plus
  'element-plus': {
    id: 'element-plus',
    name: 'Element Plus',
    description: 'Element Plus - Vue 3 UI Library Composables',
    packageName: 'element-plus',
    docsUrl: 'https://element-plus.org',
    functions: {
      useFormItem: {
        name: 'useFormItem',
        category: 'form',
        description: 'Form item context composable',
        usage: 'const { size, disabled, validateState } = useFormItem()',
        params: []
      },
      useNamespace: {
        name: 'useNamespace',
        category: 'style',
        description: 'BEM namespace composable',
        usage: 'const ns = useNamespace("button")',
        params: ['block']
      },
      useLocale: {
        name: 'useLocale',
        category: 'i18n',
        description: 'Locale/i18n composable',
        usage: 'const { t, locale } = useLocale()',
        params: []
      },
      useSize: {
        name: 'useSize',
        category: 'props',
        description: 'Component size composable',
        usage: 'const size = useSize(props)',
        params: ['props', 'fallback']
      },
      useDisabled: {
        name: 'useDisabled',
        category: 'props',
        description: 'Component disabled state composable',
        usage: 'const disabled = useDisabled()',
        params: []
      },
      useZIndex: {
        name: 'useZIndex',
        category: 'style',
        description: 'Z-index management composable',
        usage: 'const { currentZIndex, nextZIndex } = useZIndex()',
        params: []
      }
    }
  },

  // 🎨 하이브리드: Vuetify
  'vuetify': {
    id: 'vuetify',
    name: 'Vuetify',
    description: 'Vuetify - Material Design Component Framework Composables',
    packageName: 'vuetify',
    docsUrl: 'https://vuetifyjs.com',
    functions: {
      useDisplay: {
        name: 'useDisplay',
        category: 'responsive',
        description: 'Responsive display composable',
        usage: 'const { mobile, xs, sm, md, lg, xl } = useDisplay()',
        params: []
      },
      useTheme: {
        name: 'useTheme',
        category: 'theme',
        description: 'Theme management composable',
        usage: 'const { current, themes, global } = useTheme()',
        params: []
      },
      useLayout: {
        name: 'useLayout',
        category: 'layout',
        description: 'Layout dimensions composable',
        usage: 'const { mainRect, mainStyles } = useLayout()',
        params: []
      },
      useLocale: {
        name: 'useLocale',
        category: 'i18n',
        description: 'Locale/i18n composable',
        usage: 'const { t, current, isRtl } = useLocale()',
        params: []
      },
      useRtl: {
        name: 'useRtl',
        category: 'i18n',
        description: 'RTL (right-to-left) composable',
        usage: 'const { isRtl } = useRtl()',
        params: []
      },
      useDate: {
        name: 'useDate',
        category: 'utility',
        description: 'Date adapter composable',
        usage: 'const date = useDate()',
        params: []
      }
    }
  },

  // 🎨 하이브리드: Quasar
  'quasar': {
    id: 'quasar',
    name: 'Quasar',
    description: 'Quasar Framework - Vue Composables',
    packageName: 'quasar',
    docsUrl: 'https://quasar.dev',
    functions: {
      useQuasar: {
        name: 'useQuasar',
        category: 'core',
        description: 'Quasar instance composable',
        usage: 'const $q = useQuasar()',
        params: []
      },
      useDialogPluginComponent: {
        name: 'useDialogPluginComponent',
        category: 'dialog',
        description: 'Dialog plugin component helper',
        usage: 'const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()',
        params: []
      },
      useMeta: {
        name: 'useMeta',
        category: 'meta',
        description: 'Meta tags management composable',
        usage: 'useMeta({ title: "My Page" })',
        params: ['metaOptions']
      },
      useFormChild: {
        name: 'useFormChild',
        category: 'form',
        description: 'Form child registration composable',
        usage: 'useFormChild({ validate, resetValidation, requiresQForm: true })',
        params: ['options']
      }
    }
  }
};

/**
 * 유틸리티 라이브러리 ID로 정보 가져오기
 */
export function getUtilityLibraryInfo(libraryId: string): UtilityLibraryInfo | undefined {
  return UTILITY_LIBRARIES[libraryId];
}

/**
 * 특정 함수/composable 정보 가져오기
 */
export function getFunctionForUtilityLibrary(
  libraryId: string,
  functionName: string
): UtilityFunction | undefined {
  const libInfo = UTILITY_LIBRARIES[libraryId];
  if (!libInfo) return undefined;

  return libInfo.functions[functionName];
}

/**
 * 모든 지원 유틸리티 라이브러리 ID 목록
 */
export function getSupportedUtilityLibraries(): string[] {
  return Object.keys(UTILITY_LIBRARIES);
}

/**
 * 유틸리티 라이브러리의 함수 매핑 가져오기
 */
export function getFunctionMap(libraryId: string): Record<string, string> {
  const libInfo = UTILITY_LIBRARIES[libraryId];
  if (!libInfo) return {};

  const map: Record<string, string> = {};
  for (const [key, func] of Object.entries(libInfo.functions)) {
    map[key] = func.name;
  }
  return map;
}

/**
 * 카테고리별 함수 조회
 */
export function getFunctionsByCategory(libraryId: string, category: string): UtilityFunction[] {
  const libInfo = UTILITY_LIBRARIES[libraryId];
  if (!libInfo) return [];

  return Object.values(libInfo.functions).filter(func => func.category === category);
}

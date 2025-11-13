/**
 * 코드 메타데이터 추출 인터페이스
 *
 * 점수 산출 대신 구조화된 메타데이터를 추출하여
 * 동적 지침 로딩 시스템과 통합
 */

/**
 * 코드 복잡도 레벨
 */
export type ComplexityLevel = 'trivial' | 'low' | 'medium' | 'high' | 'very-high';

/**
 * 재사용 가능성
 */
export type ReusabilityLevel = 'low' | 'medium' | 'high';

/**
 * 에러 처리 수준
 */
export type ErrorHandlingLevel = 'none' | 'basic' | 'comprehensive';

/**
 * 타입 정의 품질
 */
export type TypeDefinitionQuality = 'poor' | 'basic' | 'good' | 'excellent';

/**
 * 파일 메타데이터 (API, Composable 등)
 */
export interface FileMetadata {
  filePath: string;
  category: 'composable' | 'api' | 'utility' | 'page' | 'other';

  // 🔑 핵심 메타데이터
  patterns: string[];                    // 사용된 디자인 패턴 (interceptor, queue, state-machine, etc)
  frameworks: string[];                  // 프레임워크/라이브러리 (vue, nuxt3, pinia, etc)
  designSystem?: string;                 // 디자인 시스템 (openerd-nuxt3, element-plus, vuetify, etc)
  utilityLibrary?: string;               // 유틸리티 라이브러리 (vueuse, lodash, date-fns, etc)
  apiType?: 'grpc' | 'openapi' | 'rest' | 'none';
  apiMethods: string[];                  // API 메서드 목록

  // 복잡도 및 품질 지표
  complexity: ComplexityLevel;
  reusability: ReusabilityLevel;
  errorHandling: ErrorHandlingLevel;
  typeDefinitions: TypeDefinitionQuality;

  // 의존성 및 관계
  dependencies: string[];                // 외부 라이브러리 의존성
  composablesUsed: string[];             // 사용된 composables
  entities: string[];                    // 엔티티/도메인 객체 (User, Order, etc)

  // 기능 및 특징
  features: string[];                    // 주요 기능 목록
  hasDocumentation: boolean;             // JSDoc/주석 존재 여부

  // 우수 코드 여부
  isExcellent: boolean;                  // 재사용 가능한 우수 코드인지
  excellentReasons?: string[];           // 우수한 이유 목록

  // 줄 수 (복잡도 판단 참고)
  linesOfCode: number;
}

/**
 * Vue 컴포넌트 메타데이터
 */
export interface ComponentMetadata {
  filePath: string;
  category: 'component';

  // 🔑 핵심 메타데이터
  patterns: string[];                    // 컴포넌트 패턴 (slot-forwarding, v-model, provide-inject, etc)
  frameworks: string[];                  // UI 라이브러리 (tailwind, openerd-nuxt3, etc)
  designSystem?: string;                 // 디자인 시스템 (openerd-nuxt3, element-plus, vuetify, etc)
  utilityLibrary?: string;               // 유틸리티 라이브러리 (vueuse, lodash, date-fns, etc)

  // 컴포넌트 사용 정보
  componentsUsed: string[];              // 사용된 자식 컴포넌트
  composablesUsed: string[];             // 사용된 composables

  // v-model 바인딩 분석
  vModelBindings: Array<{
    name: string;                        // 바인딩 변수명
    component: string;                   // 바인딩된 컴포넌트
    hasWatch: boolean;                   // watch 사용 여부
    hasValidation: boolean;              // 검증 로직 여부
    hasTypeDefinition: boolean;          // 타입 정의 여부
  }>;

  // 복잡도 및 품질
  complexity: ComplexityLevel;
  reusability: ReusabilityLevel;
  errorHandling: ErrorHandlingLevel;
  typeDefinitions: TypeDefinitionQuality;

  // 기능
  features: string[];                    // CRUD, search, pagination, etc
  entities: string[];                    // 다루는 엔티티
  hasLoadingStates: boolean;             // 로딩 상태 관리 여부
  hasErrorStates: boolean;               // 에러 상태 관리 여부

  // 우수 코드
  isExcellent: boolean;
  excellentReasons?: string[];
  excellentPatterns?: string[];          // 우수한 패턴 목록

  // 줄 수
  linesOfCode: number;
  templateLines: number;
  scriptLines: number;
}

/**
 * 우수 코드 스니펫 메타데이터
 */
export interface ExcellentCodeMetadata {
  filePath: string;
  lines: string;                         // 라인 범위 (e.g., "10-50")
  category: string;

  // 메타데이터
  patterns: string[];                    // 사용된 패턴
  reason: string;                        // 우수한 이유
  usageContext: string;                  // 사용 맥락
  reusable: boolean;                     // 재사용 가능 여부
  tags: string[];                        // 태그 (grpc, pagination, error-handling, etc)

  // 코드 (선택적)
  code?: string;                         // 실제 코드 스니펫 (옵션)
}

/**
 * 프로젝트 전체 메타데이터 요약
 */
export interface ProjectMetadata {
  projectName: string;
  totalFiles: number;

  // 카테고리별 파일 수
  filesByCategory: Record<string, number>;

  // API 정보
  apiType: 'grpc' | 'openapi' | 'rest' | 'mixed' | 'none';
  apiMethods: string[];                  // 전체 API 메서드

  // 사용된 기술 스택
  frameworks: string[];                  // 중복 제거된 프레임워크 목록
  patterns: string[];                    // 중복 제거된 패턴 목록
  dependencies: string[];                // 외부 라이브러리
  designSystem?: string;                 // 주로 사용되는 디자인 시스템 (openerd-nuxt3, element-plus, vuetify, etc)
  utilityLibrary?: string;               // 주로 사용되는 유틸리티 라이브러리 (vueuse, lodash, date-fns, etc)

  // 컴포넌트 및 composable
  componentsUsed: string[];
  composablesUsed: string[];

  // 엔티티
  entities: string[];                    // 프로젝트에서 다루는 엔티티

  // 복잡도 분포
  complexityDistribution: Record<ComplexityLevel, number>;

  // 우수 코드
  excellentFiles: Array<{
    path: string;
    reasons: string[];
    patterns: string[];
  }>;
  excellentSnippets: ExcellentCodeMetadata[];

  // 통계
  averageComplexity: ComplexityLevel;
  totalLinesOfCode: number;
  filesWithGoodErrorHandling: number;
  filesWithGoodTypes: number;
}

/**
 * 로컬 패키지 메타데이터 타입 정의
 *
 * 조직 내부 디자인 시스템/유틸리티 라이브러리를
 * 로컬에서 정의하고 AI가 분석하여 활용
 */

export type LocalPackageType = 'design-system' | 'utility' | 'hybrid';
export type LocalPackageSourceType = 'local' | 'git' | 'node_modules';

export interface LocalComponentInfo {
  name: string;
  description?: string;
  props?: string[];
  usage?: string;
  filePath?: string;
  category?: string;  // table, button, input, modal, layout, etc
}

export interface LocalFunctionInfo {
  name: string;
  category: string;  // state, event, utility, api, validation, etc
  description?: string;
  usage?: string;
  params?: string[];
  returnType?: string;
  filePath?: string;
}

export interface LocalDesignSystemInfo {
  componentPatterns: string[];  // 감지 패턴 (정규식 문자열)
  components: Record<string, LocalComponentInfo>;
  docsUrl?: string;
}

export interface LocalUtilityLibraryInfo {
  functionPatterns: string[];  // 감지 패턴 (정규식 문자열)
  functions: Record<string, LocalFunctionInfo>;
  docsUrl?: string;
}

export interface LocalPackage {
  id: string;                    // 고유 ID (예: openerd-nuxt3)
  type: LocalPackageType;        // design-system, utility, hybrid
  name: string;                  // 표시 이름
  packageName: string;           // npm 패키지명 (예: @openerd/nuxt3)

  // 소스 타입 및 경로
  sourceType: LocalPackageSourceType;  // local, git, node_modules
  sourcePath?: string;           // local: 절대 경로, git: clone된 경로 (자동), node_modules: 자동 감지

  // Git 저장소 정보 (sourceType이 'git'인 경우)
  gitUrl?: string;               // git+https://git.dev.opnd.io/common/openerd-nuxt3.git
  gitCommit?: string;            // 특정 커밋 해시
  gitBranch?: string;            // 특정 브랜치

  analyzed: boolean;             // AI 분석 완료 여부
  analyzedAt?: string;           // 분석 완료 시각 (ISO 8601)

  // 디자인 시스템 정보 (type이 design-system 또는 hybrid인 경우)
  designSystem?: LocalDesignSystemInfo;

  // 유틸리티 라이브러리 정보 (type이 utility 또는 hybrid인 경우)
  utilityLibrary?: LocalUtilityLibraryInfo;

  // 추가 메타데이터
  version?: string;
  description?: string;
  tags?: string[];
}

export interface LocalPackagesConfig {
  version: string;              // 설정 파일 버전
  localPackages: LocalPackage[];
}

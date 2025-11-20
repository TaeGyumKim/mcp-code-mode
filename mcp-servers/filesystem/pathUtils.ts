/**
 * 경로 변환 유틸리티
 *
 * 호스트 머신 경로를 Docker 컨테이너 경로로 변환합니다.
 */

import { createLogger } from '@mcp-code-mode/shared/logger';

const logger = createLogger('pathUtils');

/**
 * 호스트 경로를 컨테이너 경로로 변환
 *
 * @example
 * // Windows 호스트
 * convertHostPathToContainer('D:/01.Work/01.Projects/myapp/file.ts')
 * // => '/projects/myapp/file.ts'
 *
 * // Linux 호스트
 * convertHostPathToContainer('/home/user/projects/myapp/file.ts')
 * // => '/projects/myapp/file.ts'
 */
export function convertHostPathToContainer(path: string): string {
  const hostPath = process.env.HOST_PROJECTS_PATH;
  const containerPath = process.env.PROJECTS_PATH || '/projects';

  // Windows 경로 정규화 (백슬래시 → 슬래시)
  const normalizedPath = path.replace(/\\/g, '/');

  // 이미 컨테이너 경로인 경우 그대로 반환
  if (normalizedPath.startsWith(containerPath)) {
    return normalizedPath;
  }

  // HOST_PROJECTS_PATH가 설정된 경우 사용
  if (hostPath) {
    const normalizedHostPath = hostPath.replace(/\\/g, '/');

    // 호스트 경로를 컨테이너 경로로 변환
    if (normalizedPath.startsWith(normalizedHostPath)) {
      const relativePath = normalizedPath.substring(normalizedHostPath.length);
      return `${containerPath}${relativePath}`;
    }
  }

  // HOST_PROJECTS_PATH가 없는 경우 - Windows 절대 경로 자동 감지
  // 패턴: D:/01.Work/01.Projects/myapp/... → /projects/myapp/...
  const windowsPattern = /^[a-zA-Z]:\/.*?\/01\.Projects\//i;
  if (windowsPattern.test(normalizedPath)) {
    // "01.Projects/" 이후 부분 추출
    const projectsIndex = normalizedPath.toLowerCase().indexOf('/01.projects/');
    if (projectsIndex !== -1) {
      const relativePath = normalizedPath.substring(projectsIndex + '/01.projects/'.length);
      return `${containerPath}/${relativePath}`;
    }
  }

  // 일반 Windows 절대 경로 (C:\, D:\, etc.)를 상대 경로로 변환 시도
  // 패턴: D:/path/to/projects/myapp/... → /projects/myapp/...
  const drivePattern = /^[a-zA-Z]:\//;
  if (drivePattern.test(normalizedPath)) {
    // 드라이브 레터 제거하고 경로 탐색
    // 마지막 "projects" 또는 "Projects" 디렉토리를 기준으로 분할
    const projectsDirMatch = normalizedPath.match(/\/(projects|Projects)\//i);
    if (projectsDirMatch) {
      const matchIndex = normalizedPath.indexOf(projectsDirMatch[0]);
      const relativePath = normalizedPath.substring(matchIndex + projectsDirMatch[0].length);
      return `${containerPath}/${relativePath}`;
    }

    // "projects" 디렉토리가 없는 경우 경고 로그
    logger.warn('Cannot convert Windows path without "projects" directory', {
      path: normalizedPath,
      hint: 'Set HOST_PROJECTS_PATH environment variable for reliable path conversion'
    });
  }

  // 기본적으로 입력 경로 그대로 반환
  return normalizedPath;
}

/**
 * 컨테이너 경로를 호스트 경로로 변환 (역변환)
 *
 * @example
 * convertContainerPathToHost('/projects/myapp/file.ts')
 * // => 'D:/01.Work/01.Projects/myapp/file.ts' (Windows)
 * // => '/home/user/projects/myapp/file.ts' (Linux)
 */
export function convertContainerPathToHost(path: string): string {
  const hostPath = process.env.HOST_PROJECTS_PATH;
  const containerPath = process.env.PROJECTS_PATH || '/projects';

  if (!hostPath) {
    // 환경변수가 없으면 변환하지 않음
    return path;
  }

  // Windows 경로 정규화
  const normalizedPath = path.replace(/\\/g, '/');
  const normalizedHostPath = hostPath.replace(/\\/g, '/');

  // 컨테이너 경로를 호스트 경로로 변환
  if (normalizedPath.startsWith(containerPath)) {
    const relativePath = normalizedPath.substring(containerPath.length);
    return `${normalizedHostPath}${relativePath}`;
  }

  // 기본적으로 입력 경로 그대로 반환
  return normalizedPath;
}

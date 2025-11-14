/**
 * 경로 변환 유틸리티
 *
 * 호스트 머신 경로를 Docker 컨테이너 경로로 변환합니다.
 */

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

  if (!hostPath) {
    // 환경변수가 없으면 이미 컨테이너 경로라고 가정
    return path;
  }

  // Windows 경로 정규화 (백슬래시 → 슬래시)
  const normalizedPath = path.replace(/\\/g, '/');
  const normalizedHostPath = hostPath.replace(/\\/g, '/');

  // 호스트 경로를 컨테이너 경로로 변환
  if (normalizedPath.startsWith(normalizedHostPath)) {
    const relativePath = normalizedPath.substring(normalizedHostPath.length);
    return `${containerPath}${relativePath}`;
  }

  // 이미 컨테이너 경로인 경우 그대로 반환
  if (normalizedPath.startsWith(containerPath)) {
    return normalizedPath;
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

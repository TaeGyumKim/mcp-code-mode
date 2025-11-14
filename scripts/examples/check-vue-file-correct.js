/**
 * ✅ 올바른 샌드박스 코드
 *
 * 사용자의 원래 코드를 filesystem API를 사용하도록 변환
 */

(async () => {
  // ✅ 환경변수로부터 프로젝트 경로 가져오기
  const projectPath = process.env.EXAMPLE_PROJECT_PATH || '/projects/49.airian/frontend-admin';
  const p = `${projectPath}/pages/memberManagement.vue`;

  try {
    // ✅ filesystem.readFile() 사용 (fs.readFile 대신)
    const result = await filesystem.readFile({ path: p });
    const content = result.content;

    // 정규표현식 검사 (원본과 동일)
    const hasVueImport = /import\s*\{[^}]*reactive[^}]*ref[^}]*\}\s*from\s*['"]vue['"]/.test(content) ||
                        /import\s*\{[^}]*reactive[^}]*,?\s*ref[^}]*\}/.test(content);

    const hasUsePagingImport = /import\s*\{[^}]*usePaging[^}]*\}\s*from/.test(content);

    const hasResetFilters = /function\s+resetFilters\(\)\s*\{[\s\S]*filters\.searchType\s*=\s*"email"[\s\S]*dateTerm\.value\s*=\s*\{\}/.test(content);

    // 결과 출력
    const result = {
      path: p,
      fileSize: content.length,
      hasVueImport,
      hasUsePagingImport,
      hasResetFilters
    };

    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (err) {
    console.error('ERROR', err.message || String(err));
    return {
      error: err.message || String(err),
      path: p
    };
  }
})()

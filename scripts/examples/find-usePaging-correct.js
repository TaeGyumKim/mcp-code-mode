/**
 * ✅ 올바른 방법: filesystem.searchFiles() 사용
 *
 * usePaging을 사용하는 파일을 찾는 예제
 */

(async () => {
  const result = {
    ok: false,
    finds: [],
    filePreview: null,
    errors: []
  };

  try {
    // 1. ✅ 환경변수로부터 프로젝트 경로 가져오기
    const projectPath = process.env.EXAMPLE_PROJECT_PATH || '/projects/49.airian/frontend-admin';
    const targetPath = `${projectPath}/pages/memberManagement.vue`;

    try {
      const fileResult = await filesystem.readFile({ path: targetPath });
      result.filePreview = fileResult.content.split('\n').slice(0, 120).join('\n');
      console.log(`✅ 타겟 파일 읽기 성공: ${fileResult.size} bytes`);
    } catch (e) {
      result.errors.push(`타겟 파일 읽기 실패: ${e.message}`);
      console.log(`⚠️  타겟 파일 읽기 실패: ${e.message}`);
    }

    // 2. ✅ searchFiles()로 모든 Vue/JS/TS 파일 찾기
    console.log('🔍 파일 검색 시작...');
    const searchResult = await filesystem.searchFiles({
      path: projectPath,
      pattern: '**/*.{vue,js,ts,mjs}',
      recursive: true
    });

    const allFiles = searchResult.files || [];
    console.log(`📁 총 ${allFiles.length}개 파일 발견`);

    // 3. 각 파일에서 'usePaging' 검색
    let checkedCount = 0;
    let foundCount = 0;

    for (const filePath of allFiles) {
      checkedCount++;

      // 진행상황 로그 (100개마다)
      if (checkedCount % 100 === 0) {
        console.log(`⏳ 검색 중... ${checkedCount}/${allFiles.length}`);
      }

      try {
        const fileResult = await filesystem.readFile({ path: filePath });
        const content = fileResult.content;

        if (content && content.includes('usePaging')) {
          foundCount++;

          // import/export/function 라인 추출
          const lines = content.split('\n');
          const importLines = lines
            .filter(l => /import.*usePaging|function usePaging|export.*usePaging|const usePaging/.test(l))
            .slice(0, 10);

          // 사용 예시 추출 (usePaging 호출 라인)
          const usageLines = lines
            .filter(l => /usePaging\(/.test(l) && !/^\/\//.test(l.trim()))
            .slice(0, 5);

          result.finds.push({
            file: filePath,
            imports: importLines,
            usage: usageLines,
            snippet: lines.slice(0, 30).join('\n')
          });

          console.log(`✅ [${foundCount}] ${filePath}`);
        }
      } catch (e) {
        // 파일 읽기 실패는 무시 (권한 문제, 바이너리 파일 등)
      }
    }

    console.log(`\n🎉 검색 완료: ${foundCount}개 파일에서 usePaging 발견 (총 ${checkedCount}개 검사)`);

    result.ok = true;
    return result;

  } catch (err) {
    result.errors.push(String(err));
    console.error('❌ 에러:', err);
    return result;
  }
})()

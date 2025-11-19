/**
 * 실제 에러 케이스 테스트
 *
 * 사용자가 보고한 실제 에러 코드를 테스트합니다
 */

// removeStringsAndComments 함수 복사 (테스트용)
function removeStringsAndComments(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];

    // 1. 블록 주석 제거
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      result += ' ';
      continue;
    }

    // 2. 라인 주석 제거
    if (char === '/' && nextChar === '/') {
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      result += '\n';
      i++;
      continue;
    }

    // 3. 정규식 리터럴 제거
    if (char === '/' && /[=(\[,;:!&|?+\-*/%\s]/.test(code[i - 1] || ' ')) {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '/') {
          i++;
          while (i < code.length && /[gimsuvy]/.test(code[i])) {
            i++;
          }
          break;
        }
        i++;
      }
      continue;
    }

    // 4. 템플릿 리터럴 제거
    if (char === '`') {
      result += '""';
      i++;
      let templateDepth = 1;

      while (i < code.length && templateDepth > 0) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }

        if (code[i] === '$' && code[i + 1] === '{') {
          i += 2;
          let braceDepth = 1;

          while (i < code.length && braceDepth > 0) {
            if (code[i] === '\\') {
              i += 2;
              continue;
            }
            if (code[i] === '{') braceDepth++;
            if (code[i] === '}') braceDepth--;

            if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
              const quote = code[i];
              i++;
              while (i < code.length) {
                if (code[i] === '\\') {
                  i += 2;
                  continue;
                }
                if (code[i] === quote) {
                  i++;
                  break;
                }
                i++;
              }
              continue;
            }

            i++;
          }
          continue;
        }

        if (code[i] === '`') {
          templateDepth--;
          i++;
          break;
        }

        i++;
      }
      continue;
    }

    // 5. 큰따옴표 문자열 제거
    if (char === '"') {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // 6. 작은따옴표 문자열 제거
    if (char === "'") {
      result += '""';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // 7. 일반 문자 추가
    result += char;
    i++;
  }

  return result;
}

function detectTypeScriptSyntax(code: string): boolean {
  const cleanedCode = removeStringsAndComments(code);

  const hasInterface = /\binterface\s+\w+/.test(cleanedCode);
  const hasTypeAlias = /\btype\s+\w+\s*=/.test(cleanedCode);

  // 타입 어노테이션 감지 (삼항 연산자 제외)
  const hasVariableTypeAnnotation = /\b(const|let|var)\s+\w+\s*:\s*\w+/.test(cleanedCode);
  const hasParameterTypeAnnotation = /\(\s*\w+\s*:\s*\w+/.test(cleanedCode);
  const hasFunctionReturnType = /\)\s*:\s*\w+\s*(\{|=>)/.test(cleanedCode);

  return hasInterface || hasTypeAlias || hasVariableTypeAnnotation || hasParameterTypeAnnotation || hasFunctionReturnType;
}

// 실제 사용자 코드 (문제가 발생한 코드)
const actualCode = `(async function main(){
  try{
    const filePath = \`d:\\\\01.Work\\\\01.Projects\\\\49.airian\\\\frontend-admin\\\\pages\\\\noticeManagement.vue\`;
    const res = await filesystem.readFile({ path: filePath });
    const content = res && res.content ? res.content : '';

    const section = (name, rx) => {
      const m = content.match(rx);
      return m ? m[0] : null;
    };

    const template = section('template', /<template>[\\s\\S]*?<\\/template>/i);
    const scriptSetup = section('scriptSetup', /<script[^>]*setup[^>]*>[\\s\\S]*?<\\/script>/i);
    const script = section('script', /<script(?![^>]*setup)[^>]*>[\\s\\S]*?<\\/script>/i);

    const importRx = /import\\s+([^;]+?)\\s+from\\s+['\"]([^'\"]+)['\"]/g;
    const imports = [];
    let im;
    while((im = importRx.exec(content)) !== null){
      imports.push({raw: im[0].trim(), spec: im[1].trim(), from: im[2].trim()});
    }

    const findAll = (rx) => {
      const arr = [];
      let m;
      while((m = rx.exec(content)) !== null) arr.push(m[1] || m[0]);
      return arr;
    };

    const usages = {
      useRouter: findAll(/useRouter\\s*\\(/g).length,
      usePaging: findAll(/usePaging\\s*\\(/g).length,
      ref: findAll(/\\bref\\s*\\(/g).length,
      reactive: findAll(/\\breactive\\s*\\(/g).length,
      definePageMeta: findAll(/definePageMeta\\s*\\(/g).length,
    };

    let headers = null;
    const headersMatch = content.match(/const\\s+headers\\s*[:=][\\s\\S]*?\\]/m);
    if(headersMatch){
      try{
        const arrText = headersMatch[0].replace(/const\\s+headers\\s*[:=]\\s*/,'');
        const jsonLike = arrText
          .replace(/(\\w+)\\s*:/g, '\"$1\":')
          .replace(/'(.*?)'/g, '\"$1\"')
          .replace(/\\,\\s*\\]/g, ']');
        const firstBracket = jsonLike.match(/\\[([\\s\\S]*?)\\]/);
        if(firstBracket){
          const arrInside = '[' + firstBracket[1] + ']';
          headers = JSON.parse(arrInside);
        }
      }catch(e){
        headers = null;
      }
    }

    const summary = {
      filePath,
      sections: { hasTemplate: !!template, hasScriptSetup: !!scriptSetup, hasScript: !!script },
      importsCount: imports.length,
      someImports: imports.slice(0,10),
      usages,
      headers: headers || 'could-not-parse',
    };

    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }catch(err){
    console.error('Error:', err);
    throw err;
  }
})();`;

console.log('🧪 실제 에러 케이스 테스트\n');

// 1. 정제된 코드 확인
console.log('1. removeStringsAndComments 테스트');
console.log('=====================================');
const cleaned = removeStringsAndComments(actualCode);
console.log('\n정제된 코드 (처음 500자):');
console.log(cleaned.substring(0, 500));
console.log('\n...');

// 2. TypeScript 문법 감지
console.log('\n2. detectTypeScriptSyntax 테스트');
console.log('===================================');
const hasTS = detectTypeScriptSyntax(actualCode);
console.log(`TypeScript 문법 감지: ${hasTS}`);

// 3. 정규식 패턴 찾기
console.log('\n3. 타입 어노테이션 패턴 찾기');
console.log('==============================');
const typeAnnotationRegex = /:\s*\w+(\[\]|<[^>]+>)?\s*(=|;|\))/g;
let match;
let matchCount = 0;
while ((match = typeAnnotationRegex.exec(cleaned)) !== null) {
  matchCount++;
  const start = Math.max(0, match.index - 20);
  const end = Math.min(cleaned.length, match.index + match[0].length + 20);
  console.log(`\n매치 ${matchCount}:`);
  console.log(`  위치: ${match.index}`);
  console.log(`  매치: "${match[0]}"`);
  console.log(`  컨텍스트: "${cleaned.substring(start, end)}"`);

  if (matchCount >= 5) {
    console.log('\n... (더 많은 매치가 있을 수 있음)');
    break;
  }
}

if (matchCount === 0) {
  console.log('타입 어노테이션 패턴이 발견되지 않았습니다.');
}

// 4. 원본 코드에서 찾기
console.log('\n4. 원본 코드에서 타입 어노테이션 패턴 찾기');
console.log('=============================================');
typeAnnotationRegex.lastIndex = 0;
matchCount = 0;
while ((match = typeAnnotationRegex.exec(actualCode)) !== null) {
  matchCount++;
  const start = Math.max(0, match.index - 30);
  const end = Math.min(actualCode.length, match.index + match[0].length + 30);
  console.log(`\n원본 매치 ${matchCount}:`);
  console.log(`  위치: ${match.index}`);
  console.log(`  매치: "${match[0]}"`);
  console.log(`  컨텍스트: "${actualCode.substring(start, end)}"`);

  if (matchCount >= 5) {
    console.log('\n... (더 많은 매치가 있을 수 있음)');
    break;
  }
}

console.log(`\n\n최종 결과: TypeScript 문법 ${hasTS ? '감지됨' : '감지 안됨'}`);
console.log(hasTS ? '❌ 오탐지 발생!' : '✅ 정상 작동');

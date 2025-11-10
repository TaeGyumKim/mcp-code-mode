/**
 * MCP 도구명 일괄 변경 스크립트
 * 
 * 실제 mcp.json 설정에 맞게 지침 파일의 도구명을 수정합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 변경할 도구명 매핑
const toolNameMappings = [
  // openerd-nuxt3 관련
  {
    old: 'mcp_openerd-nuxt3_search_files',
    new: 'mcp_openerd-nuxt3-search_search'
  },
  {
    old: 'mcp_openerd-nuxt3_read_text_file',
    new: 'mcp_openerd-nuxt3-lib_read_file'
  },
  
  // reference 프로젝트 관련
  {
    old: 'mcp_reference-tai_search',
    new: 'mcp_reference-tailwind-nuxt3-search_search'
  },
  {
    old: 'mcp_reference-tai_read_text_file',
    new: 'mcp_reference-tailwind-nuxt3_read_file'
  },
  
  // workspace 관련
  {
    old: 'mcp_workspace-fs-_',
    new: 'mcp_workspace-fs-all_'
  }
];

// 수정할 파일 목록
const targetFiles = [
  '.github/instructions/00-bestcase-priority.md',
  '.github/instructions/bestcase-usage.md',
  'BESTCASE_PRIORITY_GUIDE.md',
  'README.md'
];

function updateToolNames(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;
  
  toolNameMappings.forEach(({ old, new: newName }) => {
    const regex = new RegExp(old.replace(/_/g, '_'), 'g');
    const matches = content.match(regex);
    
    if (matches) {
      content = content.replace(regex, newName);
      changeCount += matches.length;
      console.log(`  ✅ ${old} → ${newName} (${matches.length} occurrences)`);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  💾 Saved ${changeCount} changes`);
  } else {
    console.log(`  ℹ️  No changes needed`);
  }
}

// 메인 실행
console.log('🚀 MCP Tool Name Update Script\n');
console.log('Mappings:');
toolNameMappings.forEach(({ old, new: newName }) => {
  console.log(`  ${old} → ${newName}`);
});

targetFiles.forEach(updateToolNames);

console.log('\n✨ Done!');

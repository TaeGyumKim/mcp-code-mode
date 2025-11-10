/**
 * 오래된 BestCase 정리 스크립트
 * 각 프로젝트별로 최신 결과만 유지
 */

import { readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

const BESTCASE_STORAGE_PATH = process.env.BESTCASE_STORAGE_PATH || 'D:/01.Work/01.Projects/.bestcases';

console.log('🧹 Starting BestCase Cleanup');
console.log(`📂 Storage Path: ${BESTCASE_STORAGE_PATH}`);
console.log('');

try {
  const files = readdirSync(BESTCASE_STORAGE_PATH);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📊 Total BestCase files: ${jsonFiles.length}`);
  
  // 프로젝트별로 그룹화
  const projectFiles = new Map();
  
  for (const file of jsonFiles) {
    // 파일명 파싱: projectName-category-timestamp.json
    const match = file.match(/^(.+)-auto-scan-ai-(\d+)\.json$/);
    if (!match) continue;
    
    const projectName = match[1];
    const timestamp = parseInt(match[2]);
    const filePath = join(BESTCASE_STORAGE_PATH, file);
    const stat = statSync(filePath);
    
    if (!projectFiles.has(projectName)) {
      projectFiles.set(projectName, []);
    }
    
    projectFiles.get(projectName).push({
      file,
      filePath,
      timestamp,
      mtime: stat.mtime
    });
  }
  
  console.log(`📁 Unique projects: ${projectFiles.size}`);
  console.log('');
  
  let deletedCount = 0;
  let keptCount = 0;
  
  // 각 프로젝트별로 최신 파일만 유지
  for (const [projectName, files] of projectFiles.entries()) {
    // 타임스탬프 기준 정렬 (최신순)
    files.sort((a, b) => b.timestamp - a.timestamp);
    
    const latestFile = files[0];
    const oldFiles = files.slice(1);
    
    if (oldFiles.length > 0) {
      console.log(`🔍 ${projectName}:`);
      console.log(`  ✅ Keeping: ${latestFile.file}`);
      keptCount++;
      
      for (const oldFile of oldFiles) {
        try {
          unlinkSync(oldFile.filePath);
          console.log(`  🗑️  Deleted: ${oldFile.file}`);
          deletedCount++;
        } catch (error) {
          console.log(`  ❌ Failed to delete: ${oldFile.file}`);
        }
      }
      console.log('');
    } else {
      keptCount++;
    }
  }
  
  console.log('✨ Cleanup Complete');
  console.log(`📊 Summary:`);
  console.log(`  - Files kept: ${keptCount}`);
  console.log(`  - Files deleted: ${deletedCount}`);
  console.log('');
  
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
}

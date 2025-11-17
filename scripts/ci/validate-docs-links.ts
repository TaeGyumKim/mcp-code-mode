#!/usr/bin/env tsx
/**
 * 문서 링크 검증 스크립트
 *
 * README.md와 docs/README.md의 모든 마크다운 링크를 검증합니다.
 * CI/CD 파이프라인에서 실행되어 broken links를 방지합니다.
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';

interface LinkInfo {
  file: string;
  line: number;
  link: string;
  target: string;
}

const projectRoot = resolve(process.cwd());

/**
 * 마크다운 파일에서 링크 추출
 */
async function extractLinks(filePath: string): Promise<LinkInfo[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const links: LinkInfo[] = [];

  // 마크다운 링크 패턴: [text](path)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = linkPattern.exec(line)) !== null) {
      const target = match[2];

      // 외부 링크는 스킵
      if (target.startsWith('http://') || target.startsWith('https://')) {
        continue;
      }

      // 앵커만 있는 링크는 스킵
      if (target.startsWith('#')) {
        continue;
      }

      links.push({
        file: filePath,
        line: index + 1,
        link: match[0],
        target: target.replace(/#.*$/, '') // 앵커 제거
      });
    }
  });

  return links;
}

/**
 * 링크 대상 파일이 존재하는지 확인
 */
async function validateLink(link: LinkInfo): Promise<boolean> {
  // 상대 경로를 절대 경로로 변환
  const baseDir = link.file.endsWith('README.md')
    ? join(projectRoot, link.file.includes('/docs/') ? 'docs' : '.')
    : projectRoot;

  const targetPath = link.target.startsWith('./')
    ? join(baseDir, link.target.substring(2))
    : join(baseDir, link.target);

  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 메인 검증 함수
 */
async function main() {
  console.log('📋 문서 링크 검증 시작\n');

  const filesToCheck = [
    'README.md',
    'docs/README.md'
  ];

  let totalLinks = 0;
  let brokenLinks = 0;
  const errors: Array<{ link: LinkInfo; targetPath: string }> = [];

  for (const file of filesToCheck) {
    const filePath = join(projectRoot, file);

    try {
      await fs.access(filePath);
    } catch {
      console.log(`⚠️  ${file}: 파일을 찾을 수 없음 (스킵)\n`);
      continue;
    }

    console.log(`📄 ${file} 검증 중...`);

    const links = await extractLinks(filePath);
    totalLinks += links.length;
    console.log(`   → ${links.length}개 링크 발견`);

    for (const link of links) {
      const isValid = await validateLink(link);

      if (!isValid) {
        brokenLinks++;
        const baseDir = link.file.includes('/docs/') ? join(projectRoot, 'docs') : projectRoot;
        const targetPath = link.target.startsWith('./')
          ? join(baseDir, link.target.substring(2))
          : join(baseDir, link.target);

        errors.push({ link, targetPath });
      }
    }

    console.log(`   → ✅ ${links.length - errors.filter(e => e.link.file === filePath).length}개 유효`);

    const fileErrors = errors.filter(e => e.link.file === filePath).length;
    if (fileErrors > 0) {
      console.log(`   → ❌ ${fileErrors}개 broken`);
    }

    console.log('');
  }

  console.log('━'.repeat(60));
  console.log(`📊 검증 결과: 총 ${totalLinks}개 링크`);
  console.log(`   ✅ 유효: ${totalLinks - brokenLinks}개`);
  console.log(`   ❌ Broken: ${brokenLinks}개`);
  console.log('━'.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ Broken Links:\n');

    errors.forEach(({ link, targetPath }) => {
      console.log(`파일: ${link.file}:${link.line}`);
      console.log(`링크: ${link.link}`);
      console.log(`대상: ${targetPath}`);
      console.log(`상태: 파일을 찾을 수 없음\n`);
    });

    console.error('\n💥 문서 링크 검증 실패: broken links를 수정하세요');
    process.exit(1);
  } else {
    console.log('\n✅ 모든 문서 링크가 유효합니다!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('💥 검증 스크립트 실행 실패:', err);
  process.exit(1);
});

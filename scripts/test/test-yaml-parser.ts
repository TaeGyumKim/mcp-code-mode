#!/usr/bin/env tsx
/**
 * YAML 파서 테스트
 */

import { promises as fs } from 'fs';

const testFile = '/home/user/mcp-code-mode/.github/instructions/guides/api/grpc-api-connection.md';

console.log('Testing YAML parser on:', testFile);
console.log('━'.repeat(60));

const content = await fs.readFile(testFile, 'utf-8');

console.log('File content length:', content.length);
console.log('\nFirst 500 chars:');
console.log(content.substring(0, 500));
console.log('\n' + '━'.repeat(60));

// Check for YAML front matter
const metadataMatch = content.match(/^---\n([\s\S]+?)\n---/);

if (!metadataMatch) {
  console.error('❌ No YAML front matter found!');
  console.log('\nChecking if file starts with ---:');
  console.log('Starts with ---:', content.startsWith('---'));
  console.log('First 100 bytes as hex:');
  console.log(Buffer.from(content.substring(0, 100)).toString('hex'));
} else {
  console.log('✅ YAML front matter found!');
  console.log('\nExtracted YAML:');
  console.log(metadataMatch[1]);
  console.log('\n' + '━'.repeat(60));

  // Parse YAML
  const yamlContent = metadataMatch[1];
  const lines = yamlContent.split('\n');
  const metadata: any = {};

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    let value: any = line.substring(colonIdx + 1).trim();

    // 배열 처리 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v);
    }
    // 숫자 처리
    else if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }
    // 문자열 따옴표 제거
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    metadata[key] = value;
  }

  console.log('\nParsed metadata:');
  console.log(JSON.stringify(metadata, null, 2));
}

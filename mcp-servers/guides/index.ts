import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GuideMetadata {
  id: string;
  scope: 'project' | 'repo' | 'org' | 'global';
  apiType: 'grpc' | 'openapi' | 'any';
  tags: string[];
  priority: number;  // 0-100
  version: string;   // YYYY.MM.DD
  requires?: string[];
  excludes?: string[];
  summary: string;
  mandatory?: boolean;  // 🔑 필수 가이드 (자동으로 항상 로드됨)
}

export interface Guide extends GuideMetadata {
  content: string;
  filePath: string;
}

/**
 * 지침 파일 디렉토리 스캔 및 메타데이터 추출
 */
export async function indexGuides(): Promise<Guide[]> {
  // Docker 컨테이너에서 실행 시: /app/mcp-servers/guides/dist/ → /app/.github/instructions/guides
  const guidesDir = join(__dirname, '../../../.github/instructions/guides');

  console.error('[indexGuides] Scanning directory:', guidesDir);
  
  try {
    const guides: Guide[] = [];
    
    // 재귀적으로 모든 .md 파일 검색
    await scanDirectory(guidesDir, guidesDir, guides);
    
    console.error('[indexGuides] Total guides loaded:', guides.length);
    return guides;
  } catch (error: any) {
    console.error('[indexGuides] Failed to index guides:', error.message);
    throw new Error(`Failed to index guides: ${error.message}`);
  }
}

/**
 * 디렉토리 재귀 스캔
 */
async function scanDirectory(baseDir: string, currentDir: string, guides: Guide[]): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    
    if (entry.isDirectory()) {
      // 하위 디렉토리 재귀 스캔
      await scanDirectory(baseDir, fullPath, guides);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // .md 파일 처리
      let content = await fs.readFile(fullPath, 'utf-8');

      // 줄바꿈 정규화 (CRLF → LF)
      content = content.replace(/\r\n/g, '\n');

      // 메타데이터 추출 (YAML front matter)
      const metadataMatch = content.match(/^---\n([\s\S]+?)\n---/);

      if (!metadataMatch) {
        console.error('[scanDirectory] No metadata in file:', fullPath);
        continue;
      }
      
      const metadataYaml = metadataMatch[1];
      const metadata = parseYamlMetadata(metadataYaml);
      
      const guideContent = content.replace(/^---\n[\s\S]+?\n---\n/, '').trim();
      
      // 상대 경로 계산 (guides/ 기준)
      const relativePath = fullPath.replace(baseDir + '/', '').replace(/\\/g, '/');
      
      console.error('[scanDirectory] Loaded guide:', {
        id: metadata.id,
        path: relativePath,
        scope: metadata.scope,
        apiType: metadata.apiType,
        priority: metadata.priority,
      });
      
      guides.push({
        ...metadata,
        content: guideContent,
        filePath: relativePath,
      });
    }
  }
}

/**
 * 간단한 YAML 파서 (front matter용)
 */
function parseYamlMetadata(yaml: string): GuideMetadata {
  const lines = yaml.split('\n');
  const metadata: any = {};
  
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    
    const key = line.substring(0, colonIdx).trim();
    let value: any = line.substring(colonIdx + 1).trim();
    
    // Boolean 처리
    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }
    // 배열 처리 [a, b, c]
    else if (value.startsWith('[') && value.endsWith(']')) {
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
  
  return metadata as GuideMetadata;
}

/**
 * 키워드로 지침 검색
 */
export interface SearchGuidesInput {
  keywords: string[];
  projectName?: string;
  apiType?: 'grpc' | 'openapi' | 'any';
  scope?: 'project' | 'repo' | 'org' | 'global';
  mandatoryIds?: string[];  // 🔑 필수 지침 ID (키워드 매칭 무관)
  designSystem?: string;     // 🎨 디자인 시스템 ID (검색 우선순위 부스트)
  utilityLibrary?: string;   // 🔧 유틸리티 라이브러리 ID (검색 우선순위 부스트)
}

export interface SearchGuidesOutput {
  guides: Array<{
    id: string;
    score: number;
    summary: string;
    filePath: string;
    tags: string[];
    priority: number;
  }>;
  mandatoryReminders?: string[];  // 🔑 필수 가이드 경고 메시지
}

/**
 * 지침 검색 (BM25-like 스코어링)
 */
export async function searchGuides(input: SearchGuidesInput): Promise<SearchGuidesOutput> {
  console.error('[searchGuides] Input:', JSON.stringify(input, null, 2));

  const allGuides = await indexGuides();

  // 🔑 mandatory: true인 가이드를 자동으로 mandatoryIds에 추가
  const autoMandatoryIds = allGuides
    .filter(g => g.mandatory === true)
    .map(g => g.id);

  if (autoMandatoryIds.length > 0) {
    console.error('[searchGuides] Auto-detected mandatory guides:', autoMandatoryIds);
  }

  // mandatoryIds와 auto-detected mandatory 병합
  const allMandatoryIds = [
    ...(input.mandatoryIds || []),
    ...autoMandatoryIds
  ];

  // 중복 제거
  const uniqueMandatoryIds = [...new Set(allMandatoryIds)];

  // 🔑 필수 지침 먼저 확보 (키워드 매칭 무관)
  const mandatoryGuides: any[] = [];
  if (uniqueMandatoryIds.length > 0) {
    for (const id of uniqueMandatoryIds) {
      const guide = allGuides.find(g => g.id === id);
      if (guide) {
        console.error('[searchGuides] Mandatory guide loaded:', {
          id: guide.id,
          summary: guide.summary,
          priority: guide.priority,
          autoDetected: guide.mandatory === true
        });
        mandatoryGuides.push({
          id: guide.id,
          score: 1000, // 필수 지침은 최고 점수
          summary: guide.summary,
          filePath: guide.filePath,
          tags: guide.tags,
          priority: guide.priority,
          guide
        });
      } else {
        console.error('[searchGuides] Mandatory guide NOT FOUND:', id);
      }
    }
  }
  
  const scoredGuides = allGuides.map(guide => {
    // 이미 필수 지침에 포함된 경우 스킵
    if (mandatoryGuides.some(m => m.id === guide.id)) {
      return null;
    }
    
    let score = 0;
    
    // 1. API Type 매칭 (+30점)
    if (input.apiType) {
      if (guide.apiType === input.apiType || guide.apiType === 'any') {
        score += 30;
      } else {
        return null;  // API type 불일치 시 제외
      }
    }
    
    // 2. Scope 매칭 (+20점)
    if (input.scope && guide.scope === input.scope) {
      score += 20;
    }
    
    // 3. 디자인 시스템 매칭 (+40점) 🎨
    if (input.designSystem) {
      const lowerDesignSystem = input.designSystem.toLowerCase();

      // ID 완전 매칭
      if (guide.id === input.designSystem || guide.id === `${input.designSystem}-guide`) {
        score += 40;
      }
      // 태그 매칭
      else if (guide.tags.some(tag => tag.toLowerCase().includes(lowerDesignSystem))) {
        score += 35;
      }
      // 요약/내용 매칭
      else if (guide.summary.toLowerCase().includes(lowerDesignSystem) ||
               guide.content.toLowerCase().includes(lowerDesignSystem)) {
        score += 25;
      }
    }

    // 3.5. 유틸리티 라이브러리 매칭 (+40점) 🔧
    if (input.utilityLibrary) {
      const lowerUtilityLibrary = input.utilityLibrary.toLowerCase();

      // ID 완전 매칭
      if (guide.id === input.utilityLibrary || guide.id === `${input.utilityLibrary}-guide`) {
        score += 40;
      }
      // 태그 매칭
      else if (guide.tags.some(tag => tag.toLowerCase().includes(lowerUtilityLibrary))) {
        score += 35;
      }
      // 요약/내용 매칭
      else if (guide.summary.toLowerCase().includes(lowerUtilityLibrary) ||
               guide.content.toLowerCase().includes(lowerUtilityLibrary)) {
        score += 25;
      }
    }

    // 4. 키워드 매칭 (태그 +15점, 요약/내용 +10점)
    for (const keyword of input.keywords) {
      const lowerKeyword = keyword.toLowerCase();

      // 태그 매칭
      if (guide.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))) {
        score += 15;
      }

      // 요약 매칭
      if (guide.summary.toLowerCase().includes(lowerKeyword)) {
        score += 10;
      }

      // 내용 매칭
      if (guide.content.toLowerCase().includes(lowerKeyword)) {
        score += 5;
      }
    }
    
    // 5. Priority 반영 (+priority/10점)
    score += guide.priority / 10;
    
    return {
      id: guide.id,
      score,
      summary: guide.summary,
      filePath: guide.filePath,
      tags: guide.tags,
      priority: guide.priority,
      guide,  // 전체 데이터
    };
  }).filter(Boolean) as any[];
  
  // 필수 지침 + 키워드 매칭 지침 병합
  const allResults = [...mandatoryGuides, ...scoredGuides];
  
  // 점수순 정렬
  allResults.sort((a, b) => b.score - a.score);
  
  console.error('[searchGuides] Results:', allResults.slice(0, 10).map(g => ({
    id: g.id,
    score: g.score,
    summary: g.summary,
    mandatory: g.score === 1000
  })));

  // 🔑 mandatory 가이드 경고 메시지 생성
  const mandatoryReminders: string[] = [];
  if (mandatoryGuides.length > 0) {
    mandatoryReminders.push('⚠️ 필수 가이드 적용 필요:');
    mandatoryGuides.forEach(mg => {
      if (mg.id === 'mandatory-api-detection') {
        mandatoryReminders.push('  - API 자동 감지 필수: 하드코딩된 데이터 사용 금지');
        mandatoryReminders.push('  - 기존 gRPC/OpenAPI 타입 사용 필수');
        mandatoryReminders.push('  - useBackendClient 같은 API 클라이언트 사용 필수');
      } else {
        mandatoryReminders.push(`  - ${mg.id}: ${mg.summary}`);
      }
    });
  }

  return {
    guides: allResults.slice(0, 10).map(({ id, score, summary, filePath, tags, priority }) => ({
      id, score, summary, filePath, tags, priority
    })),
    mandatoryReminders: mandatoryReminders.length > 0 ? mandatoryReminders : undefined
  };
}

/**
 * 특정 지침 로드
 */
export interface LoadGuideInput {
  id: string;
}

export interface LoadGuideOutput {
  guide: Guide;
}

export async function loadGuide(input: LoadGuideInput): Promise<LoadGuideOutput> {
  console.error('[loadGuide] Loading guide:', input.id);
  
  const allGuides = await indexGuides();
  const guide = allGuides.find(g => g.id === input.id);
  
  if (!guide) {
    console.error('[loadGuide] Guide not found:', input.id);
    console.error('[loadGuide] Available guides:', allGuides.map(g => g.id));
    throw new Error(`Guide not found: ${input.id}`);
  }
  
  console.error('[loadGuide] Guide loaded successfully:', {
    id: guide.id,
    scope: guide.scope,
    priority: guide.priority,
  });
  
  return { guide };
}

/**
 * 여러 지침 병합 (우선순위 규칙 적용)
 */
export interface CombineGuidesInput {
  ids: string[];
  context: {
    project: string;
    apiType: 'grpc' | 'openapi' | 'any';
  };
}

export interface CombineGuidesOutput {
  combined: string;
  usedGuides: Array<{
    id: string;
    priority: number;
    version: string;
    scope: string;
  }>;
  mandatoryReminders?: string[];  // 🔑 필수 가이드 경고 메시지
}

export async function combineGuides(input: CombineGuidesInput): Promise<CombineGuidesOutput> {
  const allGuides = await indexGuides();

  // 🔑 mandatory: true인 가이드를 자동으로 추가
  const autoMandatoryIds = allGuides
    .filter(g => g.mandatory === true)
    .map(g => g.id);

  if (autoMandatoryIds.length > 0) {
    console.error('[combineGuides] Auto-detected mandatory guides:', autoMandatoryIds);
  }

  // input.ids와 auto-detected mandatory 병합
  const allIds = [
    ...autoMandatoryIds,  // mandatory 가이드를 먼저
    ...input.ids
  ];

  // 중복 제거
  const uniqueIds = [...new Set(allIds)];

  const requestedGuides = uniqueIds
    .map(id => allGuides.find(g => g.id === id))
    .filter(Boolean) as Guide[];
  
  // 우선순위 정렬: scope(project>repo>org>global) → priority → version(최신)
  const scopeOrder: Record<string, number> = { 
    project: 4, 
    repo: 3, 
    org: 2, 
    global: 1 
  };
  
  requestedGuides.sort((a, b) => {
    // Scope 비교
    const scopeDiff = scopeOrder[b.scope] - scopeOrder[a.scope];
    if (scopeDiff !== 0) return scopeDiff;
    
    // Priority 비교
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    
    // Version 비교 (최신 우선)
    return b.version.localeCompare(a.version);
  });
  
  // requires/excludes 체크
  const filteredGuides: Guide[] = [];
  
  for (const guide of requestedGuides) {
    // excludes 체크
    if (guide.excludes && guide.excludes.length > 0) {
      const hasExcluded = guide.excludes.some(excludeId =>
        filteredGuides.some(g => g.id === excludeId)
      );
      if (hasExcluded) continue;  // 제외 조건 충족 시 스킵
    }
    
    // requires 체크
    if (guide.requires && guide.requires.length > 0) {
      const hasAllRequired = guide.requires.every(reqId =>
        filteredGuides.some(g => g.id === reqId) ||
        requestedGuides.some(g => g.id === reqId)
      );
      if (!hasAllRequired) continue;  // 필수 조건 미충족 시 스킵
    }
    
    filteredGuides.push(guide);
  }
  
  // 병합
  const combined = filteredGuides
    .map(guide => `# ${guide.summary}\n\n${guide.content}`)
    .join('\n\n---\n\n');

  const usedGuides = filteredGuides.map(g => ({
    id: g.id,
    priority: g.priority,
    version: g.version,
    scope: g.scope,
  }));

  // 🔑 mandatory 가이드 경고 메시지 생성
  const mandatoryReminders: string[] = [];
  const mandatoryGuides = filteredGuides.filter(g => g.mandatory === true);
  if (mandatoryGuides.length > 0) {
    mandatoryReminders.push('⚠️ 필수 가이드 적용 필요:');
    mandatoryGuides.forEach(mg => {
      if (mg.id === 'mandatory-api-detection') {
        mandatoryReminders.push('  - API 자동 감지 필수: 하드코딩된 데이터 사용 금지');
        mandatoryReminders.push('  - 기존 gRPC/OpenAPI 타입 사용 필수');
        mandatoryReminders.push('  - useBackendClient 같은 API 클라이언트 사용 필수');
      } else {
        mandatoryReminders.push(`  - ${mg.id}: ${mg.summary}`);
      }
    });
  }

  return {
    combined,
    usedGuides,
    mandatoryReminders: mandatoryReminders.length > 0 ? mandatoryReminders : undefined
  };
}

/**
 * 워크플로우 실행 (Ultra Compact 메인 지침용)
 *
 * ⚠️ DEPRECATED: 이 함수는 더 이상 사용되지 않습니다.
 *
 * **Anthropic MCP Code Mode 방식으로 전환**:
 * - 클라이언트가 Sandbox API를 통해 직접 guides를 사용
 * - preflight 로직은 클라이언트에서 처리 (MetadataAnalyzer 사용)
 * - MCP 도구 'execute_workflow'가 제거됨
 *
 * **새로운 워크플로우**:
 * 1. 클라이언트: MetadataAnalyzer로 프로젝트 메타데이터 추출
 * 2. 클라이언트: BestCase 검색 및 비교 (metadata 필드 사용)
 * 3. 클라이언트: TODO 생성 (메타데이터 비교 기반)
 * 4. 클라이언트: guides.search() 호출
 * 5. 클라이언트: guides.combine() 호출
 * 6. 클라이언트: 코드 생성 및 실행
 *
 * 📖 참고: docs/WORKFLOW_CORRECT.md
 *
 * @deprecated Use Sandbox APIs in client instead (guides.search, guides.load, guides.combine)
 */
export interface ExecuteWorkflowInput {
  workflowGuide: Guide;
  bestCase: any;
  userRequest: string;
  workspacePath: string;
}

export interface ExecuteWorkflowOutput {
  success: boolean;
  metadata: any;
  preflight: any;
  usedGuides: Array<{
    id: string;
    priority: number;
    version: string;
    scope: string;
  }>;
  combinedContent: string;
  changeSummary: any;
}

/**
 * @deprecated
 */
export async function executeWorkflow(input: ExecuteWorkflowInput): Promise<ExecuteWorkflowOutput> {
  throw new Error(
    'DEPRECATED: executeWorkflow() is no longer used.\n\n' +
    'Anthropic MCP Code Mode approach:\n' +
    '1. Client: Extract metadata with MetadataAnalyzer\n' +
    '2. Client: Search and compare BestCase (metadata field)\n' +
    '3. Client: Generate TODOs from metadata comparison\n' +
    '4. Client: Call guides.search() with keywords\n' +
    '5. Client: Call guides.combine() to merge guides\n' +
    '6. Client: Generate and execute code\n\n' +
    'See docs/WORKFLOW_CORRECT.md for details.'
  );
}

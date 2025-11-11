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
}

export interface Guide extends GuideMetadata {
  content: string;
  filePath: string;
}

/**
 * 지침 파일 디렉토리 스캔 및 메타데이터 추출
 */
export async function indexGuides(): Promise<Guide[]> {
  const guidesDir = join(__dirname, '../../.github/instructions/guides');
  
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
}

/**
 * 지침 검색 (BM25-like 스코어링)
 */
export async function searchGuides(input: SearchGuidesInput): Promise<SearchGuidesOutput> {
  console.error('[searchGuides] Input:', JSON.stringify(input, null, 2));
  
  const allGuides = await indexGuides();
  
  // 🔑 필수 지침 먼저 확보 (키워드 매칭 무관)
  const mandatoryGuides: any[] = [];
  if (input.mandatoryIds && input.mandatoryIds.length > 0) {
    for (const id of input.mandatoryIds) {
      const guide = allGuides.find(g => g.id === id);
      if (guide) {
        console.error('[searchGuides] Mandatory guide loaded:', {
          id: guide.id,
          summary: guide.summary,
          priority: guide.priority
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
    
    // 3. 키워드 매칭 (태그 +15점, 요약/내용 +10점)
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
    
    // 4. Priority 반영 (+priority/10점)
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
  
  return {
    guides: allResults.slice(0, 10).map(({ id, score, summary, filePath, tags, priority }) => ({
      id, score, summary, filePath, tags, priority
    })),
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
}

export async function combineGuides(input: CombineGuidesInput): Promise<CombineGuidesOutput> {
  const allGuides = await indexGuides();
  const requestedGuides = input.ids
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
  
  return { combined, usedGuides };
}

/**
 * 워크플로우 실행 (Ultra Compact 메인 지침용)
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

export async function executeWorkflow(input: ExecuteWorkflowInput): Promise<ExecuteWorkflowOutput> {
  // preflight.ts 함수들을 동적으로 import
  const { 
    buildRequestMetadata, 
    synthesizeTodoList, 
    preflightCheck, 
    extractKeywords 
  } = await import('./preflight.js');
  
  // 1단계: 메타데이터 변환
  const metadata = await buildRequestMetadata(input.userRequest, input.workspacePath);
  
  // BestCase에서 API 타입 확정
  if (input.bestCase?.patterns?.apiInfo?.apiType) {
    metadata.apiTypeHint = input.bestCase.patterns.apiInfo.apiType.toLowerCase() as any;
  }
  
  // 2단계: TODO 합성 + 프리플라이트 검수
  const todos = await synthesizeTodoList(metadata, input.bestCase, input.workspacePath);
  const preflight = await preflightCheck(metadata, todos, input.bestCase);
  
  // risk >= 40 → 스캐폴딩만
  if (!preflight.ok) {
    return {
      success: false,
      metadata,
      preflight,
      usedGuides: [],
      combinedContent: '',
      changeSummary: {
        mode: 'scaffold-only',
        reason: `Risk ${preflight.risk} >= ${metadata.riskThreshold}`,
        reasons: preflight.reasons,
      }
    };
  }
  
  // 3단계: 키워드 추출 (이미 preflight.keywords에 포함)
  const keywords = preflight.keywords;
  
  // 4단계: 지침 검색/병합 (⚠️ 필수 지침 강제 포함)
  const apiTypeForSearch = metadata.apiTypeHint === 'auto' ? undefined : metadata.apiTypeHint;
  
  // 필수 지침 ID 구성
  const mandatoryGuides = [
    `${metadata.apiTypeHint}.api.connection`,  // API 연결 체크
    'api.validation',                          // API 시그니처 검증
    'error.handling'                           // 에러 처리 패턴
  ];
  
  console.error('[executeWorkflow] Mandatory guides:', mandatoryGuides);
  
  const searchResult = await searchGuides({
    keywords,
    apiType: apiTypeForSearch,
    mandatoryIds: mandatoryGuides,  // 🔑 필수 지침 강제 포함
  });
  
  const topGuideIds = searchResult.guides.slice(0, 5).map(g => g.id);
  
  const apiTypeForCombine = metadata.apiTypeHint === 'auto' ? 'any' as const : metadata.apiTypeHint;
  
  const combined = await combineGuides({
    ids: topGuideIds,
    context: {
      project: metadata.projectName,
      apiType: apiTypeForCombine,
    }
  });
  
  // 5단계: 변경 요약
  const changeSummary = {
    mode: 'auto-apply',
    usedGuides: combined.usedGuides,
    changedFiles: metadata.targets,
    totalLoc: todos.reduce((sum: number, t: any) => sum + t.loc, 0),
    risk: preflight.risk,
    keywords,
    timestamp: new Date().toISOString(),
  };
  
  return {
    success: true,
    metadata,
    preflight,
    usedGuides: combined.usedGuides,
    combinedContent: combined.combined,
    changeSummary,
  };
}

/**
 * 임베딩 서비스 (RAG용)
 *
 * Ollama의 임베딩 모델을 사용하여 텍스트를 벡터로 변환합니다.
 */

export interface EmbeddingConfig {
  ollamaUrl: string;
  model: string;  // e.g., 'nomic-embed-text', 'mxbai-embed-large'
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  prompt_eval_count?: number;
}

export class EmbeddingService {
  private config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  /**
   * 텍스트를 임베딩 벡터로 변환
   */
  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.statusText}`);
    }

    const result = await response.json() as EmbeddingResult;
    return result.embedding;
  }

  /**
   * 여러 텍스트를 병렬로 임베딩
   */
  async embedBatch(texts: string[], concurrency: number = 2): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const embeddings = await Promise.all(batch.map(text => this.embed(text)));
      results.push(...embeddings);
    }

    return results;
  }

  /**
   * FileCase용 임베딩 텍스트 생성
   *
   * 파일의 주요 특성을 텍스트로 요약하여 임베딩에 사용
   */
  static createFileCaseText(fileCase: {
    filePath: string;
    fileRole: string;
    keywords: string[];
    analysis: {
      apiMethods: string[];
      componentsUsed: string[];
      composablesUsed: string[];
      patterns: string[];
      entities: string[];
    };
  }): string {
    const parts: string[] = [];

    // 파일 역할
    parts.push(`File role: ${fileCase.fileRole}`);

    // 키워드
    if (fileCase.keywords.length > 0) {
      parts.push(`Keywords: ${fileCase.keywords.join(', ')}`);
    }

    // API 메서드
    if (fileCase.analysis.apiMethods.length > 0) {
      parts.push(`API methods: ${fileCase.analysis.apiMethods.join(', ')}`);
    }

    // 컴포넌트
    if (fileCase.analysis.componentsUsed.length > 0) {
      parts.push(`Components: ${fileCase.analysis.componentsUsed.join(', ')}`);
    }

    // Composables
    if (fileCase.analysis.composablesUsed.length > 0) {
      parts.push(`Composables: ${fileCase.analysis.composablesUsed.join(', ')}`);
    }

    // 패턴
    if (fileCase.analysis.patterns.length > 0) {
      parts.push(`Patterns: ${fileCase.analysis.patterns.join(', ')}`);
    }

    // 엔티티
    if (fileCase.analysis.entities.length > 0) {
      parts.push(`Entities: ${fileCase.analysis.entities.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * 사용자 요청을 임베딩용 텍스트로 변환
   */
  static createQueryText(request: {
    description: string;
    targetFunction?: string;
    entities?: string[];
    components?: string[];
  }): string {
    const parts: string[] = [];

    parts.push(request.description);

    if (request.targetFunction) {
      parts.push(`Target function: ${request.targetFunction}`);
    }

    if (request.entities && request.entities.length > 0) {
      parts.push(`Entities: ${request.entities.join(', ')}`);
    }

    if (request.components && request.components.length > 0) {
      parts.push(`Components: ${request.components.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * 코사인 유사도 계산
   *
   * 벡터 길이가 다르면 0을 반환 (다른 모델로 생성된 임베딩 호환)
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0) {
      return 0;
    }

    if (a.length !== b.length) {
      // 다른 모델로 생성된 임베딩일 수 있음 - 0 반환
      console.error(`[EmbeddingService] Vector dimension mismatch: ${a.length} vs ${b.length}`);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Top-K 유사한 벡터 찾기
   */
  static findTopK(
    queryVector: number[],
    candidates: Array<{ id: string; embedding: number[] }>,
    k: number = 5
  ): Array<{ id: string; similarity: number }> {
    const similarities = candidates.map(candidate => ({
      id: candidate.id,
      similarity: EmbeddingService.cosineSimilarity(queryVector, candidate.embedding)
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, k);
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`);
      if (!response.ok) return false;

      const data = await response.json();
      const models = data.models || [];
      return models.some((m: any) => m.name.includes(this.config.model));
    } catch (error) {
      return false;
    }
  }
}

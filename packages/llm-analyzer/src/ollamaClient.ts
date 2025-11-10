/**
 * Ollama LLM 클라이언트
 * 로컬 Ollama 서버와 통신하여 코드 분석 수행
 */

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:11434', timeout: number = 120000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout; // 기본 120초 (GPU 분석용)
  }

  /**
   * 코드 분석을 위한 LLM 호출
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const url = `${this.baseUrl}/api/generate`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout / 1000}s`);
      }
      throw error;
    }
  }

  /**
   * JSON 형식으로 응답 받기 (구조화된 분석 결과용)
   */
  async generateJSON<T = any>(
    prompt: string,
    model: string = 'qwen2.5-coder:7b',
    temperature: number = 0.1
  ): Promise<T> {
    const response = await this.generate({
      model,
      prompt,
      format: 'json',
      options: {
        temperature,
      },
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      console.error('Failed to parse JSON response:', response.response);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * 사용 가능한 모델 목록 조회
   */
  async listModels(): Promise<string[]> {
    const url = `${this.baseUrl}/api/tags`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  }

  /**
   * Ollama 서버 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.length > 0;
    } catch (error) {
      return false;
    }
  }
}

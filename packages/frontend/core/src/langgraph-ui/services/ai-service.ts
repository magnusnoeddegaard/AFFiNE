/**
 * Service for interacting with the AI backend APIs
 */
export class AIService {
  private readonly baseUrl: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api/ai';
  }

  /**
   * Create a new AI session
   */
  async createSession(options: SessionOptions): Promise<string> {
    try {
      const response = await this.makeRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify(options),
      });

      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
  }

  /**
   * End an AI session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      await this.makeRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      // Clean up any abort controller for this session
      this.abortControllers.delete(sessionId);
    } catch (error) {
      console.error(`Error ending AI session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an in-progress generation for a session
   */
  cancelSession(sessionId: string): void {
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
    }
  }

  /**
   * Send a message to the AI in an existing session
   */
  async sendMessage(sessionId: string, message: AIMessage, options?: MessageOptions): Promise<AIResponse> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(sessionId, controller);

      const response = await this.makeRequest(`/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ 
          message,
          contextIds: options?.contextIds || [],
          provider: options?.provider,
          model: options?.model,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      this.abortControllers.delete(sessionId);
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request aborted');
      }
      console.error(`Error sending message to AI session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Send a message with streaming response
   */
  async sendMessageStreamed(
    sessionId: string, 
    message: AIMessage, 
    options?: MessageOptions & StreamOptions
  ): Promise<ReadableStream<AIStreamChunk>> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(sessionId, controller);

      const response = await this.makeRequest(`/sessions/${sessionId}/messages/stream`, {
        method: 'POST',
        body: JSON.stringify({ 
          message,
          contextIds: options?.contextIds || [],
          provider: options?.provider,
          model: options?.model,
        }),
        signal: controller.signal,
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      return this.parseStreamedResponse(response.body, {
        onChunk: options?.onChunk,
        onComplete: options?.onComplete,
        onError: options?.onError,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request aborted');
      }
      console.error(`Error streaming message to AI session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Generate an image based on a text prompt
   */
  async generateImage(
    sessionId: string, 
    prompt: string, 
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(sessionId, controller);

      const response = await this.makeRequest(`/sessions/${sessionId}/images`, {
        method: 'POST',
        body: JSON.stringify({ 
          prompt,
          provider: options?.provider,
          model: options?.model,
          size: options?.size || '1024x1024',
          style: options?.style,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      this.abortControllers.delete(sessionId);
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request aborted');
      }
      console.error(`Error generating image in AI session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Generate an inline suggestion for editor
   */
  async generateInlineSuggestion(
    sessionId: string,
    context: InlineSuggestionContext
  ): Promise<InlineSuggestionResponse> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(sessionId, controller);

      const response = await this.makeRequest(`/sessions/${sessionId}/inline-suggestions`, {
        method: 'POST',
        body: JSON.stringify(context),
        signal: controller.signal,
      });

      const data = await response.json();
      this.abortControllers.delete(sessionId);
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request aborted');
      }
      console.error(`Error generating inline suggestion in session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Submit audio for transcription
   */
  async transcribeAudio(
    sessionId: string,
    audioFile: File,
    options?: TranscriptionOptions
  ): Promise<string> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(sessionId, controller);

      const formData = new FormData();
      formData.append('file', audioFile);
      
      if (options?.language) {
        formData.append('language', options.language);
      }

      const response = await this.makeRequest(`/sessions/${sessionId}/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          // No Content-Type header - browser will set it with boundary
        },
        signal: controller.signal,
      });

      const data = await response.json();
      this.abortControllers.delete(sessionId);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.jobId;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request aborted');
      }
      console.error(`Error transcribing audio in session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get available AI providers and models
   */
  async getProviders(): Promise<ProviderInfo[]> {
    try {
      const response = await this.makeRequest('/providers', {
        method: 'GET',
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      throw error;
    }
  }

  /**
   * Make a request to the AI API with retry logic
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit,
    retryCount: number = 0
  ): Promise<Response> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };
      
      // Don't override Content-Type if it's a FormData request
      const headers = options.body instanceof FormData
        ? options.headers || {}
        : { ...defaultHeaders, ...options.headers };
      
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error: any) {
      // Don't retry if request was aborted
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Don't retry if we've reached max retries
      if (retryCount >= this.maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = this.retryDelay * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return this.makeRequest(endpoint, options, retryCount + 1);
    }
  }

  /**
   * Parse a streamed response with event handling
   */
  private parseStreamedResponse(
    stream: ReadableStream<Uint8Array>,
    options?: StreamOptions
  ): ReadableStream<AIStreamChunk> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              options?.onComplete?.();
              controller.close();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                // Check for [DONE] message
                if (data === '[DONE]') {
                  options?.onComplete?.();
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data) as AIStreamChunk;
                  controller.enqueue(parsed);
                  options?.onChunk?.(parsed);
                } catch (e) {
                  console.error('Error parsing stream chunk:', e);
                }
              }
            }
          }
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          options?.onError?.(error);
          controller.error(error);
        }
      },
      
      cancel() {
        reader.cancel();
      }
    });
  }
}

// Types for the AI service

export interface SessionOptions {
  userId: string;
  type?: 'chat' | 'image' | 'inline-suggestion' | 'transcription';
  workspaceId?: string;
  docId?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Array<{
    type: string;
    content: string;
  }>;
}

export interface MessageOptions {
  contextIds?: string[];
  provider?: string;
  model?: string;
}

export interface StreamOptions {
  onChunk?: (chunk: AIStreamChunk) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface AIStreamChunk {
  type: 'content' | 'error' | 'status';
  content?: string;
  error?: string;
  status?: string;
}

export interface AIResponse {
  sessionId: string;
  response: {
    role: string;
    content: string;
  };
}

export interface ImageGenerationOptions {
  provider?: string;
  model?: string;
  size?: string;
  style?: string;
}

export interface ImageGenerationResponse {
  sessionId: string;
  imageUrl: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  capabilities: string[];
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  capabilities: string[];
}

export interface InlineSuggestionContext {
  textBeforeCursor: string;
  textAfterCursor: string;
  docId?: string;
}

export interface InlineSuggestionResponse {
  suggestion: string;
}

export interface TranscriptionOptions {
  language?: string;
}
import { Message } from '../types';

/**
 * Configuration options for LLM providers
 */
export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  [key: string]: any;
}

/**
 * Response interface for LLM completions
 */
export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Base interface for all LLM providers
 */
export interface LLMProvider {
  readonly name: string;
  readonly defaultModel: string;
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  
  /**
   * Generate a text completion from the LLM
   * @param messages The messages to process
   * @param options Configuration options for this request
   */
  complete(messages: Message[], options?: Partial<LLMProviderConfig>): Promise<LLMResponse>;
  
  /**
   * Generate a streaming text completion from the LLM
   * @param messages The messages to process
   * @param options Configuration options for this request
   */
  completeStream?(
    messages: Message[],
    options?: Partial<LLMProviderConfig>
  ): AsyncIterable<LLMResponse>;
  
  /**
   * Create embeddings for text input
   * @param text The text to create embeddings for
   * @param options Configuration options for this request
   */
  createEmbedding?(text: string, options?: Partial<LLMProviderConfig>): Promise<number[]>;
  
  /**
   * Generate an image from text input
   * @param prompt The text prompt to generate an image from
   * @param options Configuration options for this request
   */
  generateImage?(prompt: string, options?: Partial<LLMProviderConfig>): Promise<string>;
  
  /**
   * Analyze an image and generate text description/response
   * @param imageUrl URL or base64 of the image
   * @param prompt Text prompt about the image
   * @param options Configuration options for this request
   */
  analyzeImage?(
    imageUrl: string,
    prompt: string,
    options?: Partial<LLMProviderConfig>
  ): Promise<LLMResponse>;
}

/**
 * Abstract base class implementing the LLMProvider interface
 * Provides common functionality for all providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  readonly name: string;
  readonly defaultModel: string;
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  protected config: LLMProviderConfig;
  
  constructor(name: string, defaultModel: string, config: LLMProviderConfig) {
    this.name = name;
    this.defaultModel = defaultModel;
    this.supportsStreaming = false;
    this.supportsTools = false;
    this.config = config;
  }
  
  /**
   * Abstract method to be implemented by concrete provider classes
   */
  abstract complete(messages: Message[], options?: Partial<LLMProviderConfig>): Promise<LLMResponse>;
  
  /**
   * Helper method to format messages for the LLM provider
   * Can be overridden by specific providers if needed
   */
  protected formatMessages(messages: Message[]): any[] {
    // Default implementation just returns the messages
    // Specific providers may need to transform the messages
    return messages;
  }
  
  /**
   * Helper method to prepare configuration for this request
   */
  protected prepareConfig(options?: Partial<LLMProviderConfig>): LLMProviderConfig {
    return {
      ...this.config,
      ...options,
    };
  }
}
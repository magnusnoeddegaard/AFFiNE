import { Readable } from 'stream';

/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: string[];
  readonly models: Record<string, Array<{ id: string; name: string }>>;
  
  /**
   * Generate text completion
   */
  generateText(
    prompt: string, 
    options?: TextGenerationOptions
  ): Promise<string>;
  
  /**
   * Generate streaming text completion
   */
  generateTextStream?(
    prompt: string, 
    options?: TextGenerationOptions
  ): Promise<ReadableStream<string>>;
  
  /**
   * Generate embedding for text
   */
  embedText?(text: string, model?: string): Promise<number[]>;
  
  /**
   * Generate image from prompt
   */
  generateImage?(
    prompt: string, 
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult>;
  
  /**
   * Analyze an image and generate a description
   */
  analyzeImage?(
    imageUrl: string, 
    prompt: string, 
    options?: ImageAnalysisOptions
  ): Promise<string>;
  
  /**
   * Transcribe audio to text
   */
  transcribeAudio?(
    audioFile: Buffer | Readable, 
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
}

/**
 * Common types for LLM providers
 */
export interface TextGenerationOptions {
    model?: string;
    systemPrompt?: string;
    previousMessages?: Array<MessageWithToolSupport>;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
}
  
// Extended message type with tool support
export interface MessageWithToolSupport {
role: string;
content: string;
name?: string;
tool_call_id?: string;
[key: string]: any;
}

export interface ImageGenerationOptions {
  model?: string;
  size?: string;
  quality?: string;
  style?: string;
}

export interface ImageGenerationResult {
  url: string;
  promptId: string;
}

export interface ImageAnalysisOptions {
  model?: string;
  maxTokens?: number;
}

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
  durationInSeconds: number;
}
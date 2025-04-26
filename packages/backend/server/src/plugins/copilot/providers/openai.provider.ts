import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from './provider.interface';
import { OpenAI } from 'openai';
import { Readable } from 'stream';

/**
 * OpenAI provider implementation
 */
@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAIProvider.name);
  
  readonly id = 'openai';
  readonly name = 'OpenAI';
  
  readonly capabilities = [
    'text-generation',
    'embedding',
    'image-generation',
    'image-analysis',
    'transcription',
  ];
  
  readonly models = {
    text: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    embedding: [
      { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small' },
      { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large' },
    ],
    image: [
      { id: 'dall-e-3', name: 'DALL-E 3' },
    ],
    transcription: [
      { id: 'whisper-1', name: 'Whisper' },
    ]
  };
  
  constructor(
    private readonly configService: ConfigService,
    config?: OpenAIProviderConfig,
  ) {
    const apiKey = config?.apiKey || this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key is not configured');
    }
    
    this.client = new OpenAI({
      apiKey,
      timeout: 60000, // 60 seconds
      maxRetries: 3,
    });
  }
  
  /**
   * Generate text completion
   */
  async generateText(
    prompt: string, 
    options?: TextGenerationOptions
  ): Promise<string> {
    try {
      const model = options?.model || 'gpt-4o';
      const temperature = options?.temperature || 0.7;
      const maxTokens = options?.maxTokens || 1000;
      
      const system = options?.systemPrompt || 'You are a helpful assistant.';
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          ...options?.previousMessages || [],
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: options?.topP || 1,
        presence_penalty: options?.presencePenalty || 0,
        frequency_penalty: options?.frequencyPenalty || 0,
      });
      
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Error generating text: ${error.message}`, error.stack);
      throw new Error(`OpenAI text generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate streaming text completion
   */
  async generateTextStream(
    prompt: string, 
    options?: TextGenerationOptions
  ): Promise<ReadableStream<string>> {
    try {
      const model = options?.model || 'gpt-4o';
      const temperature = options?.temperature || 0.7;
      const maxTokens = options?.maxTokens || 1000;
      
      const system = options?.systemPrompt || 'You are a helpful assistant.';
      
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          ...options?.previousMessages || [],
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: options?.topP || 1,
        presence_penalty: options?.presencePenalty || 0,
        frequency_penalty: options?.frequencyPenalty || 0,
        stream: true,
      });
      
      // Convert the OpenAI stream to a standard ReadableStream
      const textStream = new ReadableStream({
        async start(controller) {
          for await (const part of stream) {
            const content = part.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(content);
            }
          }
          controller.close();
        },
        cancel() {
          // OpenAI's stream doesn't have a cancel method
        }
      });
      
      return textStream;
    } catch (error) {
      this.logger.error(`Error generating text stream: ${error.message}`, error.stack);
      throw new Error(`OpenAI text stream generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate embedding for text
   */
  async embedText(text: string, model?: string): Promise<number[]> {
    try {
      const embeddingModel = model || 'text-embedding-3-small';
      
      const response = await this.client.embeddings.create({
        model: embeddingModel,
        input: text,
        encoding_format: 'float',
      });
      
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Error generating embedding: ${error.message}`, error.stack);
      throw new Error(`OpenAI embedding generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate image from prompt
   */
  async generateImage(
    prompt: string, 
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    try {
      const model = options?.model || 'dall-e-3';
      const size = options?.size || '1024x1024';
      const quality = options?.quality || 'standard';
      const style = options?.style || 'vivid';
      
      const response = await this.client.images.generate({
        model,
        prompt,
        n: 1,
        size: size as any,
        quality: quality as any,
        style: style as any,
        response_format: 'url',
      });
      
      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI');
      }
      
      return {
        url: imageUrl,
        promptId: response.created.toString(),
      };
    } catch (error) {
      this.logger.error(`Error generating image: ${error.message}`, error.stack);
      throw new Error(`OpenAI image generation failed: ${error.message}`);
    }
  }
  
  /**
   * Analyze an image and generate a description
   */
  async analyzeImage(
    imageUrl: string, 
    prompt: string, 
    options?: ImageAnalysisOptions
  ): Promise<string> {
    try {
      const model = options?.model || 'gpt-4o';
      const maxTokens = options?.maxTokens || 1000;
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Describe this image in detail.' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: maxTokens,
      });
      
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Error analyzing image: ${error.message}`, error.stack);
      throw new Error(`OpenAI image analysis failed: ${error.message}`);
    }
  }
  
  /**
   * Transcribe audio to text
   */
  async transcribeAudio(
    audioFile: Buffer | Readable, 
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    try {
      let file;
      
      // Convert file to format expected by OpenAI
      if (Buffer.isBuffer(audioFile)) {
        file = audioFile;
      } else {
        // For ReadableStream, we need to convert it to a Buffer
        const chunks: Buffer[] = [];
        for await (const chunk of audioFile) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        file = Buffer.concat(chunks);
      }
      
      const model = options?.model || 'whisper-1';
      const language = options?.language || undefined;
      const prompt = options?.prompt || undefined;
      
      const formData = new FormData();
      const blob = new Blob([file]);
      formData.append('file', blob, 'audio.webm');
      formData.append('model', model);
      
      if (language) {
        formData.append('language', language);
      }
      
      if (prompt) {
        formData.append('prompt', prompt);
      }
      
      const response = await this.client.audio.transcriptions.create({
        file: file as any,
        model: 'whisper-1',
        language,
        prompt,
        response_format: 'verbose_json',
      });
      
      const segments = response.segments?.map(s => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text,
      })) || [];
      
      return {
        text: response.text,
        segments,
        language: response.language,
        durationInSeconds: response.duration,
      };
    } catch (error) {
      this.logger.error(`Error transcribing audio: ${error.message}`, error.stack);
      throw new Error(`OpenAI audio transcription failed: ${error.message}`);
    }
  }
}

/**
 * Types for OpenAI provider
 */
export interface OpenAIProviderConfig {
  apiKey?: string;
  organization?: string;
}

export interface TextGenerationOptions {
  model?: string;
  systemPrompt?: string;
  previousMessages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
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
  durationInSeconds?: number;
}
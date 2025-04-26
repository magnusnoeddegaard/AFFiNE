/**
 * LLM Providers Module
 * 
 * This module exports interfaces and implementations for various LLM providers
 */

export * from './base-provider';
export * from './openai-provider';
export * from './perplexity-provider';
export * from './google-provider';
export * from './fal-provider';

// Provider Factory
import { LLMProvider, LLMProviderConfig } from './base-provider';
import { OpenAIProvider, OpenAIConfig } from './openai-provider';
import { PerplexityProvider, PerplexityConfig } from './perplexity-provider';
import { GoogleProvider, GoogleConfig } from './google-provider';
import { FALProvider, FALConfig } from './fal-provider';

/**
 * Provider type enum for creating providers
 */
export enum ProviderType {
  OpenAI = 'openai',
  Perplexity = 'perplexity',
  Google = 'google',
  FAL = 'fal'
}

/**
 * Factory function to create providers
 */
export function createProvider(type: ProviderType, config: LLMProviderConfig): LLMProvider {
  switch (type) {
    case ProviderType.OpenAI:
      return new OpenAIProvider(config as OpenAIConfig);
    case ProviderType.Perplexity:
      return new PerplexityProvider(config as PerplexityConfig);
    case ProviderType.Google:
      return new GoogleProvider(config as GoogleConfig);
    case ProviderType.FAL:
      return new FALProvider(config as FALConfig);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
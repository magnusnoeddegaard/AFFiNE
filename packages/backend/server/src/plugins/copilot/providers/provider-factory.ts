import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../base/logger';
import { FALProvider } from './fal-provider';
import { GoogleProvider } from './google-provider';
import { OpenAIProvider } from './openai-provider';
import { PerplexityProvider } from './perplexity-provider';

@Injectable()
export class LLMProviderFactory {
  private readonly providers: Record<string, any>;

  constructor(
    private readonly logger: LoggerService,
    private readonly openAIProvider: OpenAIProvider,
    private readonly perplexityProvider: PerplexityProvider,
    private readonly googleProvider: GoogleProvider,
    private readonly falProvider: FALProvider
  ) {
    this.logger.setContext('LLMProviderFactory');

    // Register available providers
    this.providers = {
      openai: this.openAIProvider,
      perplexity: this.perplexityProvider,
      google: this.googleProvider,
      fal: this.falProvider,
    };
  }

  /**
   * Create a provider instance by name
   * @param name Provider name (openai, perplexity, google, fal)
   * @returns Provider instance
   */
  createProvider(name: string) {
    const provider = this.providers[name.toLowerCase()];

    if (!provider) {
      this.logger.error('Unknown AI provider requested', { provider: name });
      throw new Error(`Unknown AI provider: ${name}`);
    }

    return provider;
  }
}

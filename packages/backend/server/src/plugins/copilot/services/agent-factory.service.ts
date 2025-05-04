import { Injectable } from '@nestjs/common';

import { ConfigService } from '../../../base/config';
import { LoggerService } from '../../../base/logger';
import { LLMProviderFactory } from '../providers/provider-factory';

@Injectable()
export class AgentFactoryService {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly providerFactory: LLMProviderFactory
  ) {
    this.logger.setContext('AgentFactoryService');
  }

  /**
   * Create an agent for text generation
   * @returns A text generation agent
   */
  createTextAgent() {
    const providerName = this.config.get('AI_TEXT_PROVIDER', 'openai');
    this.logger.debug('Creating text agent with provider', {
      provider: providerName,
    });

    const provider = this.providerFactory.createProvider(providerName as string);
    return provider.createTextAgent();
  }

  /**
   * Create an agent for image generation
   * @returns An image generation agent
   */
  createImageAgent() {
    const providerName = this.config.get('AI_IMAGE_PROVIDER', 'openai');
    this.logger.debug('Creating image agent with provider', {
      provider: providerName,
    });

    const provider = this.providerFactory.createProvider(providerName as string);
    return provider.createImageAgent();
  }
}
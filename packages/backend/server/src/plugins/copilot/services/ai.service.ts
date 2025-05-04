import { Injectable } from '@nestjs/common';

import { ConfigService } from '../../../base/config';
import { LoggerService } from '../../../base/logger';
import { AgentFactoryService } from './agent-factory.service';

@Injectable()
export class AiService {
  constructor(
    private readonly logger: LoggerService,
    private readonly agentFactory: AgentFactoryService,
    private readonly config: ConfigService
  ) {
    this.logger.setContext('AiService');
  }

  /**
   * Generate text using the configured LLM provider
   * @param prompt The prompt to send to the LLM
   * @param options Additional options for text generation
   * @returns Generated text from the LLM
   */
  async generateText(prompt: string, options: any = {}) {
    this.logger.debug('Generating text with prompt', {
      promptLength: prompt.length,
    });
    const agent = this.agentFactory.createTextAgent();
    return agent.generateText(prompt, options);
  }

  /**
   * Generate an image using the configured image provider
   * @param prompt The prompt to generate an image from
   * @param options Additional options for image generation
   * @returns URL or data of the generated image
   */
  async generateImage(prompt: string, options: any = {}) {
    this.logger.debug('Generating image with prompt', { prompt });
    const agent = this.agentFactory.createImageAgent();
    return agent.generateImage(prompt, options);
  }
}

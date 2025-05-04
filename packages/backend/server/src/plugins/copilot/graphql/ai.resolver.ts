import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query,Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { GqlJwtAuthGuard } from '../../../core/auth/guards/gql-jwt-auth.guard';
import { AiService } from '../services/ai.service';

@Resolver()
export class AIResolver {
  constructor(private readonly aiService: AiService) {}

  /**
   * Generate text using AI
   * @param user Current user
   * @param prompt Prompt for text generation
   * @param options Additional options
   * @returns Generated text
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => String)
  async generateAiText(
    @CurrentUser() user: any,
    @Args('prompt') prompt: string,
    @Args('options', { nullable: true }) options?: any
  ): Promise<string> {
    return this.aiService.generateText(prompt, options || {});
  }

  /**
   * Generate an image using AI
   * @param user Current user
   * @param prompt Prompt for image generation
   * @param options Additional options
   * @returns URL to the generated image
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => String)
  async generateAiImage(
    @CurrentUser() user: any,
    @Args('prompt') prompt: string,
    @Args('options', { nullable: true }) options?: any
  ): Promise<string> {
    return this.aiService.generateImage(prompt, options || {});
  }
}

import { Module } from '@nestjs/common';
import { LanggraphAgentModule } from './index';
import { AIController } from './controllers/ai.controller';
import { AIResolver } from './graphql/ai.graphql';
import { TextGenerationGraph } from './workflows/text-generation-graph';
import { ImageGenerationGraph } from './workflows/image-generation-graph';

/**
 * AI Module for exposing Langgraph AI functionality via REST and GraphQL
 */
@Module({
  imports: [
    LanggraphAgentModule
  ],
  controllers: [
    AIController
  ],
  providers: [
    AIResolver,
    TextGenerationGraph,
    ImageGenerationGraph
  ],
  exports: [
    LanggraphAgentModule,
    TextGenerationGraph,
    ImageGenerationGraph
  ]
})
export class AIModule {}
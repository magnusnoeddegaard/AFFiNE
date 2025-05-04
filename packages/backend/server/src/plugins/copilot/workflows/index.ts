/**
 * Standard workflow graphs for common AI use cases
 */

export * from './text-generation-graph';
export * from './image-generation-graph';

import { Module } from '@nestjs/common';
import { AgentFactory } from '../agents/agent-factory';
import { StateManager } from '../state/state-manager';
import { DefaultNodeFactory } from '../graph/node-factory';
import { ContextService } from '../context/context-service';
import { TextGenerationGraph } from './text-generation-graph';
import { ImageGenerationGraph } from './image-generation-graph';
import { AgentsModule } from '../agents/agents.module';
import { EMBEDDING_SERVICE, DefaultEmbeddingService } from '../context/embedding-service';

/**
 * NestJS module for Langgraph workflows
 */
@Module({
  imports: [AgentsModule], // Import the module that exports AgentFactory
  providers: [
    // Add missing providers
    StateManager,
    {
      provide: 'NodeFactory',
      useFactory: (agentFactory: AgentFactory) => {
        return new DefaultNodeFactory(agentFactory);
      },
      inject: [AgentFactory]
    },
    // Use the token for embedding service
    {
      provide: EMBEDDING_SERVICE,
      useFactory: () => {
        return new DefaultEmbeddingService();
      }
    },
    {
      provide: ContextService,
      useFactory: (embeddingService) => {
        return new ContextService(embeddingService);
      },
      inject: [EMBEDDING_SERVICE]
    },
    {
      provide: TextGenerationGraph,
      useFactory: (
        agentFactory: AgentFactory,
        stateManager: StateManager,
        nodeFactory: DefaultNodeFactory,
        contextService: ContextService
      ) => {
        return new TextGenerationGraph(
          agentFactory,
          stateManager,
          nodeFactory,
          contextService
        );
      },
      inject: [AgentFactory, StateManager, 'NodeFactory', ContextService]
    },
    {
      provide: ImageGenerationGraph,
      useFactory: (
        agentFactory: AgentFactory,
        stateManager: StateManager,
        nodeFactory: DefaultNodeFactory
      ) => {
        return new ImageGenerationGraph(
          agentFactory,
          stateManager,
          nodeFactory
        );
      },
      inject: [AgentFactory, StateManager, 'NodeFactory']
    }
  ],
  exports: [TextGenerationGraph, ImageGenerationGraph, StateManager, ContextService, EMBEDDING_SERVICE]
})
export class LanggraphWorkflowsModule {}
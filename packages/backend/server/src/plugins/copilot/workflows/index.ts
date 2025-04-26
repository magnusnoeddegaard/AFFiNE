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

/**
 * NestJS module for Langgraph workflows
 */
@Module({
  providers: [
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
  exports: [TextGenerationGraph, ImageGenerationGraph]
})
export class LanggraphWorkflowsModule {}
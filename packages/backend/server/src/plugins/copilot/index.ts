/**
 * Langgraph Agent Architecture exports
 */

// Export all submodules
export * from './agents/base-agent';
export * from './agents/agent-factory';
export * from './agents/openai-agent';
export * from './agents/perplexity-agent';
export * from './agents/google-agent';
export * from './agents/fal-agent';
export * from './context';
export * from './graph';
export * from './nodes';
export * from './prompt';
export * from './providers';
export * from './state/state-manager';
export * from './storage';
export * from './types';

// Add core functionality here
import { Module } from '@nestjs/common';
import { AgentFactory } from './agents/agent-factory';
import { registerAgentCreators } from './agents/agent-creators';
import { ContextService } from './context/context-service';
import { DefaultEmbeddingService } from './context/embedding-service';
import { DocumentProcessorRegistry } from './context/document-processor';
import { PromptManager } from './prompt/prompt-manager';
import { StateManager } from './state/state-manager';
import { DefaultNodeFactory } from './graph/node-factory';
import { InMemoryAssetStorage } from './storage/asset-storage';
import { InMemorySessionStorage } from './storage/session-storage';
import { OpenAIProvider } from './providers/openai-provider';

/**
 * NestJS module for Langgraph Agent system
 */
@Module({
  providers: [
    // Core services
    AgentFactory,
    {
      provide: 'EmbeddingService',
      useFactory: () => {
        // Use OpenAI for embeddings
        const openaiProvider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'text-embedding-3-small'
        });
        
        return new DefaultEmbeddingService({
          name: 'openai',
          embedText: async (text) => {
            try {
              // Try to use OpenAI for embeddings if API key is configured
              return await openaiProvider.createEmbedding(text);
            } catch (error) {
              console.warn('[EmbeddingService] Using fallback random embeddings:', error);
              // Fallback to random embeddings if API access fails
              return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
            }
          }
        });
      }
    },
    {
      provide: ContextService,
      useFactory: (embeddingService) => new ContextService(embeddingService),
      inject: ['EmbeddingService']
    },
    {
      provide: 'DocumentProcessor',
      useFactory: () => DocumentProcessorRegistry.createDefault()
    },
    {
      provide: PromptManager,
      useFactory: () => new PromptManager()
    },
    {
      provide: StateManager,
      useFactory: () => new StateManager()
    },
    {
      provide: 'NodeFactory',
      useFactory: (agentFactory) => {
        // Register all agent creators with the factory
        registerAgentCreators(agentFactory);
        return new DefaultNodeFactory(agentFactory);
      },
      inject: [AgentFactory]
    },
    {
      provide: 'AssetStorage',
      useFactory: () => new InMemoryAssetStorage()
    },
    {
      provide: 'SessionStorage',
      useFactory: () => new InMemorySessionStorage()
    }
  ],
  exports: [
    AgentFactory,
    'EmbeddingService',
    ContextService,
    'DocumentProcessor',
    PromptManager,
    StateManager,
    'NodeFactory',
    'AssetStorage',
    'SessionStorage'
  ]
})
export class LanggraphAgentModule {}
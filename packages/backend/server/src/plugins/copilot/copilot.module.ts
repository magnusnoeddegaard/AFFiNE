import { Module } from '@nestjs/common';
import { LoggerModule } from '@affine/server/base/logger';
import { PrismaModule } from '@affine/server/base/prisma';
import { ConfigModule } from '@affine/server/base/config';
import { StorageModule } from '@affine/server/base/storage';
import { JwtModule } from '@nestjs/jwt';
import { GraphQLModule } from '@nestjs/graphql';
import { AIController } from './controllers/ai.controller';
import { AiService } from './services/ai.service';
import { AgentFactoryService } from './services/agent-factory.service';
import { LLMProviderFactory } from './providers/provider-factory';
import { OpenAIProvider } from './providers/openai-provider';
import { PerplexityProvider } from './providers/perplexity-provider';
import { GoogleProvider } from './providers/google-provider';
import { FALProvider } from './providers/fal-provider';
import { AIResolver } from './graphql/ai.resolver';
import { ContextService } from './services/context.service';
import { PromptService } from './services/prompt.service';
import { EmbeddingService } from './services/embedding.service';
import { EMBEDDING_SERVICE } from './context/embedding-service';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    ConfigModule,
    StorageModule,
    JwtModule.register({}),
    GraphQLModule,
  ],
  controllers: [AIController],
  providers: [
    AiService,
    AgentFactoryService,
    LLMProviderFactory,
    OpenAIProvider,
    PerplexityProvider,
    GoogleProvider,
    FALProvider,
    AIResolver,
    ContextService,
    PromptService,
    // Register the embedding service implementation with the token
    {
      provide: EMBEDDING_SERVICE,
      useClass: EmbeddingService
    },
    // Keep the original service for backward compatibility
    EmbeddingService,
  ],
  exports: [
    AiService, 
    AgentFactoryService, 
    // Export the token for other modules to use
    EMBEDDING_SERVICE
  ],
})
export class CopilotModule {}
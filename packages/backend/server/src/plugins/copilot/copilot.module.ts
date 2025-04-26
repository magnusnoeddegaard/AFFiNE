import { Module } from '@nestjs/common';
import { LoggerModule } from '@affine/server/base/logger';
import { PrismaModule } from '@affine/server/base/prisma';
import { ConfigModule } from '@affine/server/base/config';
import { StorageModule } from '@affine/server/base/storage';
import { JwtModule } from '@nestjs/jwt';
import { GraphQLModule } from '@nestjs/graphql';
import { AiController } from './controllers/ai.controller';
import { AiService } from './services/ai.service';
import { AgentFactoryService } from './services/agent-factory.service';
import { LLMProviderFactory } from './providers/provider-factory';
import { OpenAIProvider } from './providers/openai-provider';
import { PerplexityProvider } from './providers/perplexity-provider';
import { GoogleAIProvider } from './providers/google-provider';
import { FALProvider } from './providers/fal-provider';
import { AIResolver } from './graphql/ai.resolver';
import { ContextService } from './services/context.service';
import { PromptService } from './services/prompt.service';
import { EmbeddingService } from './services/embedding.service';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    ConfigModule,
    StorageModule,
    JwtModule.register({}),
    GraphQLModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AgentFactoryService,
    LLMProviderFactory,
    OpenAIProvider,
    PerplexityProvider,
    GoogleAIProvider,
    FALProvider,
    AIResolver,
    ContextService,
    PromptService,
    EmbeddingService,
  ],
  exports: [AiService, AgentFactoryService],
})
export class CopilotModule {}
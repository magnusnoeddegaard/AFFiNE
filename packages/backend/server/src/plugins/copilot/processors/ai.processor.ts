import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { GraphExecutor } from '../graph/graph-executor';
import { TextGenerationGraph } from '../workflows/text-generation-graph';
import { ImageGenerationGraph } from '../workflows/image-generation-graph'
import { AgentFactory } from '../agents/agent-factory';
import { PubSub } from 'graphql-subscriptions';
import { StateManager } from '../state/state-manager';
import { DefaultNodeFactory } from '../graph/node-factory';
import { ContextService } from '../context/context-service';
import { Message } from '../types'; // Import the Message type

/**
 * Processor responsible for handling AI generation tasks in the background
 */
@Processor('ai-tasks')
export class AIProcessor {
  private readonly logger = new Logger(AIProcessor.name);

  constructor(
    private readonly agentFactory: AgentFactory,
    private readonly pubSub: PubSub,
    private readonly stateManager: StateManager,
    private readonly nodeFactory: DefaultNodeFactory,
    private readonly contextService: ContextService,
    private readonly textGenerationGraph: TextGenerationGraph,
    private readonly imageGenerationGraph: ImageGenerationGraph,
  ) {}

  /**
   * Processes text generation tasks
   */
  @Process('text-generation')
  async processTextGeneration(job: Job<TextGenerationJob>) {
    try {
      this.logger.debug(`Processing text generation job ${job.id}`);
      
      const { sessionId, message, contextIds, userId, workspaceId } = job.data;
      
      // Use the injected TextGenerationGraph instance
      const result = await this.textGenerationGraph.run({
        sessionId,
        messages: [message as Message], // Cast to Message type
        contextIds: contextIds || [],
        userId,
        workspaceId,
      });
      
      // Publish result to GraphQL subscription
      await this.pubSub.publish(`aiResponse.${sessionId}`, {
        aiResponse: {
          sessionId,
          response: result.response,
          status: 'completed',
        },
      });
      
      this.logger.debug(`Successfully completed text generation job ${job.id}`);
      
      return { success: true, sessionId, response: result.response };
    } catch (error) {
      this.logger.error(
        `Error processing text generation job ${job.id}`,
        error.stack
      );
      
      // Publish error to GraphQL subscription
      await this.pubSub.publish(`aiResponse.${job.data.sessionId}`, {
        aiResponse: {
          sessionId: job.data.sessionId,
          status: 'error',
          error: error.message,
        },
      });
      
      throw error;
    }
  }
  
  /**
   * Processes image generation tasks
   */
  @Process('image-generation')
  async processImageGeneration(job: Job<ImageGenerationJob>) {
    try {
      this.logger.debug(`Processing image generation job ${job.id}`);
      
      const { sessionId, prompt, userId, workspaceId, size, style } = job.data;
      
      // Use the injected ImageGenerationGraph instance
      const result = await this.imageGenerationGraph.run({
        sessionId,
        prompt,
        userId,
        workspaceId,
        imageOptions: { size, style },
      });
      
      // Publish result to GraphQL subscription
      await this.pubSub.publish(`aiImageResponse.${sessionId}`, {
        aiImageResponse: {
          sessionId,
          imageUrl: result.imageUrl,
          status: 'completed',
        },
      });
      
      this.logger.debug(`Successfully completed image generation job ${job.id}`);
      
      return { success: true, sessionId, imageUrl: result.imageUrl };
    } catch (error) {
      this.logger.error(
        `Error processing image generation job ${job.id}`,
        error.stack
      );
      
      // Publish error to GraphQL subscription
      await this.pubSub.publish(`aiImageResponse.${job.data.sessionId}`, {
        aiImageResponse: {
          sessionId: job.data.sessionId,
          status: 'error',
          error: error.message,
        },
      });
      
      throw error;
    }
  }
}

/**
 * Types for job data
 */
interface TextGenerationJob {
  sessionId: string;
  message: {
    role: "system" | "user" | "assistant" | "tool"; // Fixed to use string literals
    content: string;
    attachments?: Array<{
      type: string;
      content: string;
    }>;
  };
  contextIds?: string[];
  userId: string;
  workspaceId?: string;
}

interface ImageGenerationJob {
  sessionId: string;
  prompt: string;
  userId: string;
  workspaceId?: string;
  size?: string;
  style?: string;
}
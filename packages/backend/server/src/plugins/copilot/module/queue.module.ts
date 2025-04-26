import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmbeddingProcessor } from '../processors/embedding.processor';
import { AIProcessor } from '../processors/ai.processor';
import { TranscriptionProcessor } from '../processors/transcription.processor';

/**
 * Queue module for handling background tasks related to the AI Copilot system
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
          db: configService.get<number>('REDIS_QUEUE_DB', 2), // Use a separate DB for queues
        },
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: 100, // Keep the last 100 failed jobs
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: 'embedding',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'ai-tasks',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          timeout: 300000, // 5 minutes
        },
      },
      {
        name: 'transcription',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          timeout: 600000, // 10 minutes for longer audio files
        },
      }
    ),
  ],
  providers: [
    EmbeddingProcessor,
    AIProcessor,
    TranscriptionProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
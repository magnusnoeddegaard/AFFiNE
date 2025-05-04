import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Param,
  Body,
  Get,
  BadRequestException,
  NotFoundException,
  Query,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GqlJwtAuthGuard } from '../../../core/auth/guards/gql-jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BlobService } from '../../../core/storage/blob/service';
import { BlobType } from '../../../core/storage/blob/types';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiConsumes, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { PubSub } from 'graphql-subscriptions';

// Create a User interface based on what we need in this controller
interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  // We'll assume workspaceId is passed separately or obtained differently
}

/**
 * Controller for handling audio transcription functionality
 */
@ApiTags('AI Transcription')
@Controller('api/ai/transcription')
@UseGuards(GqlJwtAuthGuard)
export class TranscriptionController {
  constructor(
    private readonly blobService: BlobService,
    private readonly configService: ConfigService,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
    @InjectQueue('transcription') private readonly transcriptionQueue: Queue,
  ) {}

  /**
   * Upload and transcribe an audio file
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ default: { limit: 10, ttl: 60 } }) // Rate limit to 10 requests per minute
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file to transcribe',
        },
        sessionId: {
          type: 'string',
          description: 'Optional session ID for tracking',
        },
        language: {
          type: 'string',
          description: 'Optional language code (e.g., "en", "fr")',
        },
        workspaceId: {
          type: 'string',
          description: 'Optional workspace ID',
        },
      },
    },
  })
  async transcribeAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') providedSessionId: string,
    @Body('language') language: string,
    @Body('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp4',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      'video/mp4',
      'video/webm',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${allowedMimeTypes.join(', ')}`
      );
    }

    // Check file size - limit to 25MB
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      );
    }

    try {
      // Generate a session ID if not provided
      const sessionId = providedSessionId || `transcription-${randomUUID()}`;
      
      // Store the audio file using uploadBlob
      const blob = await this.blobService.uploadBlob(
        user.id,
        file.buffer,
        file.mimetype,
        {
          name: file.originalname,
          type: BlobType.ATTACHMENT,
          workspaceId,
          metadata: {
            type: 'transcription',
            sessionId,
          }
        }
      );

      // Generate a unique job ID
      const jobId = `job-${randomUUID()}`;
      
      // Add to transcription queue
      await this.transcriptionQueue.add(
        'audio-transcription',
        {
          jobId,
          sessionId,
          blobId: blob.id,
          userId: user.id,
          workspaceId,
          language,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          timeout: 600000, // 10 minutes
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      // Publish initial status
      await this.pubSub.publish(`transcriptionStatus.${sessionId}`, {
        transcriptionStatus: {
          jobId,
          sessionId,
          status: 'queued',
          progress: 0,
        },
      });

      return {
        jobId,
        sessionId,
        status: 'queued',
      };
    } catch (error) {
      console.error('Transcription job creation error:', error);
      throw new BadRequestException(
        `Failed to create transcription job: ${error.message}`
      );
    }
  }

  /**
   * Get the status of a transcription job
   */
  @Get(':jobId')
  @ApiParam({ name: 'jobId', description: 'The ID of the transcription job' })
  async getTranscriptionStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
    @Query('workspaceId') workspaceId: string,
  ) {
    try {
      const job = await this.transcriptionQueue.getJob(jobId);
      
      if (!job) {
        // Check if job is completed by looking for transcription results
        // Use getWorkspaceBlobs to find related blobs
        const blobs = await this.blobService.getWorkspaceBlobs(user.id, workspaceId);
        const transcriptionResult = blobs.find(blob => 
          blob.key.includes(jobId) && blob.mimeType === 'application/json'
        );
        
        if (transcriptionResult) {
          return {
            jobId,
            status: 'completed',
            progress: 100,
            result: transcriptionResult,
          };
        }
        
        throw new NotFoundException(`Transcription job ${jobId} not found`);
      }
      
      const state = await job.getState();
      const progress = job.progress();
      
      return {
        jobId,
        status: state,
        progress: progress || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to get transcription status: ${error.message}`
      );
    }
  }

  /**
   * Get all transcription results for a user
   */
  @Get()
  @ApiQuery({ name: 'sessionId', required: false, description: 'Filter by session ID' })
  @ApiQuery({ name: 'workspaceId', required: true, description: 'Workspace ID' })
  async getUserTranscriptions(
    @CurrentUser() user: User,
    @Query('sessionId') sessionId?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required');
    }

    try {
      // Get blobs from the workspace and filter for transcriptions
      const allBlobs = await this.blobService.getWorkspaceBlobs(user.id, workspaceId);
      
      // Filter for transcription blobs
      let transcriptions = allBlobs.filter(blob => 
        blob.mimeType.startsWith('audio/') || 
        (blob.mimeType === 'application/json' && blob.key.includes('transcription'))
      );
      
      // Apply session filter if provided
      if (sessionId) {
        transcriptions = transcriptions.filter(blob => 
          blob.key.includes(sessionId) || 
          (blob.metadata && blob.metadata.sessionId === sessionId)
        );
      }
      
      return {
        transcriptions,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get transcriptions: ${error.message}`
      );
    }
  }
}
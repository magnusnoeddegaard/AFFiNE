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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { User } from '../../../core/user/models/user.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BlobService } from '../../../core/blob/services/blob.service';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiConsumes, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { PubSub } from 'graphql-subscriptions';

/**
 * Controller for handling audio transcription functionality
 */
@ApiTags('AI Transcription')
@Controller('api/ai/transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  constructor(
    private readonly blobService: BlobService,
    private readonly configService: ConfigService,
    private readonly pubSub: PubSub,
    @InjectQueue('transcription') private readonly transcriptionQueue: Queue,
  ) {}

  /**
   * Upload and transcribe an audio file
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @Throttle(10, 60) // Rate limit to 10 requests per minute
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
      },
    },
  })
  async transcribeAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') providedSessionId: string,
    @Body('language') language: string,
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
      
      // Store the audio file as a blob
      const blob = await this.blobService.create({
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        content: file.buffer,
        userId: user.id,
        metadata: {
          type: 'transcription',
          sessionId,
        },
      });

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
  ) {
    try {
      const job = await this.transcriptionQueue.getJob(jobId);
      
      if (!job) {
        // Check if job is completed by looking for transcription result
        const result = await this.blobService.findTranscriptionResult(jobId);
        
        if (result) {
          return {
            jobId,
            status: 'completed',
            progress: 100,
            result,
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
  async getUserTranscriptions(
    @CurrentUser() user: User,
    @Query('sessionId') sessionId?: string,
  ) {
    try {
      const transcriptions = await this.blobService.findUserTranscriptions(
        user.id,
        sessionId
      );
      
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
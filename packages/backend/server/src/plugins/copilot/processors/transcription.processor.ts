import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { createReadStream } from 'fs';
import { PubSub } from 'graphql-subscriptions';
import { LLMProviderFactory } from '../providers/provider-factory';  // Changed from ProviderFactory
import { OpenAIProvider } from '../providers/openai.provider';
// Using the correct path for BlobService
import { BlobService } from '../../../core/storage/blob/service';
import { StorageService } from '../../../base/storage';
import { BlobType } from '../../../core/storage/blob/types';

/**
 * Processor responsible for handling audio transcription tasks
 */
@Processor('transcription')
export class TranscriptionProcessor {
  private readonly logger = new Logger(TranscriptionProcessor.name);
  private readonly tempDir: string;
  private readonly writeFile = util.promisify(fs.writeFile);
  private readonly unlink = util.promisify(fs.unlink);

  constructor(
    private readonly configService: ConfigService,
    private readonly providerFactory: LLMProviderFactory,  // Changed from ProviderFactory
    private readonly blobService: BlobService,
    private readonly storageService: StorageService, // Added StorageService for file operations
    private readonly pubSub: PubSub,
  ) {
    this.tempDir = this.configService.get<string>('TEMP_DIR', '/tmp');
  }

  /**
   * Process audio file transcription
   */
  @Process('audio-transcription')
  async processAudioTranscription(job: Job<TranscriptionJob>) {
    const { jobId, sessionId, blobId, userId, language } = job.data;
    let tempFilePath: string | null = null;

    try {
      this.logger.debug(`Processing audio transcription job ${jobId} for blob ${blobId}`);

      // Get the blob from storage (using getBlob which requires userId)
      const blob = await this.blobService.getBlob(userId, blobId);
      if (!blob) {
        throw new Error(`Blob ${blobId} not found`);
      }

      // Download the file to a temporary location
      tempFilePath = path.join(this.tempDir, `transcription_${jobId}_${Date.now()}.tmp`);
      
      // Get the file from storage service
      const fileData = await this.storageService.getFile(blob.key);
      
      // Write the file to the temporary location
      if (Buffer.isBuffer(fileData)) {
        // If it's a buffer, write it directly
        await this.writeFile(tempFilePath, fileData);
      } 
      // If it's a string, convert to buffer first
      else if (typeof fileData === 'string') {
        await this.writeFile(tempFilePath, Buffer.from(fileData));
      }
      // For any other format, throw an error
      else {
        throw new Error('Unsupported blob data format: Cannot process the file');
      }

      // Update status
      await this.pubSub.publish(`transcriptionStatus.${sessionId}`, {
        transcriptionStatus: {
          jobId,
          sessionId,
          status: 'processing',
          progress: 25,
        },
      });

      // Get the OpenAI provider for transcription
      // Currently only OpenAI is supported for transcription
      const provider = this.providerFactory.createProvider('openai') as OpenAIProvider;
      
      // Process the audio file
      const readStream = createReadStream(tempFilePath);
      const transcriptionOptions = {
        language: language || 'en', // Default to English if not specified
        prompt: '', // Optional prompt to guide transcription
      };
      
      // Perform transcription
      const transcriptionResult = await provider.transcribeAudio(
        readStream, 
        transcriptionOptions
      );

      // Import BlobType from types
      await this.blobService.uploadBlob(
        userId,
        Buffer.from(transcriptionResult.text),
        'text/plain',
        {
          name: `transcription_${blobId}.txt`,
          type: BlobType.IMAGE, // Using BlobType.IMAGE as a fallback
          documentId: undefined, // Use undefined instead of null
          workspaceId: blob.workspaceId,
          metadata: {
            sourceBlob: blobId,
            transcription: {
              text: transcriptionResult.text,
              segments: transcriptionResult.segments || [],
              language: transcriptionResult.language || language || 'en',
              durationInSeconds: transcriptionResult.durationInSeconds || 0,
            }
          }
        }
      );

      // Publish result to GraphQL subscription
      await this.pubSub.publish(`transcriptionResult.${sessionId}`, {
        transcriptionResult: {
          jobId,
          sessionId,
          blobId,
          text: transcriptionResult.text,
          segments: transcriptionResult.segments || [],
          status: 'completed',
        },
      });

      this.logger.debug(`Successfully completed transcription job ${jobId}`);
      
      return {
        success: true,
        jobId,
        sessionId,
        transcription: transcriptionResult,
      };
    } catch (error) {
      this.logger.error(
        `Error processing transcription job ${jobId}`,
        error.stack
      );
      
      // Publish error to GraphQL subscription
      await this.pubSub.publish(`transcriptionStatus.${sessionId}`, {
        transcriptionStatus: {
          jobId,
          sessionId,
          status: 'error',
          error: error.message,
        },
      });
      
      throw error;
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await this.unlink(tempFilePath);
        } catch (error) {
          this.logger.warn(`Failed to delete temporary file ${tempFilePath}`, error);
        }
      }
    }
  }
}

/**
 * Transcription Job Data
 */
interface TranscriptionJob {
  jobId: string;
  sessionId: string;
  blobId: string;
  userId: string;
  language?: string;
}
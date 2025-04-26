import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { PubSub } from 'graphql-subscriptions';
import { ProviderFactory } from '../providers/provider-factory';
import { OpenAIProvider } from '../providers/openai.provider';
import { BlobService } from '../../../core/blob/services/blob.service';

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
    private readonly providerFactory: ProviderFactory,
    private readonly blobService: BlobService,
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

      // Get the blob from storage
      const blob = await this.blobService.findById(blobId);
      if (!blob) {
        throw new Error(`Blob ${blobId} not found`);
      }

      // Download the file to a temporary location
      tempFilePath = path.join(this.tempDir, `transcription_${jobId}_${Date.now()}.tmp`);
      const fileData = await this.blobService.getBlobContent(blobId);
      
      // If fileData is a buffer, write it to a file
      if (Buffer.isBuffer(fileData)) {
        await this.writeFile(tempFilePath, fileData);
      } 
      // If fileData is a Readable stream
      else if (fileData instanceof Readable) {
        const writeStream = fs.createWriteStream(tempFilePath);
        await new Promise<void>((resolve, reject) => {
          fileData.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });
      } else {
        throw new Error('Unsupported blob data format');
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

      // Store the transcription result
      await this.blobService.createTranscriptionResult(blobId, {
        text: transcriptionResult.text,
        segments: transcriptionResult.segments || [],
        language: transcriptionResult.language || language || 'en',
        durationInSeconds: transcriptionResult.durationInSeconds || 0,
        userId,
      });

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
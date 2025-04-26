import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DocumentEmbeddingService } from '../services/document-embedding.service';

/**
 * Processor responsible for handling document embedding jobs
 * from the embedding queue
 */
@Processor('embedding')
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly documentEmbeddingService: DocumentEmbeddingService) {}

  /**
   * Process document embedding jobs
   */
  @Process('process-document')
  async processDocumentEmbedding(job: Job<{ documentId: string }>) {
    try {
      this.logger.debug(
        `Processing document embedding job ${job.id} for document ${job.data.documentId}`
      );
      
      // Call the service to perform the embedding
      await this.documentEmbeddingService.processDocumentEmbedding(job.data.documentId);
      
      this.logger.debug(
        `Successfully completed document embedding job ${job.id} for document ${job.data.documentId}`
      );
      
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing document embedding job ${job.id} for document ${job.data.documentId}`,
        error.stack
      );
      
      throw error; // Re-throw to trigger bull retry mechanism
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { DocumentService } from '../../../core/doc/services/document.service';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import { EmbeddingService } from './embedding.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';

/**
 * Service responsible for automatically embedding document content
 * and integrating with the document management system
 */
@Injectable()
export class DocumentEmbeddingService {
  private readonly logger = new Logger(DocumentEmbeddingService.name);
  private readonly chunkSize: number;

  constructor(
    private readonly documentService: DocumentService,
    private readonly workspaceService: WorkspaceService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
    @InjectQueue('embedding') private readonly embeddingQueue: Queue,
  ) {
    this.chunkSize = this.configService.get<number>('ai.embedding.chunkSize', 1500);
  }

  /**
   * Initialize the document embedding service and set up listeners
   * for document-related events
   */
  async onModuleInit() {
    this.logger.log('Initializing document embedding service');
    
    // Set up document event listeners for automatic embedding
    this.documentService.on('document.created', this.handleDocumentCreated.bind(this));
    this.documentService.on('document.updated', this.handleDocumentUpdated.bind(this));
    
    // Schedule initial embedding job for existing documents
    await this.scheduleInitialEmbedding();
  }

  /**
   * Handle document created event by scheduling document embedding
   */
  private async handleDocumentCreated(payload: { documentId: string }) {
    this.logger.debug(`Document created event received: ${payload.documentId}`);
    await this.scheduleDocumentEmbedding(payload.documentId);
  }

  /**
   * Handle document updated event by scheduling document embedding
   */
  private async handleDocumentUpdated(payload: { documentId: string }) {
    this.logger.debug(`Document updated event received: ${payload.documentId}`);
    await this.scheduleDocumentEmbedding(payload.documentId);
  }

  /**
   * Schedule initial embedding for all existing documents
   */
  private async scheduleInitialEmbedding() {
    try {
      this.logger.log('Scheduling initial embedding for existing documents');
      
      // Get all workspaces
      const workspaces = await this.workspaceService.findAll();
      
      for (const workspace of workspaces) {
        // Get all documents for each workspace
        const documents = await this.documentService.findAll(workspace.id);
        
        for (const document of documents) {
          await this.scheduleDocumentEmbedding(document.id);
        }
      }
      
      this.logger.log('Initial embedding scheduling complete');
    } catch (error) {
      this.logger.error('Error scheduling initial embeddings', error);
    }
  }

  /**
   * Schedule a document for embedding processing
   */
  async scheduleDocumentEmbedding(documentId: string) {
    try {
      // Add to embedding queue with retry options
      await this.embeddingQueue.add(
        'process-document',
        { documentId },
        { 
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      
      this.logger.debug(`Scheduled document ${documentId} for embedding`);
    } catch (error) {
      this.logger.error(`Error scheduling document ${documentId} for embedding`, error);
    }
  }

  /**
   * Process a document for embedding (called by the queue processor)
   */
  async processDocumentEmbedding(documentId: string) {
    try {
      this.logger.debug(`Processing embedding for document ${documentId}`);
      
      // Get the document
      const document = await this.documentService.findById(documentId);
      if (!document) {
        this.logger.warn(`Document ${documentId} not found, skipping embedding`);
        return;
      }
      
      // Get document content
      const content = await this.documentService.getDocumentContent(documentId);
      if (!content) {
        this.logger.warn(`No content for document ${documentId}, skipping embedding`);
        return;
      }
      
      // Break down content into chunks for better semantic search
      const chunks = this.chunkContent(content, this.chunkSize);
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding for chunk
        const embedding = await this.embeddingService.embedText(chunk);
        
        // Store the embedding with metadata
        await this.storeEmbedding(documentId, i, chunk, embedding);
      }
      
      this.logger.debug(`Successfully processed embedding for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Error processing document ${documentId} for embedding`, error);
      throw error; // Rethrow to allow the queue to handle retry logic
    }
  }
  
  /**
   * Chunk content into manageable pieces for embedding
   */
  private chunkContent(content: string, chunkSize: number): string[] {
    // Simple chunking by character count - in a production system,
    // this would be more sophisticated with sentence/paragraph awareness
    const chunks: string[] = [];
    
    // Use a sliding window with overlap
    const overlap = Math.floor(chunkSize * 0.1); // 10% overlap
    
    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunk = content.substring(i, i + chunkSize);
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Store an embedding in the database
   */
  private async storeEmbedding(
    documentId: string, 
    chunkIndex: number, 
    text: string, 
    embedding: number[]
  ) {
    try {
      // Store in database through document service
      await this.documentService.storeEmbedding(documentId, {
        chunkIndex,
        text,
        embedding,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error storing embedding for document ${documentId} chunk ${chunkIndex}`, 
        error
      );
      throw error;
    }
  }
}
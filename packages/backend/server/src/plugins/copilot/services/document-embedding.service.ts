import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DocumentService } from '../../../core/doc/service';
import { WorkspaceService } from '../../../core/workspace/service';
import { PrismaService } from '../../../base/prisma';
import { SessionService } from '../../../core/auth/session';
import { EmbeddingService } from './embedding.service';

/**
 * Service responsible for automatically embedding document content
 * and integrating with the document management system
 */
@Injectable()
export class DocumentEmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(DocumentEmbeddingService.name);
  private readonly chunkSize: number;

  constructor(
    private readonly documentService: DocumentService,
    private readonly workspaceService: WorkspaceService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @InjectQueue('embedding') private readonly embeddingQueue: Queue
  ) {
    this.chunkSize = this.configService.get<number>(
      'ai.embedding.chunkSize',
      1500
    );
  }

  /**
   * Initialize the document embedding service and set up listeners
   * for document-related events
   */
  async onModuleInit() {
    this.logger.log('Initializing document embedding service');

    // Set up document event listeners for automatic embedding using EventEmitter2
    this.eventEmitter.on(
      'document.created',
      this.handleDocumentCreated.bind(this)
    );
    this.eventEmitter.on(
      'document.updated',
      this.handleDocumentUpdated.bind(this)
    );

    // Schedule initial embedding job for existing documents
    await this.scheduleInitialEmbedding();
  }

  /**
   * Handle document created event by scheduling document embedding
   */
  private async handleDocumentCreated(payload: { documentId: string; userId?: string; workspaceId?: string }) {
    this.logger.debug(`Document created event received: ${payload.documentId}`);
    await this.scheduleDocumentEmbedding(payload.documentId);
  }

  /**
   * Handle document updated event by scheduling document embedding
   */
  private async handleDocumentUpdated(payload: { documentId: string; userId?: string; workspaceId?: string }) {
    this.logger.debug(`Document updated event received: ${payload.documentId}`);
    await this.scheduleDocumentEmbedding(payload.documentId);
  }

  /**
   * Schedule initial embedding for all existing documents
   */
  private async scheduleInitialEmbedding() {
    try {
      this.logger.log('Scheduling initial embedding for existing documents');

      // Get all active users from the database
      const activeSessions = await this.prisma.session.findMany({
        where: {
          expiresAt: {
            gt: new Date(), // Only get sessions that haven't expired
          },
        },
        distinct: ['userId'], // Get unique users
      });

      this.logger.debug(`Found ${activeSessions.length} active users`);

      // Process workspaces for each user
      for (const session of activeSessions) {
        const userId = session.userId;
        
        // Get all workspaces for this user using getUserWorkspaces
        const workspaces = await this.workspaceService.getUserWorkspaces(userId);
        
        this.logger.debug(`Processing ${workspaces.length} workspaces for user ${userId}`);

        for (const workspace of workspaces) {
          // Get all documents for each workspace
          const documents = await this.documentService.getDocuments(workspace.id);
          
          this.logger.debug(`Processing ${documents.length} documents for workspace ${workspace.id}`);

          for (const document of documents) {
            // We have userId and workspaceId available here, so let's pass it directly
            // instead of doing an extra database lookup in scheduleDocumentEmbedding
            await this.embeddingQueue.add(
              'process-document',
              {
                documentId: document.id,
                userId: userId,
                workspaceId: workspace.id
              },
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
            
            this.logger.debug(`Scheduled document ${document.id} for embedding in initial process`);
          }
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
      // First, we need to get the document owner
      const documentOwner = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { userId: true, workspaceId: true }
      });

      if (!documentOwner) {
        this.logger.warn(`Document ${documentId} not found, cannot schedule embedding`);
        return;
      }

      // Add to embedding queue with retry options and include userId and workspaceId
      await this.embeddingQueue.add(
        'process-document',
        { 
          documentId,
          userId: documentOwner.userId,
          workspaceId: documentOwner.workspaceId 
        },
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
      this.logger.error(
        `Error scheduling document ${documentId} for embedding`,
        error
      );
    }
  }

  /**
   * Process a document for embedding (called by the queue processor)
   */
  async processDocumentEmbedding(job: { documentId: string; userId: string; workspaceId: string }) {
    try {
      const { documentId, userId, workspaceId } = job;
      this.logger.debug(`Processing embedding for document ${documentId}`);

      // Get the document - using getDocument with both required parameters
      const document = await this.documentService.getDocument(userId, documentId);
      if (!document) {
        this.logger.warn(
          `Document ${documentId} not found, skipping embedding`
        );
        return;
      }

      // Get document content - providing both required parameters
      const content = await this.documentService.getDocumentContent(documentId, workspaceId);
      if (!content) {
        this.logger.warn(
          `No content for document ${documentId}, skipping embedding`
        );
        return;
      }

      // Convert DocumentContent to string if needed
      const contentText = typeof content === 'string' 
        ? content 
        : content.toString(); // or JSON.stringify(content) if toString() isn't available

      // Break down content into chunks for better semantic search
      const chunks = this.chunkContent(contentText, this.chunkSize);

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding for chunk
        const embedding = await this.embeddingService.createEmbedding(chunk);

        // Store the embedding with metadata - using saveEmbedding instead of storeEmbedding
        await this.saveEmbedding(documentId, i, chunk, embedding);
      }

      this.logger.debug(
        `Successfully processed embedding for document ${documentId}`
      );
    } catch (error) {
      this.logger.error(
        `Error processing document ${error.documentId || 'unknown'} for embedding`,
        error
      );
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
   * This replaces the call to documentService.storeEmbedding which doesn't exist
   */
  private async saveEmbedding(
    documentId: string,
    chunkIndex: number,
    text: string,
    embedding: number[]
  ) {
    try {
      // Store embedding data using direct database access since DocumentService doesn't have storeEmbedding
      // You may need to implement this method in DocumentService or use a different approach
      await this.prisma.documentEmbedding.create({
        data: {
          documentId,
          chunkIndex,
          text,
          embedding,
          createdAt: new Date(),
        },
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
import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { DocumentModel } from '../../../models/doc';
import { MutexService } from '../../../base/mutex/mutex.service';
import { RedisService } from '../../../base/redis/redis.service';
import { DocumentHistoryService } from '../history.service';

/**
 * Service for handling document real-time synchronization
 */
@Injectable()
export class DocumentSyncService {
  private readonly logger = new Logger(DocumentSyncService.name);
  
  // In-memory tracking of clients in document rooms
  private readonly documentClients: Map<string, Set<string>> = new Map();
  
  // In-memory tracking of client to user mapping
  private readonly clientUserMap: Map<string, { id: string; name: string }> = new Map();

  constructor(
    private readonly documentModel: DocumentModel,
    private readonly historyService: DocumentHistoryService,
    private readonly mutexService: MutexService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Handle client joining a document room
   * @param client Socket client
   * @param documentId Document ID
   * @returns Success status
   */
  async joinDocumentRoom(client: Socket, documentId: string): Promise<boolean> {
    try {
      // Join the Socket.IO room
      await client.join(`document:${documentId}`);
      
      // Get the user info from socket handshake auth
      const user = client.handshake.auth.user;
      
      if (!user) {
        this.logger.warn(`No user info for client ${client.id}`);
        return false;
      }
      
      // Store user info
      this.clientUserMap.set(client.id, { id: user.id, name: user.name || 'Anonymous' });
      
      // Add client to document tracking
      if (!this.documentClients.has(documentId)) {
        this.documentClients.set(documentId, new Set());
      }
      this.documentClients.get(documentId).add(client.id);
      
      // Notify other clients that user joined
      client.to(`document:${documentId}`).emit('user-joined', {
        userId: user.id,
        name: user.name || 'Anonymous',
      });
      
      // Send the list of active users to the joining client
      const activeUsers = this.getActiveUsersInDocument(documentId);
      client.emit('active-users', { users: activeUsers });
      
      return true;
    } catch (error) {
      this.logger.error(`Error joining document room: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Handle client leaving a document room
   * @param client Socket client
   * @param documentId Document ID
   * @returns Success status
   */
  async leaveDocumentRoom(client: Socket, documentId: string): Promise<boolean> {
    try {
      // Leave the Socket.IO room
      await client.leave(`document:${documentId}`);
      
      // Get the user info
      const user = this.clientUserMap.get(client.id);
      
      // Remove client from document tracking
      if (this.documentClients.has(documentId)) {
        this.documentClients.get(documentId).delete(client.id);
        
        // Cleanup if the set is empty
        if (this.documentClients.get(documentId).size === 0) {
          this.documentClients.delete(documentId);
        }
      }
      
      // Notify other clients that user left
      if (user) {
        client.to(`document:${documentId}`).emit('user-left', {
          userId: user.id,
        });
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error leaving document room: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Handle client disconnecting
   * @param client Socket client
   */
  async handleClientDisconnect(client: Socket): Promise<void> {
    try {
      const user = this.clientUserMap.get(client.id);
      
      // Remove client from all document tracking
      for (const [documentId, clients] of this.documentClients.entries()) {
        if (clients.has(client.id)) {
          clients.delete(client.id);
          
          // Notify other clients that user left
          if (user) {
            client.to(`document:${documentId}`).emit('user-left', {
              userId: user.id,
            });
          }
          
          // Cleanup if the set is empty
          if (clients.size === 0) {
            this.documentClients.delete(documentId);
          }
        }
      }
      
      // Remove client from user mapping
      this.clientUserMap.delete(client.id);
    } catch (error) {
      this.logger.error(`Error handling client disconnect: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle document update from client
   * @param client Socket client
   * @param data Update data
   */
  async handleDocumentUpdate(
    client: Socket,
    data: {
      documentId: string;
      operation: any;
      version: number;
      cursor?: any;
    },
  ): Promise<void> {
    const { documentId, operation, version, cursor } = data;
    
    // Use mutex to prevent race conditions during updates
    await this.mutexService.withMutex(`document:${documentId}:update`, async () => {
      // Get the latest document content
      const latestContent = await this.historyService.getLatestContent(documentId);
      
      if (!latestContent) {
        throw new Error('Document content not found');
      }
      
      // Check for version conflicts
      if (latestContent.version !== version) {
        throw new Error('Version conflict. Please refresh and try again.');
      }
      
      // Apply the operation to the content (this would depend on your editor's operation format)
      const newContent = this.applyOperation(latestContent.content, operation);
      
      // Get the user info
      const user = client.handshake.auth.user;
      
      if (!user) {
        throw new Error('User information not found');
      }
      
      // Update the document content
      await this.documentModel.updateContent(
        documentId,
        newContent,
        latestContent.blobIds,
        true, // Create history entry
        user.id,
      );
      
      // Broadcast the update to other clients in the room
      client.to(`document:${documentId}`).emit('document-updated', {
        operation,
        userId: user.id,
        name: user.name || 'Anonymous',
        version: latestContent.version + 1,
      });
      
      // If cursor position is provided, broadcast it as well
      if (cursor) {
        this.handleCursorUpdate(client, { documentId, cursor });
      }
    });
  }

  /**
   * Handle cursor update from client
   * @param client Socket client
   * @param data Cursor data
   */
  async handleCursorUpdate(
    client: Socket,
    data: {
      documentId: string;
      cursor: any;
    },
  ): Promise<void> {
    const { documentId, cursor } = data;
    
    // Get the user info
    const user = client.handshake.auth.user || this.clientUserMap.get(client.id);
    
    if (!user) {
      this.logger.warn(`No user info for cursor update from client ${client.id}`);
      return;
    }
    
    // Broadcast cursor position to other clients in the room
    client.to(`document:${documentId}`).emit('cursor-updated', {
      userId: user.id,
      name: user.name || 'Anonymous',
      cursor,
    });
  }

  /**
   * Get document content for sync
   * @param documentId Document ID
   * @returns Document content and version
   */
  async getDocumentContentForSync(documentId: string): Promise<{ content: any; version: number }> {
    const latestContent = await this.historyService.getLatestContent(documentId);
    
    if (!latestContent) {
      throw new Error('Document content not found');
    }
    
    return {
      content: latestContent.content,
      version: latestContent.version,
    };
  }

  /**
   * Get active users in a document
   * @param documentId Document ID
   * @returns List of active users
   */
  private getActiveUsersInDocument(documentId: string): Array<{ userId: string; name: string }> {
    const activeUsers: Array<{ userId: string; name: string }> = [];
    
    if (this.documentClients.has(documentId)) {
      const clientIds = this.documentClients.get(documentId);
      
      for (const clientId of clientIds) {
        const user = this.clientUserMap.get(clientId);
        
        if (user) {
          activeUsers.push({
            userId: user.id,
            name: user.name,
          });
        }
      }
    }
    
    return activeUsers;
  }

  /**
   * Apply operation to document content
   * This is a placeholder - actual implementation would depend on your editor's operation format
   */
  private applyOperation(content: string, operation: any): string {
    // This is a simplified example. In a real implementation, this would
    // apply operational transformation or other collaborative editing algorithm
    
    // For now, assuming operation is a simple object with the full new content
    if (typeof operation === 'string') {
      return operation;
    }
    
    if (operation.content) {
      return operation.content;
    }
    
    // If more complex operations (like JSON operations, OT, CRDT), 
    // you'd apply them here based on your specific format
    
    return content; // Fallback if no recognizable operation format
  }
}
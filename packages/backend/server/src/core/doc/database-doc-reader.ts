import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma';
import { DocumentService } from './service';

@Injectable()
export class DatabaseDocReader {
  private readonly logger = new Logger(DatabaseDocReader.name);

  constructor(
    private prisma: PrismaService,
    private documentService: DocumentService
  ) {}

  /**
   * Get the binary representation of a document
   */
  async getDoc(workspaceId: string, docId: string) {
    this.logger.debug(`Getting doc ${docId} from workspace ${workspaceId}`);
    
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id: docId,
          workspaceId: workspaceId,
        },
      });

      if (!document) {
        return null;
      }

      const content = await this.prisma.documentContent.findUnique({
        where: { documentId: docId },
      });

      if (!content) {
        return null;
      }

      // Convert content to binary representation
      const bin = Buffer.from(content.content || '');
      
      return {
        bin,
        timestamp: document.updatedAt.getTime(),
        editor: document.createdById // Using creator as editor for now
      };
    } catch (error) {
      this.logger.error(`Error getting doc: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get document diff based on state vector
   */
  async getDocDiff(workspaceId: string, docId: string, stateVector: Buffer | undefined) {
    this.logger.debug(`Getting doc diff ${docId} from workspace ${workspaceId}`);
    
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id: docId,
          workspaceId: workspaceId,
        },
      });

      if (!document) {
        return null;
      }

      const content = await this.prisma.documentContent.findUnique({
        where: { documentId: docId },
      });

      if (!content) {
        return null;
      }

      // This is a simplified implementation - in a real scenario, 
      // you would compute actual diffs based on the stateVector
      const currentContent = Buffer.from(content.content || '');
      
      // If no state vector provided, return all content as "missing"
      if (!stateVector) {
        return {
          missing: currentContent,
          state: Buffer.from(''),
          timestamp: document.updatedAt.getTime()
        };
      }
      
      // For demonstration, we're returning the full content as "missing"
      // In a real implementation, you would compute the actual diff
      return {
        missing: currentContent,
        state: stateVector,
        timestamp: document.updatedAt.getTime()
      };
    } catch (error) {
      this.logger.error(`Error getting doc diff: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get document content by ID
   */
  async getDocContent(workspaceId: string, docId: string) {
    this.logger.debug(`Getting doc content ${docId} from workspace ${workspaceId}`);
    
    try {
      // Leveraging existing method from DocumentService
      return await this.documentService.getDocContent(workspaceId, docId);
    } catch (error) {
      this.logger.error(`Error getting doc content: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get full document content by ID
   */
  async getFullDocContent(workspaceId: string, docId: string) {
    this.logger.debug(`Getting full doc content ${docId} from workspace ${workspaceId}`);
    
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id: docId,
          workspaceId: workspaceId,
        },
      });

      if (!document) {
        return null;
      }

      const content = await this.prisma.documentContent.findUnique({
        where: { documentId: docId },
      });

      // Return full document with content
      return {
        id: document.id,
        title: document.title,
        description: document.description,
        type: document.type,
        status: document.status,
        content: content?.content || '',
        createdBy: document.createdById,
        workspaceId: document.workspaceId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting full doc content: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get workspace content
   */
  async getWorkspaceContent(workspaceId: string) {
    this.logger.debug(`Getting workspace content ${workspaceId}`);
    
    try {
      // Check if workspace exists
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        return null;
      }

      // Get all documents in the workspace
      const documents = await this.prisma.document.findMany({
        where: {
          workspaceId: workspaceId,
          status: 'ACTIVE',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Return workspace with documents
      // Define an interface for the document
      interface DocumentType {
        id: string;
        title: string;
        type: string;
        updatedAt: Date;
        [key: string]: any; // For any other properties
      }
      
      return {
        id: workspace.id,
        name: workspace.name,
        documents: documents.map((doc: DocumentType) => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          updatedAt: doc.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting workspace content: ${error.message}`, error.stack);
      return null;
    }
  }
}
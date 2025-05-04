import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma';
import {
  CreateDocumentInput,
  Document,
  DocumentContent,
  DocumentFilters,
  DocumentStatus,
  UpdateDocumentContentInput,
  UpdateDocumentInput,
} from './types';

// Define interface for Document type
interface DocType {
  id: string;
  title: string;
  type: string;
  updatedAt: Date;
  [key: string]: any; // For any other properties
}

// Define a more comprehensive document model interface
interface DocumentModel {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdById: string;
  workspaceId?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private prisma: PrismaService
  ) {}

  /**
   * Create a new document
   */
  async createDocument(userId: string, document: CreateDocumentInput): Promise<Document> {
    this.logger.debug(`Creating document for user ${userId}`);
    
    try {
      const newDocument = await this.prisma.document.create({
        data: {
          title: document.title,
          description: document.description || '',
          type: document.type,
          status: 'ACTIVE',
          createdById: userId,
          workspaceId: document.workspaceId,
          parentId: document.parentId,
        },
      });

      // Create empty content for the document
      await this.prisma.documentContent.create({
        data: {
          documentId: newDocument.id,
          content: '',
        },
      });

      return {
        id: newDocument.id,
        title: newDocument.title,
        description: newDocument.description,
        type: newDocument.type,
        status: newDocument.status,
        createdBy: newDocument.createdById,
        workspaceId: newDocument.workspaceId,
        createdAt: newDocument.createdAt,
        updatedAt: newDocument.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error creating document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(userId: string, id: string): Promise<Document> {
    this.logger.debug(`Getting document ${id} for user ${userId}`);
    
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id,
          createdById: userId,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${id}`);
      }

      return {
        id: document.id,
        title: document.title,
        description: document.description,
        type: document.type,
        status: document.status,
        createdBy: document.createdById,
        workspaceId: document.workspaceId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get documents with filters
   */
  async getDocuments(userId: string, filters?: DocumentFilters): Promise<Document[]> {
    this.logger.debug(`Getting documents for user ${userId} with filters`);
    
    try {
      const where: any = {
        createdById: userId,
      };

      if (filters?.types && filters.types.length > 0) {
        where.type = { in: filters.types };
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        where.status = { in: filters.statuses };
      }

      if (filters?.workspaceId) {
        where.workspaceId = filters.workspaceId;
      }

      if (filters?.parentId) {
        where.parentId = filters.parentId;
      }

      const documents = await this.prisma.document.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return documents.map((doc: DocumentModel) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        type: doc.type,
        status: doc.status,
        createdBy: doc.createdById,
        workspaceId: doc.workspaceId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
    } catch (error) {
      this.logger.error(`Error getting documents: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update document by ID
   */
  async updateDocument(userId: string, id: string, document: UpdateDocumentInput): Promise<Document> {
    this.logger.debug(`Updating document ${id} for user ${userId}`);
    
    try {
      const existingDocument = await this.prisma.document.findFirst({
        where: {
          id,
          createdById: userId,
        },
      });

      if (!existingDocument) {
        throw new Error(`Document not found: ${id}`);
      }

      const updatedDocument = await this.prisma.document.update({
        where: { id },
        data: {
          title: document.title !== undefined ? document.title : undefined,
          description: document.description !== undefined ? document.description : undefined,
          status: document.status !== undefined ? document.status : undefined,
        },
      });

      return {
        id: updatedDocument.id,
        title: updatedDocument.title,
        description: updatedDocument.description,
        type: updatedDocument.type,
        status: updatedDocument.status,
        createdBy: updatedDocument.createdById,
        workspaceId: updatedDocument.workspaceId,
        createdAt: updatedDocument.createdAt,
        updatedAt: updatedDocument.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error updating document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete document by ID (Moves to trash)
   */
  async deleteDocument(userId: string, id: string): Promise<boolean> {
    this.logger.debug(`Deleting document ${id} for user ${userId}`);
    
    try {
      const existingDocument = await this.prisma.document.findFirst({
        where: {
          id,
          createdById: userId,
        },
      });

      if (!existingDocument) {
        return false;
      }

      // Move to trash instead of deleting
      await this.prisma.document.update({
        where: { id },
        data: {
          status: 'TRASHED',
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Error deleting document: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Permanently delete document by ID
   */
  async permanentlyDeleteDocument(userId: string, id: string): Promise<boolean> {
    this.logger.debug(`Permanently deleting document ${id} for user ${userId}`);
    
    try {
      const existingDocument = await this.prisma.document.findFirst({
        where: {
          id,
          createdById: userId,
        },
      });

      if (!existingDocument) {
        return false;
      }

      // Delete document content first
      await this.prisma.documentContent.delete({
        where: { documentId: id },
      });

      // Delete the document
      await this.prisma.document.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      this.logger.error(`Error permanently deleting document: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Get document content by ID
   */
  async getDocContent(workspaceId: string, docId: string) {
    this.logger.debug(`Getting document content for ${docId} in workspace ${workspaceId}`);
    
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

      return content?.content || null;
    } catch (error) {
      this.logger.error(`Error getting document content: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get document content by ID
   */
  async getDocumentContent(userId: string, id: string): Promise<DocumentContent> {
    this.logger.debug(`Getting document content for ${id} by user ${userId}`);
    
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id,
          createdById: userId,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${id}`);
      }

      const content = await this.prisma.documentContent.findUnique({
        where: { documentId: id },
      });

      if (!content) {
        throw new Error(`Document content not found: ${id}`);
      }

      return {
        id: content.id,
        documentId: content.documentId,
        content: content.content,
        updatedAt: content.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting document content: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update document content by ID
   */
  async updateDocumentContent(userId: string, id: string, contentInput: UpdateDocumentContentInput): Promise<DocumentContent> {
    this.logger.debug(`Updating document content for ${id} by user ${userId}`);
    
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id,
          createdById: userId,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${id}`);
      }

      let content = await this.prisma.documentContent.findUnique({
        where: { documentId: id },
      });

      if (!content) {
        // Create content if it doesn't exist
        content = await this.prisma.documentContent.create({
          data: {
            documentId: id,
            content: contentInput.content,
          },
        });
      } else {
        // Update existing content
        content = await this.prisma.documentContent.update({
          where: { documentId: id },
          data: {
            content: contentInput.content,
          },
        });
      }

      return {
        id: content.id,
        documentId: content.documentId,
        content: content.content,
        updatedAt: content.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error updating document content: ${error.message}`, error.stack);
      throw error;
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
      return {
        id: workspace.id,
        name: workspace.name,
        documents: documents.map((doc: DocType) => ({
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
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma';
import { MutexService } from '../../base/mutex';
import { StorageService } from '../../base/storage';
import {
  CreateDocumentInput,
  Document,
  DocumentContent,
  DocumentFilters,
  DocumentStatus,
  UpdateDocumentContentInput,
  UpdateDocumentInput,
} from './types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private mutexService: MutexService,
    private storageService: StorageService,
  ) {}

  async createDocument(userId: string, input: CreateDocumentInput): Promise<Document> {
    const documentId = uuidv4();

    const document = await this.prisma.document.create({
      data: {
        id: documentId,
        title: input.title,
        description: input.description,
        type: input.type,
        status: 'ACTIVE',
        createdById: userId,
        workspaceId: input.workspaceId,
        parentId: input.parentId,
      },
    });

    // Create initial empty content
    await this.prisma.documentContent.create({
      data: {
        documentId: document.id,
        content: JSON.stringify({ type: 'doc', content: [] }),
      },
    });

    return {
      id: document.id,
      title: document.title,
      description: document.description,
      type: document.type as any,
      status: document.status as any,
      createdBy: document.createdById,
      workspaceId: document.workspaceId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async getDocument(userId: string, documentId: string): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check if user has access to this document
    const hasAccess = await this.checkUserAccess(userId, documentId);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to this document');
    }

    return {
      id: document.id,
      title: document.title,
      description: document.description,
      type: document.type as any,
      status: document.status as any,
      createdBy: document.createdById,
      workspaceId: document.workspaceId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async getDocuments(userId: string, filters?: DocumentFilters): Promise<Document[]> {
    // Build filter conditions
    const where: any = {
      OR: [
        { createdById: userId },
        // Add workspace access conditions here
        // Will be expanded when workspace permissions are implemented
      ],
    };

    if (filters?.types?.length) {
      where.type = { in: filters.types };
    }

    if (filters?.statuses?.length) {
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
      orderBy: { updatedAt: 'desc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      type: doc.type as any,
      status: doc.status as any,
      createdBy: doc.createdById,
      workspaceId: doc.workspaceId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async updateDocument(userId: string, documentId: string, input: UpdateDocumentInput): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check if user has access to this document
    const hasAccess = await this.checkUserAccess(userId, documentId);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to this document');
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        title: input.title !== undefined ? input.title : undefined,
        description: input.description !== undefined ? input.description : undefined,
        status: input.status !== undefined ? input.status : undefined,
        updatedAt: new Date(),
      },
    });

    return {
      id: updatedDocument.id,
      title: updatedDocument.title,
      description: updatedDocument.description,
      type: updatedDocument.type as any,
      status: updatedDocument.status as any,
      createdBy: updatedDocument.createdById,
      workspaceId: updatedDocument.workspaceId,
      createdAt: updatedDocument.createdAt,
      updatedAt: updatedDocument.updatedAt,
    };
  }

  async deleteDocument(userId: string, documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check if user has access to this document
    const hasAccess = await this.checkUserAccess(userId, documentId);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to this document');
    }

    // Soft delete by updating status to TRASHED
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.TRASHED,
        updatedAt: new Date(),
      },
    });

    return true;
  }

  async permanentlyDeleteDocument(userId: string, documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check if user has access to this document and is owner
    const hasAccess = await this.checkUserAccess(userId, documentId, true);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to permanently delete this document');
    }

    // Permanently delete document and its content
    await this.prisma.$transaction([
      this.prisma.documentContent.deleteMany({
        where: { documentId },
      }),
      this.prisma.document.delete({
        where: { id: documentId },
      }),
    ]);

    return true;
  }

  async getDocumentContent(userId: string, documentId: string): Promise<DocumentContent> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check if user has access to this document
    const hasAccess = await this.checkUserAccess(userId, documentId);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to this document');
    }

    const content = await this.prisma.documentContent.findUnique({
      where: { documentId },
    });

    if (!content) {
      throw new NotFoundException(`Content for document with ID ${documentId} not found`);
    }

    return {
      id: content.id,
      documentId: content.documentId,
      content: content.content,
      updatedAt: content.updatedAt,
    };
  }

  async updateDocumentContent(
    userId: string, 
    documentId: string, 
    input: UpdateDocumentContentInput
  ): Promise<DocumentContent> {
    return this.mutexService.runWithLock(`document:${documentId}`, async () => {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException(`Document with ID ${documentId} not found`);
      }

      // Check if user has access to this document
      const hasAccess = await this.checkUserAccess(userId, documentId);
      
      if (!hasAccess) {
        throw new UnauthorizedException('You do not have access to this document');
      }

      const content = await this.prisma.documentContent.upsert({
        where: { documentId },
        update: {
          content: input.content,
          updatedAt: new Date(),
        },
        create: {
          documentId,
          content: input.content,
        },
      });

      // Update the document's lastUpdated timestamp
      await this.prisma.document.update({
        where: { id: documentId },
        data: { updatedAt: new Date() },
      });

      return {
        id: content.id,
        documentId: content.documentId,
        content: content.content,
        updatedAt: content.updatedAt,
      };
    });
  }

  // Helper method to check if a user has access to a document
  private async checkUserAccess(
    userId: string, 
    documentId: string, 
    requireOwner: boolean = false
  ): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return false;
    }

    // User is the creator
    if (document.createdById === userId) {
      return true;
    }

    // If we require owner permissions and user isn't the creator, deny access
    if (requireOwner) {
      return false;
    }

    // For now, simply check if this is a workspace document and the user is a member
    // This will be expanded when proper permission model is implemented
    if (document.workspaceId) {
      const workspaceMember = await this.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: document.workspaceId,
          userId,
        },
      });

      return !!workspaceMember;
    }

    return false;
  }
}
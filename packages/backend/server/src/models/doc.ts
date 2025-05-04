import { Injectable } from '@nestjs/common';

import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import {
  DocumentBase,
  DocumentContent,
  DocumentType,
  DocumentVisibility,
} from './common';

/**
 * Document model for document operations
 */
@Injectable()
export class DocumentModel extends BaseModel<DocumentBase> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.document;
  }

  /**
   * Create a new document with initial content
   * @param documentData The document data
   * @param contentData The initial content data
   * @returns The created document with content
   */
  async createWithContent(
    documentData: Omit<
      DocumentBase,
      'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt'
    >,
    contentData: Pick<DocumentContent, 'content' | 'blobIds'>
  ): Promise<{ document: DocumentBase; content: DocumentContent }> {
    return this.prisma.$transaction(async (tx: any) => {
      // Create the document
      const document = await tx.document.create({
        data: {
          ...documentData,
          visibility: documentData.visibility || DocumentVisibility.PRIVATE,
          type: documentData.type || DocumentType.DOC,
        },
      });

      // Create the initial content
      const content = await tx.documentContent.create({
        data: {
          documentId: document.id,
          version: 1,
          content: contentData.content,
          blobIds: contentData.blobIds || [],
        },
      });

      return { document, content };
    });
  }

  /**
   * Get a document with its latest content
   * @param id The document ID
   * @returns The document with content
   */
  async getWithContent(
    id: string
  ): Promise<{ document: DocumentBase; content: DocumentContent } | null> {
    const document = await this.findById(id);

    if (!document) {
      return null;
    }

    const content = await this.prisma.documentContent.findFirst({
      where: { documentId: id },
      orderBy: { version: 'desc' },
    });

    if (!content) {
      return null;
    }

    return { document, content };
  }

  /**
   * Update document content
   * @param documentId The document ID
   * @param content The new content
   * @param blobIds The blob IDs
   * @param createHistory Whether to create a history entry
   * @param userId The user ID performing the update (for history)
   * @param message Optional history message
   * @returns The updated content
   */
  async updateContent(
    documentId: string,
    content: string,
    blobIds: string[] = [],
    createHistory: boolean = true,
    userId?: string,
    message?: string
  ): Promise<DocumentContent> {
    return this.prisma.$transaction(async (tx: any) => {
      // Get the latest version
      const latestContent = await tx.documentContent.findFirst({
        where: { documentId },
        orderBy: { version: 'desc' },
      });

      const newVersion = latestContent ? latestContent.version + 1 : 1;

      // Create new content version
      const newContent = await tx.documentContent.create({
        data: {
          documentId,
          version: newVersion,
          content,
          blobIds,
        },
      });

      // Update document's updatedAt
      await tx.document.update({
        where: { id: documentId },
        data: { updatedAt: new Date() },
      });

      // Create history entry if requested
      if (createHistory && userId) {
        await tx.documentHistory.create({
          data: {
            documentId,
            contentId: newContent.id,
            version: newVersion,
            createdById: userId,
            message: message || '',
          },
        });
      }

      return newContent;
    });
  }

  /**
   * Find documents by workspace ID
   * @param workspaceId The workspace ID
   * @param options Query options
   * @returns The documents
   */
  async findByWorkspace(
    workspaceId: string,
    options: any = {}
  ): Promise<DocumentBase[]> {
    return this.findMany({ workspaceId, deleted: false }, options);
  }

  /**
   * Find documents by parent ID
   * @param parentId The parent document ID
   * @param options Query options
   * @returns The child documents
   */
  async findByParent(
    parentId: string,
    options: any = {}
  ): Promise<DocumentBase[]> {
    return this.findMany({ parentId, deleted: false }, options);
  }

  /**
   * Find favorited documents
   * @param workspaceId The workspace ID
   * @param options Query options
   * @returns The favorited documents
   */
  async findFavorites(
    workspaceId: string,
    options: any = {}
  ): Promise<DocumentBase[]> {
    return this.findMany(
      { workspaceId, favorite: true, deleted: false },
      {
        orderBy: { favoriteOrder: 'asc' },
        ...options,
      }
    );
  }

  /**
   * Restore a soft-deleted document
   * @param id The document ID
   * @returns The restored document
   */
  async restore(id: string): Promise<DocumentBase> {
    return this.model.update({
      where: { id },
      data: {
        deleted: false,
        deletedAt: null,
      },
    });
  }

  /**
   * Hard delete a document
   * @param id The document ID
   * @returns The deleted document
   */
  async hardDelete(id: string): Promise<DocumentBase> {
    return this.prisma.$transaction(async (tx: any) => {
      // Delete related content and history
      await tx.documentContent.deleteMany({ where: { documentId: id } });
      await tx.documentHistory.deleteMany({ where: { documentId: id } });
      await tx.documentUser.deleteMany({ where: { documentId: id } });

      // Delete the document
      return tx.document.delete({ where: { id } });
    });
  }

  /**
   * Update document order
   * @param id The document ID
   * @param order The new order
   * @returns The updated document
   */
  async updateOrder(id: string, order: number): Promise<DocumentBase> {
    return this.model.update({
      where: { id },
      data: { order },
    });
  }

  /**
   * Toggle document favorite status
   * @param id The document ID
   * @param favorite The favorite status
   * @param favoriteOrder Optional order for favorites
   * @returns The updated document
   */
  async toggleFavorite(
    id: string,
    favorite: boolean,
    favoriteOrder?: number
  ): Promise<DocumentBase> {
    return this.model.update({
      where: { id },
      data: {
        favorite,
        favoriteOrder: favorite ? favoriteOrder : null,
      },
    });
  }
}

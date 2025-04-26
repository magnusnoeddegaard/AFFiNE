import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { DocumentContent, DocumentHistory } from './common';

/**
 * History model for document history operations
 */
@Injectable()
export class HistoryModel extends BaseModel<DocumentHistory> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.documentHistory;
  }

  /**
   * Find history entries by document ID
   * @param documentId The document ID
   * @param options Query options
   * @returns The history entries
   */
  async findByDocument(documentId: string, options: any = {}): Promise<DocumentHistory[]> {
    return this.findMany(
      { documentId },
      {
        orderBy: { version: 'desc' },
        ...options,
      },
    );
  }

  /**
   * Get a specific version of a document
   * @param documentId The document ID
   * @param version The version number
   * @returns The history entry with content
   */
  async getVersion(
    documentId: string,
    version: number,
  ): Promise<{ history: DocumentHistory; content: DocumentContent } | null> {
    const history = await this.model.findFirst({
      where: {
        documentId,
        version,
      },
    });
    
    if (!history) {
      return null;
    }
    
    const content = await this.prisma.documentContent.findUnique({
      where: { id: history.contentId },
    });
    
    if (!content) {
      return null;
    }
    
    return { history, content };
  }

  /**
   * Create a new history entry
   * @param documentId The document ID
   * @param contentId The content ID
   * @param version The version number
   * @param createdById The user ID who created the version
   * @param message Optional message describing the changes
   * @returns The created history entry
   */
  async createHistoryEntry(
    documentId: string,
    contentId: string,
    version: number,
    createdById: string,
    message?: string,
  ): Promise<DocumentHistory> {
    return this.create({
      documentId,
      contentId,
      version,
      createdById,
      message,
    });
  }

  /**
   * Restore a document to a specific version
   * @param documentId The document ID
   * @param version The version to restore
   * @param userId The user ID performing the restore
   * @param message Optional restore message
   * @returns The new content created by the restore
   */
  async restoreVersion(
    documentId: string,
    version: number,
    userId: string,
    message?: string,
  ): Promise<DocumentContent | null> {
    return this.prisma.$transaction(async (tx) => {
      // Get the version to restore
      const versionData = await this.getVersion(documentId, version);
      
      if (!versionData) {
        return null;
      }
      
      // Get the latest version
      const latestContent = await tx.documentContent.findFirst({
        where: { documentId },
        orderBy: { version: 'desc' },
      });
      
      const newVersion = latestContent ? latestContent.version + 1 : 1;
      
      // Create new content based on the old version
      const newContent = await tx.documentContent.create({
        data: {
          documentId,
          version: newVersion,
          content: versionData.content.content,
          blobIds: versionData.content.blobIds,
        },
      });
      
      // Create history entry for the restore
      await tx.documentHistory.create({
        data: {
          documentId,
          contentId: newContent.id,
          version: newVersion,
          createdById: userId,
          message: message || `Restored from version ${version}`,
        },
      });
      
      // Update document's updatedAt
      await tx.document.update({
        where: { id: documentId },
        data: { updatedAt: new Date() },
      });
      
      return newContent;
    });
  }

  /**
   * Delete history entries for a document
   * @param documentId The document ID
   * @returns The count of deleted entries
   */
  async deleteDocumentHistory(documentId: string): Promise<number> {
    const result = await this.prisma.documentHistory.deleteMany({
      where: { documentId },
    });
    
    return result.count;
  }

  /**
   * Compare two versions of a document
   * @param documentId The document ID
   * @param versionA First version to compare
   * @param versionB Second version to compare
   * @returns The content of both versions
   */
  async compareVersions(
    documentId: string,
    versionA: number,
    versionB: number,
  ): Promise<{ versionA: DocumentContent | null; versionB: DocumentContent | null }> {
    const [resultA, resultB] = await Promise.all([
      this.getVersion(documentId, versionA),
      this.getVersion(documentId, versionB),
    ]);
    
    return {
      versionA: resultA ? resultA.content : null,
      versionB: resultB ? resultB.content : null,
    };
  }
}
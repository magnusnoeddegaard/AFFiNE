import { Injectable } from '@nestjs/common';
import { HistoryModel } from '../../models/history';
import { DocumentModel } from '../../models/doc';
import { DocumentContent, DocumentHistory, DocumentBase } from '../../models/common';
import { MutexService } from '../../base/mutex/mutex.service';

/**
 * Service for handling document history
 */
@Injectable()
export class DocumentHistoryService {
  constructor(
    private readonly historyModel: HistoryModel,
    private readonly documentModel: DocumentModel,
    private readonly mutexService: MutexService,
  ) {}

  /**
   * Get history entries for a document
   * @param documentId The document ID
   * @param limit Optional limit
   * @param skip Optional skip for pagination
   * @returns Document history entries
   */
  async getDocumentHistory(
    documentId: string,
    limit?: number,
    skip?: number,
  ): Promise<DocumentHistory[]> {
    return this.historyModel.findByDocument(documentId, {
      orderBy: { version: 'desc' },
      take: limit,
      skip,
    });
  }

  /**
   * Get a specific version of a document
   * @param documentId The document ID
   * @param version The version number
   * @returns The document version with content
   */
  async getDocumentVersion(
    documentId: string,
    version: number,
  ): Promise<{ history: DocumentHistory; content: DocumentContent } | null> {
    return this.historyModel.getVersion(documentId, version);
  }

  /**
   * Create a new document history entry
   * @param documentId The document ID
   * @param contentId The content ID
   * @param version The version number
   * @param userId The user ID who created the version
   * @param message Optional message describing the changes
   * @returns The created history entry
   */
  async createHistoryEntry(
    documentId: string,
    contentId: string,
    version: number,
    userId: string,
    message?: string,
  ): Promise<DocumentHistory> {
    return this.historyModel.createHistoryEntry(
      documentId,
      contentId,
      version,
      userId,
      message,
    );
  }

  /**
   * Restore a document to a specific version
   * @param documentId The document ID
   * @param version The version to restore
   * @param userId The user ID performing the restore
   * @returns The restored document content
   */
  async restoreVersion(
    documentId: string,
    version: number,
    userId: string,
  ): Promise<DocumentContent | null> {
    // Use mutex to prevent race conditions during restore
    return this.mutexService.withMutex(
      `document:${documentId}:restore`,
      () => this.historyModel.restoreVersion(
        documentId,
        version,
        userId,
        `Restored from version ${version}`,
      ),
    );
  }

  /**
   * Compare two document versions
   * @param documentId The document ID
   * @param versionA The first version to compare
   * @param versionB The second version to compare
   * @returns The two versions for comparison
   */
  async compareVersions(
    documentId: string,
    versionA: number,
    versionB: number,
  ): Promise<{ versionA: DocumentContent | null; versionB: DocumentContent | null }> {
    return this.historyModel.compareVersions(documentId, versionA, versionB);
  }

  /**
   * Get the latest document content
   * @param documentId The document ID
   * @returns The latest document content
   */
  async getLatestContent(documentId: string): Promise<DocumentContent | null> {
    const document = await this.documentModel.getWithContent(documentId);
    return document ? document.content : null;
  }

  /**
   * Create a document snapshot
   * @param documentId The document ID
   * @param userId The user ID creating the snapshot
   * @param message The snapshot message
   * @returns The created snapshot
   */
  async createSnapshot(
    documentId: string,
    userId: string,
    message: string,
  ): Promise<DocumentHistory | null> {
    // Use mutex to prevent race conditions
    return this.mutexService.withMutex(
      `document:${documentId}:snapshot`,
      async () => {
        const document = await this.documentModel.getWithContent(documentId);
        
        if (!document) {
          return null;
        }

        // Create history entry for this snapshot
        return this.historyModel.createHistoryEntry(
          documentId,
          document.content.id,
          document.content.version,
          userId,
          message,
        );
      },
    );
  }

  /**
   * Delete document history
   * @param documentId The document ID
   * @returns The number of deleted history entries
   */
  async deleteHistory(documentId: string): Promise<number> {
    return this.historyModel.deleteDocumentHistory(documentId);
  }

  /**
   * Check if a document has history
   * @param documentId The document ID
   * @returns Whether the document has history entries
   */
  async hasHistory(documentId: string): Promise<boolean> {
    const history = await this.historyModel.findByDocument(documentId, { take: 1 });
    return history.length > 0;
  }
}
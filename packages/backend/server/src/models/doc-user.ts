import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { DocumentPermission, DocumentUser } from './common';

/**
 * DocumentUser model for document-user relation operations
 */
@Injectable()
export class DocumentUserModel extends BaseModel<DocumentUser> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.documentUser;
  }

  /**
   * Find document access by document ID and user ID
   * @param documentId The document ID
   * @param userId The user ID
   * @returns The document-user relation
   */
  async findByDocumentAndUser(documentId: string, userId: string): Promise<DocumentUser | null> {
    return this.model.findFirst({
      where: {
        documentId,
        userId,
      },
    });
  }

  /**
   * Get all users with access to a document
   * @param documentId The document ID
   * @returns The document-user relations
   */
  async findByDocument(documentId: string): Promise<DocumentUser[]> {
    return this.findMany({ documentId });
  }

  /**
   * Get all document access for a user
   * @param userId The user ID
   * @returns The document-user relations
   */
  async findByUser(userId: string): Promise<DocumentUser[]> {
    return this.findMany({ userId });
  }

  /**
   * Grant permission to a user for a document
   * @param documentId The document ID
   * @param userId The user ID
   * @param permission The permission level
   * @returns The created or updated document-user relation
   */
  async grantPermission(
    documentId: string,
    userId: string,
    permission: DocumentPermission,
  ): Promise<DocumentUser> {
    const existing = await this.findByDocumentAndUser(documentId, userId);
    
    if (existing) {
      return this.update(existing.id, { permission });
    }
    
    return this.create({
      documentId,
      userId,
      permission,
    });
  }

  /**
   * Revoke permission from a user for a document
   * @param documentId The document ID
   * @param userId The user ID
   * @returns Whether the permission was revoked
   */
  async revokePermission(documentId: string, userId: string): Promise<boolean> {
    const existing = await this.findByDocumentAndUser(documentId, userId);
    
    if (existing) {
      await this.delete(existing.id);
      return true;
    }
    
    return false;
  }

  /**
   * Check if a user has a specific permission level for a document
   * @param documentId The document ID
   * @param userId The user ID
   * @param requiredPermission The required permission level
   * @returns Whether the user has the required permission
   */
  async hasPermission(
    documentId: string,
    userId: string,
    requiredPermission: DocumentPermission,
  ): Promise<boolean> {
    const access = await this.findByDocumentAndUser(documentId, userId);
    
    if (!access) {
      return false;
    }
    
    const permissionLevels = {
      [DocumentPermission.NONE]: 0,
      [DocumentPermission.READ]: 1,
      [DocumentPermission.COMMENT]: 2,
      [DocumentPermission.WRITE]: 3,
      [DocumentPermission.ADMIN]: 4,
      [DocumentPermission.OWNER]: 5,
    };
    
    return permissionLevels[access.permission] >= permissionLevels[requiredPermission];
  }

  /**
   * Copy permissions from one document to another
   * @param sourceDocumentId The source document ID
   * @param targetDocumentId The target document ID
   * @returns The count of copied permissions
   */
  async copyPermissions(sourceDocumentId: string, targetDocumentId: string): Promise<number> {
    const sourcePermissions = await this.findByDocument(sourceDocumentId);
    
    if (!sourcePermissions.length) {
      return 0;
    }
    
    await this.prisma.$transaction(
      sourcePermissions.map((perm) =>
        this.prisma.documentUser.create({
          data: {
            documentId: targetDocumentId,
            userId: perm.userId,
            permission: perm.permission,
          },
        }),
      ),
    );
    
    return sourcePermissions.length;
  }
}
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../base/prisma';
import { StorageService } from '../../../base/storage';
import { Blob, BlobType, UploadBlobInput } from './types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BlobService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private configService: ConfigService,
  ) {}

  async uploadBlob(
    userId: string,
    file: Buffer,
    fileType: string,
    input: UploadBlobInput,
  ): Promise<Blob> {
    // Check document and workspace access if provided
    if (input.documentId) {
      const hasDocumentAccess = await this.checkDocumentAccess(userId, input.documentId);
      if (!hasDocumentAccess) {
        throw new UnauthorizedException('You do not have access to this document');
      }
    }

    if (input.workspaceId) {
      const hasWorkspaceAccess = await this.checkWorkspaceAccess(userId, input.workspaceId);
      if (!hasWorkspaceAccess) {
        throw new UnauthorizedException('You do not have access to this workspace');
      }
    }

    // Generate a unique ID and key for the blob
    const blobId = uuidv4();
    
    // Create a structured key based on the blob type
    let keyPrefix = 'attachments';
    if (input.type === BlobType.IMAGE) {
      keyPrefix = 'images';
    } else if (input.type === BlobType.AVATAR) {
      keyPrefix = 'avatars';
    }
    
    // Use the original file extension if available
    const fileExtension = this.getFileExtension(input.name);
    const key = `${keyPrefix}/${input.workspaceId || 'personal'}/${blobId}${fileExtension ? '.' + fileExtension : ''}`;

    // Upload the file to storage
    await this.storageService.put(key, file, {
      contentType: fileType,
      isPublic: true,
    });

    // Get the public URL for the uploaded file
    const url = await this.storageService.getPublicUrl(key);

    // Save the blob metadata in the database
    const blob = await this.prisma.blob.create({
      data: {
        id: blobId,
        key,
        name: input.name,
        mimeType: fileType,
        size: file.length,
        type: input.type,
        url,
        createdById: userId,
        documentId: input.documentId,
        workspaceId: input.workspaceId,
      },
    });

    return {
      id: blob.id,
      key: blob.key,
      name: blob.name,
      mimeType: blob.mimeType,
      size: blob.size,
      type: blob.type as BlobType,
      url: blob.url,
      createdBy: blob.createdById,
      documentId: blob.documentId,
      workspaceId: blob.workspaceId,
      createdAt: blob.createdAt,
    };
  }

  async getBlob(userId: string, blobId: string): Promise<Blob> {
    const blob = await this.prisma.blob.findUnique({
      where: { id: blobId },
    });

    if (!blob) {
      throw new NotFoundException(`Blob with ID ${blobId} not found`);
    }

    // Check access permissions
    if (blob.documentId) {
      const hasDocumentAccess = await this.checkDocumentAccess(userId, blob.documentId);
      if (!hasDocumentAccess) {
        throw new UnauthorizedException('You do not have access to this document');
      }
    }

    if (blob.workspaceId) {
      const hasWorkspaceAccess = await this.checkWorkspaceAccess(userId, blob.workspaceId);
      if (!hasWorkspaceAccess) {
        throw new UnauthorizedException('You do not have access to this workspace');
      }
    }

    return {
      id: blob.id,
      key: blob.key,
      name: blob.name,
      mimeType: blob.mimeType,
      size: blob.size,
      type: blob.type as BlobType,
      url: blob.url,
      createdBy: blob.createdById,
      documentId: blob.documentId,
      workspaceId: blob.workspaceId,
      createdAt: blob.createdAt,
    };
  }

  async deleteBlob(userId: string, blobId: string): Promise<boolean> {
    const blob = await this.prisma.blob.findUnique({
      where: { id: blobId },
    });

    if (!blob) {
      throw new NotFoundException(`Blob with ID ${blobId} not found`);
    }

    // Check access permissions - only the creator can delete a blob
    if (blob.createdById !== userId) {
      throw new UnauthorizedException('You do not have permission to delete this blob');
    }

    // Delete from storage
    await this.storageService.delete(blob.key);

    // Delete from database
    await this.prisma.blob.delete({
      where: { id: blobId },
    });

    return true;
  }

  async getDocumentBlobs(userId: string, documentId: string): Promise<Blob[]> {
    // Check if the document exists and user has access
    const hasAccess = await this.checkDocumentAccess(userId, documentId);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to this document');
    }

    const blobs = await this.prisma.blob.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return blobs.map((blob) => ({
      id: blob.id,
      key: blob.key,
      name: blob.name,
      mimeType: blob.mimeType,
      size: blob.size,
      type: blob.type as BlobType,
      url: blob.url,
      createdBy: blob.createdById,
      documentId: blob.documentId,
      workspaceId: blob.workspaceId,
      createdAt: blob.createdAt,
    }));
  }

  async getWorkspaceBlobs(userId: string, workspaceId: string): Promise<Blob[]> {
    // Check if the workspace exists and user has access
    const hasAccess = await this.checkWorkspaceAccess(userId, workspaceId);
    
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have access to this workspace');
    }

    const blobs = await this.prisma.blob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return blobs.map((blob) => ({
      id: blob.id,
      key: blob.key,
      name: blob.name,
      mimeType: blob.mimeType,
      size: blob.size,
      type: blob.type as BlobType,
      url: blob.url,
      createdBy: blob.createdById,
      documentId: blob.documentId,
      workspaceId: blob.workspaceId,
      createdAt: blob.createdAt,
    }));
  }

  // Helper methods
  private getFileExtension(filename: string): string | null {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : null;
  }

  // Access control helpers
  private async checkDocumentAccess(userId: string, documentId: string): Promise<boolean> {
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

  private async checkWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const workspaceMember = await this.prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    return !!workspaceMember;
  }
}
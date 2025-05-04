import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { ConfigService } from '../../../base/config/config.service';
import { randomBytes } from 'crypto';
import { PublicShareLink, CreateShareLinkInput, UpdateShareLinkInput } from './types';
import { PermissionService } from '../../permission/service';
import { PermissionLevel, ResourceType } from '../../permission/types';
import { WorkspaceActivityService } from '../../workspace/activity/service';
import { ActivityType } from '../../workspace/types';

@Injectable()
export class DocumentSharingService {
  private readonly logger = new Logger(DocumentSharingService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
    private readonly activityService: WorkspaceActivityService,
  ) {
    this.baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Create a public share link for a document
   */
  async createShareLink(
    userId: string,
    input: CreateShareLinkInput,
  ): Promise<PublicShareLink> {
    this.logger.debug(`Creating share link for document ${input.documentId}`);

    // Check if user has necessary permissions
    await this.permissionService.enforcePermission(
      input.documentId,
      ResourceType.DOCUMENT,
      userId,
      PermissionLevel.WRITE,
    );

    // Get document to check if it exists and to get workspaceId
    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId },
      select: { 
        id: true, 
        workspaceId: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${input.documentId} not found`);
    }

    // Generate random token
    const token = randomBytes(16).toString('hex');

    // Calculate expiration date
    const expirationDays = input.expirationDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create share link
    const shareLink = await this.prisma.documentShareLink.create({
      data: {
        documentId: input.documentId,
        token,
        permissionLevel: input.permissionLevel || PermissionLevel.READ,
        allowAnonymous: input.allowAnonymous !== undefined ? input.allowAnonymous : true,
        expiresAt,
        createdBy: userId,
        accessCount: 0,
      },
    });

    // Log activity if workspaceId is available
    if (document.workspaceId) {
      await this.activityService.createActivity(
        document.workspaceId,
        userId,
        ActivityType.DOCUMENT_SHARED,
        input.documentId,
        `Document shared with ${input.permissionLevel || PermissionLevel.READ} permission`,
      );
    }

    // Return share link with full URL
    return {
      ...shareLink,
      url: `${this.baseUrl}/share/${token}`,
    };
  }

  /**
   * Get share links for a document
   */
  async getShareLinks(documentId: string, userId: string): Promise<PublicShareLink[]> {
    this.logger.debug(`Getting share links for document ${documentId}`);
  
    // Check if user has necessary permissions
    await this.permissionService.enforcePermission(
      documentId,
      ResourceType.DOCUMENT,
      userId,
      PermissionLevel.READ,
    );
  
    // Get share links
    const shareLinks = await this.prisma.documentShareLink.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  
    // Add full URL to each share link
    return shareLinks.map((link: any) => ({
      ...link,
      url: `${this.baseUrl}/share/${link.token}`,
    }));
  }

  /**
   * Update a share link
   */
  async updateShareLink(
    id: string,
    userId: string,
    input: UpdateShareLinkInput,
  ): Promise<PublicShareLink> {
    this.logger.debug(`Updating share link ${id}`);

    // Get share link to check if it exists and if the user created it
    const shareLink = await this.prisma.documentShareLink.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    if (!shareLink) {
      throw new NotFoundException(`Share link with ID ${id} not found`);
    }

    // Check if user has necessary permissions
    await this.permissionService.enforcePermission(
      shareLink.documentId,
      ResourceType.DOCUMENT,
      userId,
      PermissionLevel.WRITE,
    );

    // Update share link
    const updatedShareLink = await this.prisma.documentShareLink.update({
      where: { id },
      data: {
        permissionLevel: input.permissionLevel,
        allowAnonymous: input.allowAnonymous,
        expiresAt: input.expiresAt,
      },
    });

    // Log activity if workspaceId is available
    if (shareLink.document?.workspaceId) {
      await this.activityService.createActivity(
        shareLink.document.workspaceId,
        userId,
        ActivityType.DOCUMENT_SHARED,
        shareLink.documentId,
        `Document share link updated`,
      );
    }

    // Return updated share link with full URL
    return {
      ...updatedShareLink,
      url: `${this.baseUrl}/share/${updatedShareLink.token}`,
    };
  }

  /**
   * Delete a share link
   */
  async deleteShareLink(id: string, userId: string): Promise<boolean> {
    this.logger.debug(`Deleting share link ${id}`);

    // Get share link to check if it exists and if the user created it
    const shareLink = await this.prisma.documentShareLink.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    if (!shareLink) {
      throw new NotFoundException(`Share link with ID ${id} not found`);
    }

    // Check if user has necessary permissions
    await this.permissionService.enforcePermission(
      shareLink.documentId,
      ResourceType.DOCUMENT,
      userId,
      PermissionLevel.WRITE,
    );

    // Delete share link
    await this.prisma.documentShareLink.delete({
      where: { id },
    });

    // Log activity if workspaceId is available
    if (shareLink.document?.workspaceId) {
      await this.activityService.createActivity(
        shareLink.document.workspaceId,
        userId,
        ActivityType.DOCUMENT_SHARED,
        shareLink.documentId,
        `Document share link deleted`,
      );
    }

    return true;
  }

  /**
   * Get document by share token
   */
  async getDocumentByShareToken(token: string): Promise<any> {
    this.logger.debug(`Getting document by share token ${token}`);

    // Find share link by token
    const shareLink = await this.prisma.documentShareLink.findFirst({
      where: { token },
      include: {
        document: true,
      },
    });

    if (!shareLink) {
      throw new NotFoundException('Invalid share link');
    }

    // Check if share link has expired
    if (shareLink.expiresAt < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    // Update last accessed date and access count
    await this.prisma.documentShareLink.update({
      where: { id: shareLink.id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: shareLink.accessCount + 1,
      },
    });

    return {
      document: shareLink.document,
      permissionLevel: shareLink.permissionLevel,
      allowAnonymous: shareLink.allowAnonymous,
    };
  }

  /**
   * Check if a user can access a document via a share link
   */
  async checkShareAccess(
    documentId: string,
    token: string,
    requiredPermission: PermissionLevel,
    isAuthenticated: boolean,
  ): Promise<boolean> {
    this.logger.debug(`Checking share access for document ${documentId} with token ${token}`);
  
    // Find share link by token and document ID
    const shareLink = await this.prisma.documentShareLink.findFirst({
      where: {
        token,
        documentId,
      },
    });
  
    if (!shareLink) {
      return false;
    }
  
    // Check if share link has expired
    if (shareLink.expiresAt < new Date()) {
      return false;
    }
  
    // If anonymous access is not allowed and user is not authenticated, deny access
    if (!shareLink.allowAnonymous && !isAuthenticated) {
      return false;
    }
  
    // Map permission levels to numeric values for comparison
    const permissionValue: Record<PermissionLevel, number> = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.COMMENT]: 2,
      [PermissionLevel.WRITE]: 3,
      [PermissionLevel.ADMIN]: 4,
      [PermissionLevel.OWNER]: 5,
    };
  
    // Check if share link has sufficient permission level
    return permissionValue[shareLink.permissionLevel as PermissionLevel] >= permissionValue[requiredPermission];
  }
}
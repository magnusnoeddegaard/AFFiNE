import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { PublicAccessLevel, PublicWorkspaceInfo, WorkspaceVisibility } from '../types';
import { ConfigService } from '../../../base/config/config.service';
import { randomBytes } from 'crypto';

@Injectable()
export class PublicSharingService {
  private readonly logger = new Logger(PublicSharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get public information for a workspace
   */
  async getPublicWorkspaceInfo(workspaceId: string): Promise<PublicWorkspaceInfo | null> {
    this.logger.debug(`Getting public info for workspace ${workspaceId}`);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Only return public info if workspace is public or restricted
    if (workspace.visibility === WorkspaceVisibility.PRIVATE) {
      throw new UnauthorizedException('This workspace is not publicly accessible');
    }

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      avatarUrl: workspace.avatarUrl,
      publicAccessLevel: workspace.publicAccessLevel as PublicAccessLevel,
      publicJoinable: workspace.publicJoinable,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  /**
   * Update public sharing settings for a workspace
   */
  async updatePublicSharingSettings(
    workspaceId: string,
    publicAccessLevel: PublicAccessLevel,
    publicJoinable: boolean,
  ): Promise<void> {
    this.logger.debug(`Updating public sharing settings for workspace ${workspaceId}`);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        publicAccessLevel,
        publicJoinable,
      },
    });
  }

  /**
   * Check if a workspace is accessible publicly with a given access level
   */
  async isWorkspacePubliclyAccessible(
    workspaceId: string,
    requiredAccessLevel: PublicAccessLevel,
  ): Promise<boolean> {
    this.logger.debug(`Checking public access for workspace ${workspaceId}`);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        visibility: true,
        publicAccessLevel: true,
      },
    });

    if (!workspace) {
      return false;
    }

    if (workspace.visibility === WorkspaceVisibility.PRIVATE) {
      return false;
    }

    // Map access levels to numeric values for comparison
    const accessLevelValue = {
      [PublicAccessLevel.NONE]: 0,
      [PublicAccessLevel.READ]: 1,
      [PublicAccessLevel.COMMENT]: 2,
      [PublicAccessLevel.WRITE]: 3,
    };

    // Compare the workspace's public access level with the required level
    return accessLevelValue[workspace.publicAccessLevel as PublicAccessLevel] >= 
           accessLevelValue[requiredAccessLevel];
  }

  /**
   * Join a public workspace
   */
  async joinPublicWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    this.logger.debug(`User ${userId} attempting to join public workspace ${workspaceId}`);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        publicJoinable: true,
        visibility: true,
      },
    });

    if (!workspace || 
        !workspace.publicJoinable || 
        workspace.visibility === WorkspaceVisibility.PRIVATE) {
      return false;
    }

    // Check if user is already a member
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (existingMember) {
      return true; // Already a member
    }

    // Add user as a member
    await this.prisma.$transaction([
      // Create workspace member entry
      this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role: 'MEMBER',
        },
      }),
      
      // Set appropriate permission
      this.prisma.permission.create({
        data: {
          resourceId: workspaceId,
          resourceType: 'WORKSPACE',
          userId,
          level: 'WRITE',
        },
      }),

      // Log activity
      this.prisma.workspaceActivity.create({
        data: {
          workspaceId,
          userId,
          activityType: 'MEMBER_JOINED',
          details: 'Joined via public link',
        },
      }),
    ]);

    return true;
  }
}
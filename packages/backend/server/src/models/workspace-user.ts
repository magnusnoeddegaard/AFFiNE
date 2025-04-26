import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { WorkspaceUser, WorkspaceUserRole, WorkspaceNotificationSettings } from './common';

/**
 * WorkspaceUser model for workspace-user relation operations
 */
@Injectable()
export class WorkspaceUserModel extends BaseModel<WorkspaceUser> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.workspaceUser;
  }

  /**
   * Find workspace membership by workspace ID and user ID
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @returns The workspace-user relation
   */
  async findByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceUser | null> {
    return this.model.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });
  }

  /**
   * Find all members of a workspace
   * @param workspaceId The workspace ID
   * @param options Query options
   * @returns The workspace-user relations
   */
  async findByWorkspace(workspaceId: string, options: any = {}): Promise<WorkspaceUser[]> {
    return this.findMany({ workspaceId }, options);
  }

  /**
   * Find all workspaces a user is a member of
   * @param userId The user ID
   * @param options Query options
   * @returns The workspace-user relations
   */
  async findByUser(userId: string, options: any = {}): Promise<WorkspaceUser[]> {
    return this.findMany({ userId }, options);
  }

  /**
   * Add a user to a workspace
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @param role The user's role
   * @param invitedBy Optional ID of the user who sent the invitation
   * @returns The created workspace-user relation
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole,
    invitedBy?: string,
  ): Promise<WorkspaceUser> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (existing) {
      return this.update(existing.id, {
        role,
        invitedBy: invitedBy || existing.invitedBy,
        invitedAt: existing.invitedAt || new Date(),
        joinedAt: new Date(),
      });
    }
    
    return this.create({
      workspaceId,
      userId,
      role,
      invitedBy,
      invitedAt: invitedBy ? new Date() : null,
      joinedAt: new Date(),
      settings: {
        showOnHomepage: true,
        defaultDocumentView: 'DOC',
        notificationSettings: {
          documentUpdates: true,
          comments: true,
          mentions: true,
          invites: true,
        },
      },
    });
  }

  /**
   * Remove a user from a workspace
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @returns Whether the user was removed
   */
  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (!existing) {
      return false;
    }
    
    // Check if this is the owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    
    if (workspace && workspace.ownerId === userId) {
      throw new Error('Cannot remove the workspace owner');
    }
    
    await this.delete(existing.id);
    return true;
  }

  /**
   * Update a user's role in a workspace
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @param role The new role
   * @returns The updated workspace-user relation
   */
  async updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole,
  ): Promise<WorkspaceUser> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (!existing) {
      throw new Error(`User ${userId} is not a member of workspace ${workspaceId}`);
    }
    
    // Check if this is the owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    
    if (workspace && workspace.ownerId === userId && role !== WorkspaceUserRole.OWNER) {
      throw new Error('Cannot change the role of the workspace owner');
    }
    
    return this.update(existing.id, { role });
  }

  /**
   * Update a user's workspace settings
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @param settings The new settings
   * @returns The updated workspace-user relation
   */
  async updateSettings(
    workspaceId: string,
    userId: string,
    settings: any,
  ): Promise<WorkspaceUser> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (!existing) {
      throw new Error(`User ${userId} is not a member of workspace ${workspaceId}`);
    }
    
    return this.update(existing.id, {
      settings: {
        ...existing.settings,
        ...settings,
      },
    });
  }

  /**
   * Update workspace notification settings
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @param settings The new notification settings
   * @returns The updated workspace-user relation
   */
  async updateNotificationSettings(
    workspaceId: string,
    userId: string,
    settings: Partial<WorkspaceNotificationSettings>,
  ): Promise<WorkspaceUser> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (!existing) {
      throw new Error(`User ${userId} is not a member of workspace ${workspaceId}`);
    }
    
    return this.update(existing.id, {
      settings: {
        ...existing.settings,
        notificationSettings: {
          ...existing.settings.notificationSettings,
          ...settings,
        },
      },
    });
  }

  /**
   * Create a workspace invitation
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @param role The user's role
   * @param invitedBy The user ID who sent the invitation
   * @returns The created invitation
   */
  async createInvitation(
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole,
    invitedBy: string,
  ): Promise<WorkspaceUser> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (existing) {
      return this.update(existing.id, {
        role,
        invitedBy,
        invitedAt: new Date(),
        joinedAt: null,
      });
    }
    
    return this.create({
      workspaceId,
      userId,
      role,
      invitedBy,
      invitedAt: new Date(),
      joinedAt: null,
      settings: {
        showOnHomepage: true,
        defaultDocumentView: 'DOC',
        notificationSettings: {
          documentUpdates: true,
          comments: true,
          mentions: true,
          invites: true,
        },
      },
    });
  }

  /**
   * Accept a workspace invitation
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @returns The updated workspace-user relation
   */
  async acceptInvitation(workspaceId: string, userId: string): Promise<WorkspaceUser> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (!existing) {
      throw new Error(`No invitation found for user ${userId} in workspace ${workspaceId}`);
    }
    
    if (existing.joinedAt) {
      throw new Error(`User ${userId} is already a member of workspace ${workspaceId}`);
    }
    
    return this.update(existing.id, {
      joinedAt: new Date(),
    });
  }

  /**
   * Reject a workspace invitation
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @returns Whether the invitation was rejected
   */
  async rejectInvitation(workspaceId: string, userId: string): Promise<boolean> {
    const existing = await this.findByWorkspaceAndUser(workspaceId, userId);
    
    if (!existing) {
      return false;
    }
    
    if (existing.joinedAt) {
      throw new Error(`User ${userId} is already a member of workspace ${workspaceId}`);
    }
    
    await this.delete(existing.id);
    return true;
  }
}
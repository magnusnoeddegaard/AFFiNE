import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { ConfigService } from '../../base/config/config.service';
import { PermissionService } from '../permission/service';
import { 
  AddWorkspaceMemberInput, 
  CreateWorkspaceInput, 
  InvitationStatus, 
  InviteToWorkspaceInput, 
  RespondToInvitationInput, 
  UpdateWorkspaceInput, 
  UpdateWorkspaceMemberRoleInput, 
  WorkspaceMemberRole 
} from './types';
import { PermissionLevel, ResourceType } from '../permission/types';
import { randomUUID } from 'crypto';
import { MutexService } from '../../base/mutex/mutex.service';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
    private readonly mutexService: MutexService,
  ) {}

  async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    this.logger.debug(`Creating workspace for user ${userId}`);
    
    return this.prisma.$transaction(async (tx) => {
      // Create the workspace
      const workspace = await tx.workspace.create({
        data: {
          id: randomUUID(),
          name: input.name,
          description: input.description,
          visibility: input.visibility,
          ownerId: userId,
        },
      });

      // Create workspace member entry for the owner
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceMemberRole.OWNER,
        },
      });

      // Set permission for the owner
      await tx.permission.create({
        data: {
          resourceId: workspace.id,
          resourceType: ResourceType.WORKSPACE,
          userId,
          level: PermissionLevel.OWNER,
        },
      });

      return workspace;
    });
  }

  async getWorkspace(id: string) {
    this.logger.debug(`Getting workspace ${id}`);
    
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  async updateWorkspace(id: string, userId: string, input: UpdateWorkspaceInput) {
    this.logger.debug(`Updating workspace ${id}`);
    
    // Check if user has admin permission
    await this.permissionService.enforcePermission(
      id,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN,
    );

    return this.prisma.workspace.update({
      where: { id },
      data: input,
    });
  }

  async deleteWorkspace(id: string, userId: string) {
    this.logger.debug(`Deleting workspace ${id}`);
    
    // Check if user has owner permission
    await this.permissionService.enforcePermission(
      id,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.OWNER,
    );

    // Use mutex to prevent race conditions
    return this.mutexService.runWithLock(`workspace:${id}:delete`, async () => {
      return this.prisma.$transaction(async (tx) => {
        // Delete all permissions for the workspace
        await tx.permission.deleteMany({
          where: {
            resourceId: id,
            resourceType: ResourceType.WORKSPACE,
          },
        });

        // Delete all workspace members
        await tx.workspaceMember.deleteMany({
          where: { workspaceId: id },
        });

        // Delete all workspace invitations
        await tx.workspaceInvitation.deleteMany({
          where: { workspaceId: id },
        });

        // Delete documents in the workspace
        await tx.document.deleteMany({
          where: { workspaceId: id },
        });

        // Delete the workspace
        return tx.workspace.delete({
          where: { id },
        });
      });
    });
  }

  async getUserWorkspaces(userId: string) {
    this.logger.debug(`Getting workspaces for user ${userId}`);
    
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    return memberships.map((m) => m.workspace);
  }

  async getWorkspaceMembers(workspaceId: string) {
    this.logger.debug(`Getting members for workspace ${workspaceId}`);
    
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });
  }

  async addWorkspaceMember(userId: string, input: AddWorkspaceMemberInput) {
    this.logger.debug(`Adding member ${input.userId} to workspace ${input.workspaceId}`);
    
    // Check if user has admin permission
    await this.permissionService.enforcePermission(
      input.workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN,
    );

    // Check if member role is OWNER and current user is owner
    if (input.role === WorkspaceMemberRole.OWNER) {
      const check = await this.permissionService.checkPermission(
        input.workspaceId,
        ResourceType.WORKSPACE,
        userId,
        PermissionLevel.OWNER,
      );

      if (!check.hasPermission) {
        throw new ForbiddenException('Only the workspace owner can assign owner role');
      }
    }

    // Check if user is already a member
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.userId,
      },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a member of this workspace');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create workspace member entry
      const member = await tx.workspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role,
        },
      });

      // Set appropriate permission level
      let permissionLevel = PermissionLevel.WRITE;
      if (input.role === WorkspaceMemberRole.ADMIN) {
        permissionLevel = PermissionLevel.ADMIN;
      } else if (input.role === WorkspaceMemberRole.OWNER) {
        permissionLevel = PermissionLevel.OWNER;
      }

      await tx.permission.create({
        data: {
          resourceId: input.workspaceId,
          resourceType: ResourceType.WORKSPACE,
          userId: input.userId,
          level: permissionLevel,
        },
      });

      return member;
    });
  }

  async updateWorkspaceMemberRole(
    workspaceId: string,
    memberId: string,
    currentUserId: string,
    input: UpdateWorkspaceMemberRoleInput,
  ) {
    this.logger.debug(`Updating role for member ${memberId} in workspace ${workspaceId}`);
    
    // Get the current member to update
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: memberId,
      },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Check permission for role change
    if (input.role === WorkspaceMemberRole.OWNER) {
      // Only the current owner can transfer ownership
      await this.permissionService.enforcePermission(
        workspaceId,
        ResourceType.WORKSPACE,
        currentUserId,
        PermissionLevel.OWNER,
      );
    } else {
      // Admins can change non-owner roles
      await this.permissionService.enforcePermission(
        workspaceId,
        ResourceType.WORKSPACE,
        currentUserId,
        PermissionLevel.ADMIN,
      );

      // But if the target member is an owner, only they can demote themselves
      if (member.role === WorkspaceMemberRole.OWNER && memberId !== currentUserId) {
        throw new ForbiddenException('You cannot change the role of the workspace owner');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If transferring ownership, update the previous owner's role
      if (input.role === WorkspaceMemberRole.OWNER) {
        // Find the current owner
        const currentOwner = await tx.workspaceMember.findFirst({
          where: {
            workspaceId,
            role: WorkspaceMemberRole.OWNER,
          },
        });

        if (currentOwner) {
          // Demote the current owner to admin
          await tx.workspaceMember.update({
            where: { id: currentOwner.id },
            data: { role: WorkspaceMemberRole.ADMIN },
          });

          // Update permission for the previous owner
          await tx.permission.updateMany({
            where: {
              resourceId: workspaceId,
              resourceType: ResourceType.WORKSPACE,
              userId: currentOwner.userId,
            },
            data: { level: PermissionLevel.ADMIN },
          });
        }

        // Update the workspace owner field
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { ownerId: memberId },
        });
      }

      // Update the member's role
      const updatedMember = await tx.workspaceMember.update({
        where: { id: member.id },
        data: { role: input.role },
      });

      // Update permission level
      let permissionLevel = PermissionLevel.WRITE;
      if (input.role === WorkspaceMemberRole.ADMIN) {
        permissionLevel = PermissionLevel.ADMIN;
      } else if (input.role === WorkspaceMemberRole.OWNER) {
        permissionLevel = PermissionLevel.OWNER;
      }

      await tx.permission.updateMany({
        where: {
          resourceId: workspaceId,
          resourceType: ResourceType.WORKSPACE,
          userId: memberId,
        },
        data: { level: permissionLevel },
      });

      return updatedMember;
    });
  }

  async removeWorkspaceMember(workspaceId: string, memberId: string, currentUserId: string) {
    this.logger.debug(`Removing member ${memberId} from workspace ${workspaceId}`);
    
    // Get the member to remove
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: memberId,
      },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Cannot remove the owner
    if (member.role === WorkspaceMemberRole.OWNER) {
      throw new ForbiddenException('The workspace owner cannot be removed');
    }

    // Check permissions - either the member themselves, or an admin
    if (memberId !== currentUserId) {
      await this.permissionService.enforcePermission(
        workspaceId,
        ResourceType.WORKSPACE,
        currentUserId,
        PermissionLevel.ADMIN,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete member's workspace permissions
      await tx.permission.deleteMany({
        where: {
          resourceId: workspaceId,
          resourceType: ResourceType.WORKSPACE,
          userId: memberId,
        },
      });

      // Delete workspace member entry
      return tx.workspaceMember.delete({
        where: { id: member.id },
      });
    });
  }

  async inviteToWorkspace(currentUserId: string, input: InviteToWorkspaceInput) {
    this.logger.debug(`Inviting ${input.email} to workspace ${input.workspaceId}`);
    
    // Check if user has admin permission
    await this.permissionService.enforcePermission(
      input.workspaceId,
      ResourceType.WORKSPACE,
      currentUserId,
      PermissionLevel.ADMIN,
    );

    // If inviting as owner, check if current user is the owner
    if (input.role === WorkspaceMemberRole.OWNER) {
      const check = await this.permissionService.checkPermission(
        input.workspaceId,
        ResourceType.WORKSPACE,
        currentUserId,
        PermissionLevel.OWNER,
      );

      if (!check.hasPermission) {
        throw new ForbiddenException('Only the workspace owner can invite with owner role');
      }
    }

    // Check if email matches an existing user
    const user = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase() },
    });

    // Check if invitation already exists
    const existingInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: input.workspaceId,
        email: input.email.toLowerCase(),
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ForbiddenException('An invitation has already been sent to this email');
    }

    // Check if user is already a member
    if (user) {
      const existingMember = await this.prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: user.id,
        },
      });

      if (existingMember) {
        throw new ForbiddenException('User is already a member of this workspace');
      }
    }

    // Calculate expiration date (default: 7 days)
    const expirationDays = this.configService.get('INVITATION_EXPIRATION_DAYS', 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create the invitation
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId: input.workspaceId,
        email: input.email.toLowerCase(),
        userId: user?.id,
        invitedBy: currentUserId,
        role: input.role,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
    });

    // TODO: Send invitation email (in future implementation)

    return invitation;
  }

  async getWorkspaceInvitations(workspaceId: string, currentUserId: string) {
    this.logger.debug(`Getting invitations for workspace ${workspaceId}`);
    
    // Check if user has admin permission
    await this.permissionService.enforcePermission(
      workspaceId,
      ResourceType.WORKSPACE,
      currentUserId,
      PermissionLevel.ADMIN,
    );

    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserInvitations(userId: string) {
    this.logger.debug(`Getting invitations for user ${userId}`);
    
    // Get user's email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.workspaceInvitation.findMany({
      where: {
        email: user.email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: { workspace: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToInvitation(invitationId: string, userId: string, input: RespondToInvitationInput) {
    this.logger.debug(`User ${userId} responding to invitation ${invitationId}`);
    
    // Check if invitation exists and is pending
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ForbiddenException('This invitation has already been responded to');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ForbiddenException('This invitation has expired');
    }

    // Get user's email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify the invitation is for this user
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation is not for you');
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        status: input.status,
        respondedAt: new Date(),
        userId: userId, // Set the user ID if it wasn't set before
      },
    });

    // If accepted, add user to workspace
    if (input.status === InvitationStatus.ACCEPTED) {
      await this.addWorkspaceMember(invitation.invitedBy, {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      });
    }

    return updatedInvitation;
  }

  async cancelInvitation(invitationId: string, currentUserId: string) {
    this.logger.debug(`Canceling invitation ${invitationId}`);
    
    // Check if invitation exists
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if user has admin permission for the workspace
    await this.permissionService.enforcePermission(
      invitation.workspaceId,
      ResourceType.WORKSPACE,
      currentUserId,
      PermissionLevel.ADMIN,
    );

    return this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.EXPIRED,
        respondedAt: new Date(),
      },
    });
  }
}
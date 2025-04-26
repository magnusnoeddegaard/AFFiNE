import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { TeamModel } from '../../../models/team';
import { TeamMemberModel } from '../../../models/team-member';
import { PermissionService } from '../../permission/service';
import { PermissionLevel, ResourceType } from '../../permission/types';
import { MutexService } from '../../../base/mutex/mutex.service';
import { 
  CreateTeamInput, 
  UpdateTeamInput, 
  AddTeamMemberInput, 
  UpdateTeamMemberRoleInput,
  TeamMemberRole,
  BulkTeamMemberInput,
} from './types';
import { NotificationService } from '../../notification/notification.service';
import { NotificationType } from '../../notification/types';
import { randomUUID } from 'crypto';
import { User } from '../../../models/user';
import { UserModel } from '../../../models/user';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamModel: TeamModel,
    private readonly teamMemberModel: TeamMemberModel,
    private readonly userModel: UserModel,
    private readonly permissionService: PermissionService,
    private readonly mutexService: MutexService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a team in a workspace
   * @param userId The user creating the team
   * @param input The team creation input
   * @returns The created team
   */
  async createTeam(userId: string, input: CreateTeamInput) {
    this.logger.debug(`Creating team for workspace ${input.workspaceId}`);
    
    // Check if user has ADMIN permission in the workspace
    await this.permissionService.enforcePermission(
      input.workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN,
    );
    
    return this.prisma.$transaction(async (tx) => {
      // Create the team
      const team = await tx.team.create({
        data: {
          id: randomUUID(),
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          leaderId: userId,
          settings: {
            color: input.color || null,
            defaultRole: TeamMemberRole.MEMBER,
            features: {
              privateDocuments: true,
              privateChat: true,
            },
          },
        },
      });
      
      // Add the creator as a team member
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: TeamMemberRole.ADMIN,
          addedBy: userId,
          addedAt: new Date(),
        },
      });
      
      return team;
    });
  }

  /**
   * Get a team by ID
   * @param teamId The team ID
   * @returns The team
   */
  async getTeam(teamId: string) {
    this.logger.debug(`Getting team ${teamId}`);
    
    const team = await this.teamModel.findById(teamId);
    
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }
    
    return team;
  }

  /**
   * Update a team
   * @param teamId The team ID
   * @param userId The user updating the team
   * @param input The update input
   * @returns The updated team
   */
  async updateTeam(teamId: string, userId: string, input: UpdateTeamInput) {
    this.logger.debug(`Updating team ${teamId}`);
    
    const team = await this.getTeam(teamId);
    
    // User must be workspace admin or team leader
    await this.enforceTeamAdminPermission(team.workspaceId, teamId, userId);
    
    return this.teamModel.update(teamId, {
      name: input.name,
      description: input.description,
      ...(input.color ? { 
        settings: {
          ...team.settings,
          color: input.color,
        }
      } : {}),
    });
  }

  /**
   * Delete a team
   * @param teamId The team ID
   * @param userId The user deleting the team
   * @returns The deleted team
   */
  async deleteTeam(teamId: string, userId: string) {
    this.logger.debug(`Deleting team ${teamId}`);
    
    const team = await this.getTeam(teamId);
    
    // Check if user has ADMIN permission in the workspace
    await this.permissionService.enforcePermission(
      team.workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN,
    );
    
    // Use mutex to prevent race conditions
    return this.mutexService.runWithLock(`team:${teamId}:delete`, async () => {
      return this.prisma.$transaction(async (tx) => {
        // Delete all team members
        await tx.teamMember.deleteMany({
          where: { teamId },
        });
        
        // Delete the team
        return tx.team.delete({
          where: { id: teamId },
        });
      });
    });
  }

  /**
   * Get all teams in a workspace
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @returns The teams
   */
  async getWorkspaceTeams(workspaceId: string, userId: string) {
    this.logger.debug(`Getting teams for workspace ${workspaceId}`);
    
    // Check if user has access to the workspace
    await this.permissionService.enforcePermission(
      workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.READ,
    );
    
    return this.teamModel.findByWorkspace(workspaceId);
  }

  /**
   * Get teams that a user is a member of
   * @param userId The user ID
   * @returns The teams
   */
  async getUserTeams(userId: string) {
    this.logger.debug(`Getting teams for user ${userId}`);
    
    return this.teamModel.findByMember(userId);
  }

  /**
   * Get members of a team
   * @param teamId The team ID
   * @param userId The requesting user ID
   * @returns The team members
   */
  async getTeamMembers(teamId: string, userId: string) {
    this.logger.debug(`Getting members for team ${teamId}`);
    
    const team = await this.getTeam(teamId);
    
    // Check if user has access to the workspace
    await this.permissionService.enforcePermission(
      team.workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.READ,
    );
    
    const members = await this.teamMemberModel.findByTeam(teamId, {
      include: { user: true },
    });
    
    return members;
  }

  /**
   * Add a member to a team
   * @param userId The user adding the member
   * @param input The member input
   * @returns The added team member
   */
  async addTeamMember(userId: string, input: AddTeamMemberInput) {
    this.logger.debug(`Adding member ${input.userId} to team ${input.teamId}`);
    
    const team = await this.getTeam(input.teamId);
    
    // Check if user is workspace admin or team admin
    await this.enforceTeamAdminPermission(team.workspaceId, input.teamId, userId);
    
    // Check if the user to add is a member of the workspace
    const workspaceMember = await this.prisma.workspaceUser.findFirst({
      where: {
        workspaceId: team.workspaceId,
        userId: input.userId,
      },
    });
    
    if (!workspaceMember) {
      throw new ForbiddenException(`User ${input.userId} is not a member of the workspace`);
    }
    
    // Add the user to the team
    const member = await this.teamMemberModel.addMember(
      input.teamId,
      input.userId,
      input.role || TeamMemberRole.MEMBER,
      userId,
    );
    
    // Send a notification to the user
    const user = await this.userModel.findById(userId);
    await this.notificationService.createNotification(
      input.userId,
      NotificationType.TEAM_INVITATION,
      'Team invitation',
      `You have been added to the team "${team.name}" by ${user?.name || 'a team admin'}`,
      {
        teamId: input.teamId,
        teamName: team.name,
        inviterId: userId,
        workspaceId: team.workspaceId,
      },
      true, // Send email
    );
    
    return member;
  }

  /**
   * Update a team member's role
   * @param teamId The team ID
   * @param memberId The member's user ID
   * @param userId The user updating the role
   * @param input The role input
   * @returns The updated team member
   */
  async updateTeamMemberRole(
    teamId: string,
    memberId: string,
    userId: string,
    input: UpdateTeamMemberRoleInput,
  ) {
    this.logger.debug(`Updating role for member ${memberId} in team ${teamId}`);
    
    const team = await this.getTeam(teamId);
    
    // Check if user is workspace admin or team admin
    await this.enforceTeamAdminPermission(team.workspaceId, teamId, userId);
    
    // Get the current role
    const member = await this.teamMemberModel.findByTeamAndUser(teamId, memberId);
    
    if (!member) {
      throw new NotFoundException(`User ${memberId} is not a member of team ${teamId}`);
    }
    
    // Update the role
    const updatedMember = await this.teamMemberModel.updateRole(
      teamId,
      memberId,
      input.role,
    );
    
    // If promoting to ADMIN, update the team leader if needed
    if (input.role === TeamMemberRole.ADMIN && !team.leaderId) {
      await this.teamModel.updateLeader(teamId, memberId);
    }
    
    // Send a notification to the user
    await this.notificationService.createNotification(
      memberId,
      NotificationType.TEAM_ROLE_CHANGED,
      'Team role updated',
      `Your role in the team "${team.name}" has been updated to ${input.role}`,
      {
        teamId,
        teamName: team.name,
        role: input.role,
        updatedBy: userId,
      },
    );
    
    return updatedMember;
  }

  /**
   * Remove a member from a team
   * @param teamId The team ID
   * @param memberId The member's user ID
   * @param userId The user removing the member
   * @returns True if successful
   */
  async removeTeamMember(teamId: string, memberId: string, userId: string) {
    this.logger.debug(`Removing member ${memberId} from team ${teamId}`);
    
    const team = await this.getTeam(teamId);
    
    // Check if user is workspace admin or team admin
    await this.enforceTeamAdminPermission(team.workspaceId, teamId, userId);
    
    // Cannot remove the team leader
    if (team.leaderId === memberId) {
      throw new ForbiddenException('Cannot remove the team leader');
    }
    
    // Remove the member
    const result = await this.teamMemberModel.removeMember(teamId, memberId);
    
    // Send a notification to the user
    if (result) {
      await this.notificationService.createNotification(
        memberId,
        NotificationType.TEAM_ROLE_CHANGED,
        'Removed from team',
        `You have been removed from the team "${team.name}"`,
        {
          teamId,
          teamName: team.name,
          removedBy: userId,
        },
      );
    }
    
    return result;
  }

  /**
   * Add multiple members to a team
   * @param userId The user adding the members
   * @param input The bulk member input
   * @returns Array of added members
   */
  async addTeamMembers(userId: string, input: BulkTeamMemberInput) {
    this.logger.debug(`Adding ${input.userIds.length} members to team ${input.teamId}`);
    
    const team = await this.getTeam(input.teamId);
    
    // Check if user is workspace admin or team admin
    await this.enforceTeamAdminPermission(team.workspaceId, input.teamId, userId);
    
    // Verify all users are workspace members
    const workspaceMembers = await this.prisma.workspaceUser.findMany({
      where: {
        workspaceId: team.workspaceId,
        userId: { in: input.userIds },
      },
      select: { userId: true },
    });
    
    const validUserIds = workspaceMembers.map(m => m.userId);
    
    if (validUserIds.length !== input.userIds.length) {
      throw new ForbiddenException('Some users are not members of the workspace');
    }
    
    // Add the members
    const members = await this.teamMemberModel.addMembers(
      input.teamId,
      validUserIds,
      input.role || TeamMemberRole.MEMBER,
      userId,
    );
    
    // Send notifications to all users
    const user = await this.userModel.findById(userId);
    for (const memberId of validUserIds) {
      await this.notificationService.createNotification(
        memberId,
        NotificationType.TEAM_INVITATION,
        'Team invitation',
        `You have been added to the team "${team.name}" by ${user?.name || 'a team admin'}`,
        {
          teamId: input.teamId,
          teamName: team.name,
          inviterId: userId,
          workspaceId: team.workspaceId,
        },
        true, // Send email
      );
    }
    
    return members;
  }

  /**
   * Remove multiple members from a team
   * @param teamId The team ID
   * @param userIds The member user IDs
   * @param userId The user removing the members
   * @returns Number of members removed
   */
  async removeTeamMembers(teamId: string, userIds: string[], userId: string) {
    this.logger.debug(`Removing ${userIds.length} members from team ${teamId}`);
    
    const team = await this.getTeam(teamId);
    
    // Check if user is workspace admin or team admin
    await this.enforceTeamAdminPermission(team.workspaceId, teamId, userId);
    
    // Cannot remove the team leader
    if (team.leaderId && userIds.includes(team.leaderId)) {
      throw new ForbiddenException('Cannot remove the team leader');
    }
    
    // Remove the members
    const count = await this.teamMemberModel.removeMembers(teamId, userIds);
    
    // Send notifications to all users
    for (const memberId of userIds) {
      await this.notificationService.createNotification(
        memberId,
        NotificationType.TEAM_ROLE_CHANGED,
        'Removed from team',
        `You have been removed from the team "${team.name}"`,
        {
          teamId,
          teamName: team.name,
          removedBy: userId,
        },
      );
    }
    
    return count;
  }

  /**
   * Transfer team leadership
   * @param teamId The team ID
   * @param newLeaderId The new leader's user ID
   * @param userId The user transferring leadership
   * @returns The updated team
   */
  async transferTeamLeadership(teamId: string, newLeaderId: string, userId: string) {
    this.logger.debug(`Transferring leadership of team ${teamId} to ${newLeaderId}`);
    
    const team = await this.getTeam(teamId);
    
    // Check if user is workspace admin or current team leader
    if (team.leaderId !== userId) {
      await this.permissionService.enforcePermission(
        team.workspaceId,
        ResourceType.WORKSPACE,
        userId,
        PermissionLevel.ADMIN,
      );
    }
    
    // Verify the new leader is a team member
    const member = await this.teamMemberModel.findByTeamAndUser(teamId, newLeaderId);
    
    if (!member) {
      throw new NotFoundException(`User ${newLeaderId} is not a member of team ${teamId}`);
    }
    
    // Transfer leadership
    try {
      await this.teamMemberModel.transferLeadership(teamId, newLeaderId);
    } catch (error) {
      throw new ForbiddenException(`Failed to transfer leadership: ${error.message}`);
    }
    
    // Update the team
    const updatedTeam = await this.teamModel.updateLeader(teamId, newLeaderId);
    
    // Send notifications to the new leader
    await this.notificationService.createNotification(
      newLeaderId,
      NotificationType.TEAM_ROLE_CHANGED,
      'Team leadership transferred',
      `You are now the leader of the team "${team.name}"`,
      {
        teamId,
        teamName: team.name,
        previousLeaderId: team.leaderId,
        transferredBy: userId,
      },
    );
    
    return updatedTeam;
  }

  /**
   * Check if a user is a member of a team
   * @param teamId The team ID
   * @param userId The user ID
   * @returns True if the user is a member
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.teamMemberModel.findByTeamAndUser(teamId, userId);
    return !!member;
  }

  /**
   * Check if a user is a team admin or workspace admin
   * @param workspaceId The workspace ID
   * @param teamId The team ID
   * @param userId The user ID
   * @returns True if the user is a team admin
   */
  async isTeamAdmin(workspaceId: string, teamId: string, userId: string): Promise<boolean> {
    // Check if user is workspace admin
    const workspaceCheck = await this.permissionService.checkPermission(
      workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN,
    );
    
    if (workspaceCheck.hasPermission) {
      return true;
    }
    
    // Check if user is team leader
    const team = await this.getTeam(teamId);
    if (team.leaderId === userId) {
      return true;
    }
    
    // Check if user is team admin
    const member = await this.teamMemberModel.findByTeamAndUser(teamId, userId);
    return member?.role === TeamMemberRole.ADMIN;
  }

  /**
   * Enforce team admin permission
   * @param workspaceId The workspace ID
   * @param teamId The team ID
   * @param userId The user ID
   * @throws ForbiddenException if the user doesn't have permission
   */
  private async enforceTeamAdminPermission(
    workspaceId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    const isAdmin = await this.isTeamAdmin(workspaceId, teamId, userId);
    
    if (!isAdmin) {
      throw new ForbiddenException('You need admin permission to perform this action');
    }
  }
}
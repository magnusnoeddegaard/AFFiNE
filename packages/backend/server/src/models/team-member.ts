import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { TeamMember, WorkspaceUserRole } from './common';

/**
 * TeamMember model for team-user relation operations
 */
@Injectable()
export class TeamMemberModel extends BaseModel<TeamMember> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.teamMember;
  }

  /**
   * Find team membership by team ID and user ID
   * @param teamId The team ID
   * @param userId The user ID
   * @returns The team-user relation
   */
  async findByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<TeamMember | null> {
    return this.model.findFirst({
      where: {
        teamId,
        userId,
      },
    });
  }

  /**
   * Find all members of a team
   * @param teamId The team ID
   * @param options Query options
   * @returns The team-user relations
   */
  async findByTeam(teamId: string, options: any = {}): Promise<TeamMember[]> {
    return this.findMany({ teamId }, options);
  }

  /**
   * Find all teams a user is a member of
   * @param userId The user ID
   * @param options Query options
   * @returns The team-user relations
   */
  async findByUser(userId: string, options: any = {}): Promise<TeamMember[]> {
    return this.findMany({ userId }, options);
  }

  /**
   * Add a user to a team
   * @param teamId The team ID
   * @param userId The user ID
   * @param role The user's role
   * @param addedBy The user ID of who added this member
   * @returns The created team-user relation
   */
  async addMember(
    teamId: string,
    userId: string,
    role: WorkspaceUserRole,
    addedBy: string,
  ): Promise<TeamMember> {
    const existing = await this.findByTeamAndUser(teamId, userId);
    
    if (existing) {
      return this.update(existing.id, {
        role,
        addedBy,
      });
    }
    
    return this.create({
      teamId,
      userId,
      role,
      addedBy,
      addedAt: new Date(),
    });
  }

  /**
   * Remove a user from a team
   * @param teamId The team ID
   * @param userId The user ID
   * @returns Whether the user was removed
   */
  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const existing = await this.findByTeamAndUser(teamId, userId);
    
    if (!existing) {
      return false;
    }
    
    // Check if this is the team leader
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (team && team.leaderId === userId) {
      throw new Error('Cannot remove the team leader');
    }
    
    await this.delete(existing.id);
    return true;
  }

  /**
   * Update a user's role in a team
   * @param teamId The team ID
   * @param userId The user ID
   * @param role The new role
   * @returns The updated team-user relation
   */
  async updateRole(
    teamId: string,
    userId: string,
    role: WorkspaceUserRole,
  ): Promise<TeamMember> {
    const existing = await this.findByTeamAndUser(teamId, userId);
    
    if (!existing) {
      throw new Error(`User ${userId} is not a member of team ${teamId}`);
    }
    
    return this.update(existing.id, { role });
  }

  /**
   * Add multiple users to a team
   * @param teamId The team ID
   * @param userIds Array of user IDs
   * @param role The role to assign
   * @param addedBy The user ID of who added these members
   * @returns The created team-user relations
   */
  async addMembers(
    teamId: string,
    userIds: string[],
    role: WorkspaceUserRole,
    addedBy: string,
  ): Promise<TeamMember[]> {
    const results: TeamMember[] = [];
    
    for (const userId of userIds) {
      const member = await this.addMember(teamId, userId, role, addedBy);
      results.push(member);
    }
    
    return results;
  }

  /**
   * Remove multiple users from a team
   * @param teamId The team ID
   * @param userIds Array of user IDs
   * @returns Number of users removed
   */
  async removeMembers(teamId: string, userIds: string[]): Promise<number> {
    let count = 0;
    
    for (const userId of userIds) {
      try {
        const removed = await this.removeMember(teamId, userId);
        if (removed) count++;
      } catch (error) {
        // Skip if error (e.g., team leader)
        console.error(`Error removing user ${userId} from team:`, error);
      }
    }
    
    return count;
  }

  /**
   * Transfer team leadership
   * @param teamId The team ID
   * @param newLeaderId The new leader ID
   * @returns The updated team-user relation
   */
  async transferLeadership(teamId: string, newLeaderId: string): Promise<TeamMember> {
    // Get the team
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }
    
    // Update the team leader field
    await this.prisma.team.update({
      where: { id: teamId },
      data: { leaderId: newLeaderId },
    });
    
    // Set the new leader's role to ADMIN if they're a member
    const leaderMember = await this.findByTeamAndUser(teamId, newLeaderId);
    
    if (leaderMember) {
      return this.update(leaderMember.id, { role: WorkspaceUserRole.ADMIN });
    }
    
    throw new Error(`New leader ${newLeaderId} is not a member of team ${teamId}`);
  }
}
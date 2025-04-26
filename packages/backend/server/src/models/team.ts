import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { Team, TeamSettings, WorkspaceUserRole } from './common';

/**
 * Team model for workspace team operations
 */
@Injectable()
export class TeamModel extends BaseModel<Team> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.team;
  }

  /**
   * Create a team with default settings
   * @param data The team data
   * @returns The created team
   */
  async createWithSettings(
    data: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'settings'>,
  ): Promise<Team> {
    const defaultSettings: TeamSettings = {
      color: null,
      defaultRole: WorkspaceUserRole.MEMBER,
      features: {
        privateDocuments: true,
        privateChat: true,
      },
    };
    
    return this.create({
      ...data,
      settings: defaultSettings,
    });
  }

  /**
   * Update team settings
   * @param id The team ID
   * @param settings The new settings
   * @returns The updated team
   */
  async updateSettings(
    id: string,
    settings: Partial<TeamSettings>,
  ): Promise<Team> {
    const team = await this.findById(id);
    
    if (!team) {
      throw new Error(`Team not found: ${id}`);
    }
    
    return this.update(id, {
      settings: {
        ...team.settings,
        ...settings,
      },
    });
  }

  /**
   * Update team leader
   * @param id The team ID
   * @param leaderId The new leader ID
   * @returns The updated team
   */
  async updateLeader(id: string, leaderId: string): Promise<Team> {
    return this.update(id, { leaderId });
  }

  /**
   * Find teams by workspace ID
   * @param workspaceId The workspace ID
   * @param options Query options
   * @returns The teams
   */
  async findByWorkspace(workspaceId: string, options: any = {}): Promise<Team[]> {
    return this.findMany(
      { workspaceId },
      options,
    );
  }

  /**
   * Find teams by member ID
   * @param userId The user ID
   * @param options Query options
   * @returns The teams
   */
  async findByMember(userId: string, options: any = {}): Promise<Team[]> {
    const teamIds = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    
    return this.findMany(
      { id: { in: teamIds.map(t => t.teamId) } },
      options,
    );
  }
}
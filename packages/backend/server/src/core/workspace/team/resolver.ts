import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { UserModel } from '../../../models/user';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { TeamService } from './service';
import {
  AddTeamMemberInput,
  BulkTeamMemberInput,
  CreateTeamInput,
  Team,
  TeamMember,
  UpdateTeamInput,
  UpdateTeamMemberRoleInput,
  User,
} from './types';

@Resolver(() => Team)
@UseGuards(AuthGuard)
export class TeamResolver {
  constructor(
    private readonly teamService: TeamService,
    private readonly userModel: UserModel
  ) {}

  @Query(() => Team)
  async team(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.getTeam(id);
  }

  @Query(() => [Team])
  async workspaceTeams(
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.getWorkspaceTeams(workspaceId, userId);
  }

  @Query(() => [Team])
  async myTeams(@CurrentUser() userId: string) {
    return this.teamService.getUserTeams(userId);
  }

  @Query(() => [TeamMember])
  async teamMembers(
    @Args('teamId', { type: () => ID }) teamId: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.getTeamMembers(teamId, userId);
  }

  @Query(() => Boolean)
  async isTeamMember(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('userId', { type: () => ID, nullable: true }) targetUserId: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.isTeamMember(teamId, targetUserId || userId);
  }

  @Query(() => Boolean)
  async isTeamAdmin(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @Args('userId', { type: () => ID, nullable: true }) targetUserId: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.isTeamAdmin(
      workspaceId,
      teamId,
      targetUserId || userId
    );
  }

  @ResolveField('color', () => String, { nullable: true })
  async color(@Parent() team: Team) {
    // If color is directly available on the Team object (as defined in types.ts)
    if (team.color) {
      return team.color;
    }
    
    // Otherwise, try to access it from settings (from database model)
    // Use type assertion since settings isn't in the GraphQL type
    const settings = (team as any).settings;
    return settings?.color || null;
  }

  @Mutation(() => Team)
  async createTeam(
    @Args('input') input: CreateTeamInput,
    @CurrentUser() userId: string
  ) {
    return this.teamService.createTeam(userId, input);
  }

  @Mutation(() => Team)
  async updateTeam(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateTeamInput,
    @CurrentUser() userId: string
  ) {
    return this.teamService.updateTeam(id, userId, input);
  }

  @Mutation(() => Team)
  async deleteTeam(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.deleteTeam(id, userId);
  }

  @Mutation(() => TeamMember)
  async addTeamMember(
    @Args('input') input: AddTeamMemberInput,
    @CurrentUser() userId: string
  ) {
    return this.teamService.addTeamMember(userId, input);
  }

  @Mutation(() => [TeamMember])
  async addTeamMembers(
    @Args('input') input: BulkTeamMemberInput,
    @CurrentUser() userId: string
  ) {
    return this.teamService.addTeamMembers(userId, input);
  }

  @Mutation(() => TeamMember)
  async updateTeamMemberRole(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('userId', { type: () => ID }) memberId: string,
    @Args('input') input: UpdateTeamMemberRoleInput,
    @CurrentUser() userId: string
  ) {
    return this.teamService.updateTeamMemberRole(
      teamId,
      memberId,
      userId,
      input
    );
  }

  @Mutation(() => Boolean)
  async removeTeamMember(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('userId', { type: () => ID }) memberId: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.removeTeamMember(teamId, memberId, userId);
  }

  @Mutation(() => Number)
  async removeTeamMembers(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('userIds', { type: () => [ID] }) userIds: string[],
    @CurrentUser() userId: string
  ) {
    return this.teamService.removeTeamMembers(teamId, userIds, userId);
  }

  @Mutation(() => Team)
  async transferTeamLeadership(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('userId', { type: () => ID }) newLeaderId: string,
    @CurrentUser() userId: string
  ) {
    return this.teamService.transferTeamLeadership(teamId, newLeaderId, userId);
  }
}

@Resolver(() => TeamMember)
export class TeamMemberResolver {
  constructor(private readonly userModel: UserModel) {}

  @ResolveField('user', () => User, { nullable: true })
  async user(@Parent() member: TeamMember) {
    if (member.userId) {
      return this.userModel.findById(member.userId);
    }
    return null;
  }
}

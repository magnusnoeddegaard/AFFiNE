import { Args, Query, Resolver, Mutation, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WorkspaceActivityService } from './service';
import { PermissionService } from '../../permission/service';
import { ActivityType, GetWorkspaceActivitiesInput, WorkspaceActivity } from '../types';
import { JwtAuthGuard } from '../../auth/guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PermissionLevel, ResourceType } from '../../permission/types';

@Resolver(() => WorkspaceActivity)
export class WorkspaceActivityResolver {
  constructor(
    private readonly activityService: WorkspaceActivityService,
    private readonly permissionService: PermissionService,
  ) {}

  @Query(() => [WorkspaceActivity])
  @UseGuards(JwtAuthGuard)
  async workspaceActivities(
    @Args('input') input: GetWorkspaceActivitiesInput,
    @CurrentUser() userId: string,
  ): Promise<WorkspaceActivity[]> {
    // Check if user has at least READ permission for this workspace
    await this.permissionService.enforcePermission(
      input.workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.READ,
    );

    return this.activityService.getWorkspaceActivities(input);
  }

  @Query(() => [WorkspaceActivity])
  @UseGuards(JwtAuthGuard)
  async userRecentActivities(
    @Args('limit', { type: () => Int, nullable: true }) limit: number,
    @CurrentUser() userId: string,
  ): Promise<WorkspaceActivity[]> {
    return this.activityService.getUserRecentActivities(userId, limit);
  }

  @Query(() => Object)
  @UseGuards(JwtAuthGuard)
  async workspaceActivityCounts(
    @Args('workspaceId') workspaceId: string,
    @Args('startDate', { nullable: true }) startDate: Date,
    @CurrentUser() userId: string,
  ): Promise<Record<ActivityType, number>> {
    // Check if user has at least READ permission for this workspace
    await this.permissionService.enforcePermission(
      workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.READ,
    );

    return this.activityService.getActivityCountsByType(workspaceId, startDate);
  }
}
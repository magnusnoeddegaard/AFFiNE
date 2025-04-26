import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PublicSharingService } from './service';
import { PermissionService } from '../../permission/service';
import { AuthGuard } from '../../auth/guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PermissionLevel, ResourceType } from '../../permission/types';
import { PublicAccessLevel, PublicWorkspaceInfo } from '../types';

@Resolver(() => PublicWorkspaceInfo)
export class PublicSharingResolver {
  constructor(
    private readonly publicSharingService: PublicSharingService,
    private readonly permissionService: PermissionService,
  ) {}

  @Query(() => PublicWorkspaceInfo)
  async publicWorkspaceInfo(
    @Args('workspaceId') workspaceId: string,
  ): Promise<PublicWorkspaceInfo> {
    return this.publicSharingService.getPublicWorkspaceInfo(workspaceId);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async updatePublicSharingSettings(
    @Args('workspaceId') workspaceId: string,
    @Args('publicAccessLevel', { type: () => PublicAccessLevel }) publicAccessLevel: PublicAccessLevel,
    @Args('publicJoinable', { type: () => Boolean }) publicJoinable: boolean,
    @CurrentUser() userId: string,
  ): Promise<boolean> {
    // Check if user has admin permission for this workspace
    await this.permissionService.enforcePermission(
      workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN,
    );

    await this.publicSharingService.updatePublicSharingSettings(
      workspaceId,
      publicAccessLevel,
      publicJoinable,
    );

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async joinPublicWorkspace(
    @Args('workspaceId') workspaceId: string,
    @CurrentUser() userId: string,
  ): Promise<boolean> {
    return this.publicSharingService.joinPublicWorkspace(workspaceId, userId);
  }
}
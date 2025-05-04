import { NotFoundException,UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guard';
import { PermissionService } from '../../permission/service';
import { PermissionLevel, ResourceType } from '../../permission/types';
import { PublicAccessLevel, PublicWorkspaceInfo } from '../types';
import { PublicSharingService } from './service';

@Resolver(() => PublicWorkspaceInfo)
export class PublicSharingResolver {
  constructor(
    private readonly publicSharingService: PublicSharingService,
    private readonly permissionService: PermissionService
  ) {}

  @Query(() => PublicWorkspaceInfo)
  async publicWorkspaceInfo(
    @Args('workspaceId') workspaceId: string
  ): Promise<PublicWorkspaceInfo> {
    const result =
      await this.publicSharingService.getPublicWorkspaceInfo(workspaceId);
    if (!result) {
      throw new NotFoundException(
        `Public workspace with ID ${workspaceId} not found`
      );
    }
    return result;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async updatePublicSharingSettings(
    @Args('workspaceId') workspaceId: string,
    @Args('publicAccessLevel', { type: () => PublicAccessLevel })
    publicAccessLevel: PublicAccessLevel,
    @Args('publicJoinable', { type: () => Boolean }) publicJoinable: boolean,
    @CurrentUser() userId: string
  ): Promise<boolean> {
    // Check if user has admin permission for this workspace
    await this.permissionService.enforcePermission(
      workspaceId,
      ResourceType.WORKSPACE,
      userId,
      PermissionLevel.ADMIN
    );

    await this.publicSharingService.updatePublicSharingSettings(
      workspaceId,
      publicAccessLevel,
      publicJoinable
    );

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async joinPublicWorkspace(
    @Args('workspaceId') workspaceId: string,
    @CurrentUser() userId: string
  ): Promise<boolean> {
    return this.publicSharingService.joinPublicWorkspace(workspaceId, userId);
  }
}

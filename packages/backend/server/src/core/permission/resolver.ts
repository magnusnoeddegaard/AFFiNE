import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard';
import { PermissionService } from './service';
import { CreatePermissionInput, Permission, PermissionCheck, PermissionLevel, ResourceType, UpdatePermissionInput } from './types';
import { ForbiddenException } from '@nestjs/common';

@Resolver(() => Permission)
export class PermissionResolver {
  constructor(private readonly permissionService: PermissionService) {}

  @Query(() => [Permission])
  @UseGuards(JwtAuthGuard)
  async resourcePermissions(
    @Args('resourceId') resourceId: string,
    @Args('resourceType') resourceType: ResourceType,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    
    // Only users with ADMIN or OWNER permission can view all permissions for a resource
    const check = await this.permissionService.checkPermission(
      resourceId,
      resourceType,
      userId,
      PermissionLevel.ADMIN,
    );

    if (!check.hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to view permissions for this ${resourceType.toLowerCase()}`,
      );
    }

    return this.permissionService.getResourcePermissions(resourceId, resourceType);
  }

  @Query(() => Permission, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async permission(
    @Args('resourceId') resourceId: string,
    @Args('resourceType') resourceType: ResourceType,
    @Args('userId') userId: string,
    @Context() context: any,
  ) {
    const currentUserId = context.req.user.id;
    
    // Users can view their own permissions, or if they have ADMIN/OWNER permission
    if (currentUserId !== userId) {
      const check = await this.permissionService.checkPermission(
        resourceId,
        resourceType,
        currentUserId,
        PermissionLevel.ADMIN,
      );

      if (!check.hasPermission) {
        throw new ForbiddenException(
          `You do not have permission to view other users' permissions for this ${resourceType.toLowerCase()}`,
        );
      }
    }

    return this.permissionService.getPermission(resourceId, resourceType, userId);
  }

  @Query(() => PermissionCheck)
  @UseGuards(JwtAuthGuard)
  async checkPermission(
    @Args('resourceId') resourceId: string,
    @Args('resourceType') resourceType: ResourceType,
    @Args('level') level: PermissionLevel,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.permissionService.checkPermission(resourceId, resourceType, userId, level);
  }

  @Mutation(() => Permission)
  @UseGuards(JwtAuthGuard)
  async createPermission(
    @Args('input') input: CreatePermissionInput,
    @Context() context: any,
  ) {
    const currentUserId = context.req.user.id;
    
    // Only users with ADMIN or OWNER permission can create permissions for a resource
    const check = await this.permissionService.checkPermission(
      input.resourceId,
      input.resourceType,
      currentUserId,
      PermissionLevel.ADMIN,
    );

    if (!check.hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to manage permissions for this ${input.resourceType.toLowerCase()}`,
      );
    }

    // Prevent users from creating OWNER permissions unless they are the current owner
    if (input.level === PermissionLevel.OWNER && check.currentLevel !== PermissionLevel.OWNER) {
      throw new ForbiddenException(
        `Only current owners can assign owner permissions`,
      );
    }

    return this.permissionService.createPermission(input);
  }

  @Mutation(() => Permission)
  @UseGuards(JwtAuthGuard)
  async updatePermission(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePermissionInput,
    @Context() context: any,
  ) {
    const currentUserId = context.req.user.id;
    
    // Get the existing permission to check resource information
    const permission = await this.permissionService.getPermissionById(id);
    
    if (!permission) {
      throw new ForbiddenException(`Permission not found`);
    }

    // Check if current user has ADMIN or OWNER permission for the resource
    const check = await this.permissionService.checkPermission(
      permission.resourceId,
      permission.resourceType as ResourceType,
      currentUserId,
      PermissionLevel.ADMIN,
    );

    if (!check.hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to manage permissions for this ${permission.resourceType.toLowerCase()}`,
      );
    }

    // Prevent users from creating OWNER permissions unless they are the current owner
    if (input.level === PermissionLevel.OWNER && check.currentLevel !== PermissionLevel.OWNER) {
      throw new ForbiddenException(
        `Only current owners can assign owner permissions`,
      );
    }

    return this.permissionService.updatePermission(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deletePermission(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ) {
    const currentUserId = context.req.user.id;
    
    // Get the existing permission to check resource information
    const permission = await this.permissionService.getPermissionById(id);
    
    if (!permission) {
      throw new ForbiddenException(`Permission not found`);
    }

    // Check if current user has ADMIN or OWNER permission for the resource
    const check = await this.permissionService.checkPermission(
      permission.resourceId,
      permission.resourceType as ResourceType,
      currentUserId,
      PermissionLevel.ADMIN,
    );

    if (!check.hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to manage permissions for this ${permission.resourceType.toLowerCase()}`,
      );
    }

    // Prevent deletion of owner permissions
    if (permission.level === PermissionLevel.OWNER) {
      throw new ForbiddenException(
        `Owner permissions cannot be deleted. Transfer ownership first.`,
      );
    }

    await this.permissionService.deletePermission(id);
    return true;
  }
}
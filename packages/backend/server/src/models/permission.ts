import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { PermissionBase, PermissionLevel, ResourceType } from './common';

/**
 * Permission model for permission operations
 */
@Injectable()
export class PermissionModel extends BaseModel<PermissionBase> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.permission;
  }

  /**
   * Find permission by resource and user
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userId The user ID
   * @returns The permission or null
   */
  async findByResourceAndUser(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
  ): Promise<PermissionBase | null> {
    return this.model.findFirst({
      where: {
        resourceType,
        resourceId,
        userId,
      },
    });
  }

  /**
   * Find permission by resource and workspace
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param workspaceId The workspace ID
   * @returns The permission or null
   */
  async findByResourceAndWorkspace(
    resourceType: ResourceType,
    resourceId: string,
    workspaceId: string,
  ): Promise<PermissionBase | null> {
    return this.model.findFirst({
      where: {
        resourceType,
        resourceId,
        workspaceId,
      },
    });
  }

  /**
   * Find permission by resource and user group
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userGroupId The user group ID
   * @returns The permission or null
   */
  async findByResourceAndUserGroup(
    resourceType: ResourceType,
    resourceId: string,
    userGroupId: string,
  ): Promise<PermissionBase | null> {
    return this.model.findFirst({
      where: {
        resourceType,
        resourceId,
        userGroupId,
      },
    });
  }

  /**
   * Find all permissions for a resource
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @returns The permissions
   */
  async findByResource(
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<PermissionBase[]> {
    return this.findMany({
      resourceType,
      resourceId,
    });
  }

  /**
   * Find all permissions for a user
   * @param userId The user ID
   * @returns The permissions
   */
  async findByUser(userId: string): Promise<PermissionBase[]> {
    return this.findMany({ userId });
  }

  /**
   * Check if a user has permission for a resource
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userId The user ID
   * @param requiredLevel The required permission level
   * @returns Whether the user has the required permission
   */
  async hasPermission(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    requiredLevel: PermissionLevel,
  ): Promise<boolean> {
    // Check direct permission
    const directPermission = await this.findByResourceAndUser(resourceType, resourceId, userId);
    
    if (directPermission) {
      return this.checkPermissionLevel(directPermission.level, requiredLevel);
    }
    
    // Check user group permissions
    const userGroups = await this.prisma.userGroupMember.findMany({
      where: { userId },
    });
    
    for (const group of userGroups) {
      const groupPermission = await this.findByResourceAndUserGroup(
        resourceType,
        resourceId,
        group.userGroupId,
      );
      
      if (groupPermission && this.checkPermissionLevel(groupPermission.level, requiredLevel)) {
        return true;
      }
    }
    
    // Check workspace permissions
    const workspaces = await this.prisma.workspaceUser.findMany({
      where: { userId },
    });
    
    for (const workspace of workspaces) {
      const workspacePermission = await this.findByResourceAndWorkspace(
        resourceType,
        resourceId,
        workspace.workspaceId,
      );
      
      if (workspacePermission && this.checkPermissionLevel(workspacePermission.level, requiredLevel)) {
        return true;
      }
    }
    
    // Check inherited permissions
    const resource = await this.findByResource(resourceType, resourceId);
    
    for (const perm of resource) {
      if (perm.inheritFrom) {
        const hasParentPermission = await this.hasPermission(
          resourceType,
          perm.inheritFrom,
          userId,
          requiredLevel,
        );
        
        if (hasParentPermission) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Grant permission to a user
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userId The user ID
   * @param level The permission level
   * @param inheritFrom Optional parent resource to inherit from
   * @returns The created or updated permission
   */
  async grantUserPermission(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    level: PermissionLevel,
    inheritFrom?: string,
  ): Promise<PermissionBase> {
    const existing = await this.findByResourceAndUser(resourceType, resourceId, userId);
    
    if (existing) {
      return this.update(existing.id, {
        level,
        inheritFrom: inheritFrom || existing.inheritFrom,
      });
    }
    
    return this.create({
      resourceType,
      resourceId,
      userId,
      workspaceId: null,
      userGroupId: null,
      level,
      inheritFrom: inheritFrom || null,
    });
  }

  /**
   * Grant permission to a workspace
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param workspaceId The workspace ID
   * @param level The permission level
   * @param inheritFrom Optional parent resource to inherit from
   * @returns The created or updated permission
   */
  async grantWorkspacePermission(
    resourceType: ResourceType,
    resourceId: string,
    workspaceId: string,
    level: PermissionLevel,
    inheritFrom?: string,
  ): Promise<PermissionBase> {
    const existing = await this.findByResourceAndWorkspace(resourceType, resourceId, workspaceId);
    
    if (existing) {
      return this.update(existing.id, {
        level,
        inheritFrom: inheritFrom || existing.inheritFrom,
      });
    }
    
    return this.create({
      resourceType,
      resourceId,
      userId: null,
      workspaceId,
      userGroupId: null,
      level,
      inheritFrom: inheritFrom || null,
    });
  }

  /**
   * Grant permission to a user group
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userGroupId The user group ID
   * @param level The permission level
   * @param inheritFrom Optional parent resource to inherit from
   * @returns The created or updated permission
   */
  async grantUserGroupPermission(
    resourceType: ResourceType,
    resourceId: string,
    userGroupId: string,
    level: PermissionLevel,
    inheritFrom?: string,
  ): Promise<PermissionBase> {
    const existing = await this.findByResourceAndUserGroup(resourceType, resourceId, userGroupId);
    
    if (existing) {
      return this.update(existing.id, {
        level,
        inheritFrom: inheritFrom || existing.inheritFrom,
      });
    }
    
    return this.create({
      resourceType,
      resourceId,
      userId: null,
      workspaceId: null,
      userGroupId,
      level,
      inheritFrom: inheritFrom || null,
    });
  }

  /**
   * Revoke permission from a user
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userId The user ID
   * @returns Whether the permission was revoked
   */
  async revokeUserPermission(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
  ): Promise<boolean> {
    const existing = await this.findByResourceAndUser(resourceType, resourceId, userId);
    
    if (!existing) {
      return false;
    }
    
    await this.delete(existing.id);
    return true;
  }

  /**
   * Revoke permission from a workspace
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param workspaceId The workspace ID
   * @returns Whether the permission was revoked
   */
  async revokeWorkspacePermission(
    resourceType: ResourceType,
    resourceId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const existing = await this.findByResourceAndWorkspace(resourceType, resourceId, workspaceId);
    
    if (!existing) {
      return false;
    }
    
    await this.delete(existing.id);
    return true;
  }

  /**
   * Revoke permission from a user group
   * @param resourceType The resource type
   * @param resourceId The resource ID
   * @param userGroupId The user group ID
   * @returns Whether the permission was revoked
   */
  async revokeUserGroupPermission(
    resourceType: ResourceType,
    resourceId: string,
    userGroupId: string,
  ): Promise<boolean> {
    const existing = await this.findByResourceAndUserGroup(resourceType, resourceId, userGroupId);
    
    if (!existing) {
      return false;
    }
    
    await this.delete(existing.id);
    return true;
  }

  /**
   * Copy permissions from one resource to another
   * @param sourceType The source resource type
   * @param sourceId The source resource ID
   * @param targetType The target resource type
   * @param targetId The target resource ID
   * @returns The count of copied permissions
   */
  async copyPermissions(
    sourceType: ResourceType,
    sourceId: string,
    targetType: ResourceType,
    targetId: string,
  ): Promise<number> {
    const permissions = await this.findByResource(sourceType, sourceId);
    
    if (!permissions.length) {
      return 0;
    }
    
    await this.prisma.$transaction(
      permissions.map((perm) =>
        this.prisma.permission.create({
          data: {
            resourceType: targetType,
            resourceId: targetId,
            userId: perm.userId,
            workspaceId: perm.workspaceId,
            userGroupId: perm.userGroupId,
            level: perm.level,
            inheritFrom: perm.inheritFrom,
          },
        }),
      ),
    );
    
    return permissions.length;
  }

  /**
   * Helper method to check if a permission level meets the required level
   * @param actual The actual permission level
   * @param required The required permission level
   * @returns Whether the actual level meets the requirement
   */
  private checkPermissionLevel(
    actual: PermissionLevel,
    required: PermissionLevel,
  ): boolean {
    const permissionLevels = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.COMMENT]: 2,
      [PermissionLevel.WRITE]: 3,
      [PermissionLevel.ADMIN]: 4,
      [PermissionLevel.OWNER]: 5,
    };
    
    return permissionLevels[actual] >= permissionLevels[required];
  }
}
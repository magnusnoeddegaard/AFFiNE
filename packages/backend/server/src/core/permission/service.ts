import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { CreatePermissionInput, PermissionCheck, PermissionLevel, ResourceType, UpdatePermissionInput } from './types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}
  
  async getPermissionById(id: string) {
    this.logger.debug(`Getting permission by ID ${id}`);
    
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async createPermission(input: CreatePermissionInput) {
    this.logger.debug(`Creating permission for resource ${input.resourceId} for user ${input.userId}`);
    
    return this.prisma.permission.create({
      data: {
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        userId: input.userId,
        level: input.level,
      },
    });
  }

  async getPermission(resourceId: string, resourceType: ResourceType, userId: string) {
    this.logger.debug(`Getting permission for resource ${resourceId} for user ${userId}`);
    
    const permission = await this.prisma.permission.findFirst({
      where: {
        resourceId,
        resourceType,
        userId,
      },
    });

    if (!permission) {
      return null;
    }

    return permission;
  }

  async updatePermission(id: string, input: UpdatePermissionInput) {
    this.logger.debug(`Updating permission ${id}`);
    
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return this.prisma.permission.update({
      where: { id },
      data: { level: input.level },
    });
  }

  async deletePermission(id: string) {
    this.logger.debug(`Deleting permission ${id}`);
    
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return this.prisma.permission.delete({
      where: { id },
    });
  }

  async getResourcePermissions(resourceId: string, resourceType: ResourceType) {
    this.logger.debug(`Getting permissions for resource ${resourceId}`);
    
    return this.prisma.permission.findMany({
      where: {
        resourceId,
        resourceType,
      },
    });
  }

  async getUserPermissions(userId: string, resourceType?: ResourceType) {
    this.logger.debug(`Getting permissions for user ${userId}`);
    
    return this.prisma.permission.findMany({
      where: {
        userId,
        ...(resourceType && { resourceType }),
      },
    });
  }

  async checkPermission(
    resourceId: string,
    resourceType: ResourceType,
    userId: string,
    requiredLevel: PermissionLevel,
  ): Promise<PermissionCheck> {
    this.logger.debug(`Checking permission for resource ${resourceId} for user ${userId}`);
    
    const permission = await this.getPermission(resourceId, resourceType, userId);

    if (!permission) {
      return {
        hasPermission: false,
      };
    }

    const permissionLevels = Object.values(PermissionLevel);
    const requiredLevelIndex = permissionLevels.indexOf(requiredLevel);
    const currentLevelIndex = permissionLevels.indexOf(permission.level as PermissionLevel);

    return {
      hasPermission: currentLevelIndex >= requiredLevelIndex,
      currentLevel: permission.level as PermissionLevel,
    };
  }

  async enforcePermission(
    resourceId: string,
    resourceType: ResourceType,
    userId: string,
    requiredLevel: PermissionLevel,
  ): Promise<void> {
    this.logger.debug(`Enforcing permission for resource ${resourceId} for user ${userId}`);
    
    const check = await this.checkPermission(resourceId, resourceType, userId, requiredLevel);

    if (!check.hasPermission) {
      throw new ForbiddenException(
        `User ${userId} does not have ${requiredLevel} permission for ${resourceType} ${resourceId}`,
      );
    }
  }

  async setOwnerPermission(resourceId: string, resourceType: ResourceType, userId: string) {
    this.logger.debug(`Setting owner permission for resource ${resourceId} for user ${userId}`);
    
    const existing = await this.getPermission(resourceId, resourceType, userId);

    if (existing) {
      return this.prisma.permission.update({
        where: { id: existing.id },
        data: { level: PermissionLevel.OWNER },
      });
    }

    return this.createPermission({
      resourceId,
      resourceType,
      userId,
      level: PermissionLevel.OWNER,
    });
  }
}
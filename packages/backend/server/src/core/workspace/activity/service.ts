import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../base/prisma/prisma.service';
import {
  ActivityType,
  GetWorkspaceActivitiesInput,
  WorkspaceActivity,
} from '../types';

@Injectable()
export class WorkspaceActivityService {
  private readonly logger = new Logger(WorkspaceActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new activity log entry
   */
  async createActivity(
    workspaceId: string,
    userId: string,
    activityType: ActivityType,
    documentId?: string,
    details?: string,
    targetId?: string
  ): Promise<WorkspaceActivity> {
    this.logger.debug(
      `Creating activity log: ${activityType} by ${userId} in workspace ${workspaceId}`
    );

    return this.prisma.workspaceActivity.create({
      data: {
        id: randomUUID(),
        workspaceId,
        userId,
        activityType,
        documentId,
        details,
        targetId,
      },
    });
  }

  /**
   * Get activities for a workspace with filtering options
   */
  async getWorkspaceActivities(
    input: GetWorkspaceActivitiesInput
  ): Promise<WorkspaceActivity[]> {
    this.logger.debug(`Getting activities for workspace ${input.workspaceId}`);

    const query: any = {
      where: {
        workspaceId: input.workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    };

    // Apply filters if provided
    if (input.activityTypes && input.activityTypes.length > 0) {
      query.where.activityType = { in: input.activityTypes };
    }

    if (input.userId) {
      query.where.userId = input.userId;
    }

    if (input.startDate) {
      query.where.createdAt = query.where.createdAt || {};
      query.where.createdAt.gte = input.startDate;
    }

    if (input.endDate) {
      query.where.createdAt = query.where.createdAt || {};
      query.where.createdAt.lte = input.endDate;
    }

    // Apply pagination
    if (input.limit !== undefined) {
      query.take = input.limit;
    }

    if (input.offset !== undefined) {
      query.skip = input.offset;
    }

    return this.prisma.workspaceActivity.findMany(query);
  }

  /**
   * Get recent activities for a user across all workspaces
   */
  async getUserRecentActivities(
    userId: string,
    limit: number = 20
  ): Promise<WorkspaceActivity[]> {
    this.logger.debug(`Getting recent activities for user ${userId}`);

    return this.prisma.workspaceActivity.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get activity count by type for a workspace
   */
  async getActivityCountsByType(
    workspaceId: string,
    startDate?: Date
  ): Promise<Record<ActivityType, number>> {
    this.logger.debug(`Getting activity counts for workspace ${workspaceId}`);

    const where: any = {
      workspaceId,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    const counts = await this.prisma.workspaceActivity.groupBy({
      by: ['activityType'],
      where,
      _count: {
        activityType: true,
      },
    });

    // Initialize result with all activity types set to 0
    const result: Record<ActivityType, number> = Object.values(
      ActivityType
    ).reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<ActivityType, number>
    );

    // Update with actual counts
    counts.forEach(
      (item: { activityType: string; _count: { activityType: number } }) => {
        result[item.activityType as ActivityType] = item._count.activityType;
      }
    );

    return result;
  }
}

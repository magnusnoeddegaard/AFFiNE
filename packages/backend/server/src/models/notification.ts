import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { Timestamps } from './common';

/**
 * Notification types
 */
export enum NotificationType {
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_REPLIED = 'COMMENT_REPLIED',
  WORKSPACE_INVITATION = 'WORKSPACE_INVITATION',
  WORKSPACE_ROLE_CHANGED = 'WORKSPACE_ROLE_CHANGED',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification model interface
 */
export interface Notification extends Timestamps {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  readAt: Date | null;
  dismissed: boolean;
  email: boolean;
  emailSent: boolean;
  emailSentAt: Date | null;
}

/**
 * Notification model for notification operations
 */
@Injectable()
export class NotificationModel extends BaseModel<Notification> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.notification;
  }

  /**
   * Find notifications by user ID
   * @param userId The user ID
   * @param options Query options
   * @returns The notifications
   */
  async findByUser(userId: string, options: any = {}): Promise<Notification[]> {
    return this.findMany(
      { userId },
      {
        orderBy: { createdAt: 'desc' },
        ...options,
      },
    );
  }

  /**
   * Find unread notifications by user ID
   * @param userId The user ID
   * @param options Query options
   * @returns The unread notifications
   */
  async findUnreadByUser(userId: string, options: any = {}): Promise<Notification[]> {
    return this.findMany(
      { userId, read: false },
      {
        orderBy: { createdAt: 'desc' },
        ...options,
      },
    );
  }

  /**
   * Create a new notification
   * @param data The notification data
   * @returns The created notification
   */
  async createNotification(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'read' | 'readAt' | 'dismissed' | 'emailSent' | 'emailSentAt'>,
  ): Promise<Notification> {
    return this.create({
      ...data,
      read: false,
      readAt: null,
      dismissed: false,
      emailSent: false,
      emailSentAt: null,
    });
  }

  /**
   * Mark a notification as read
   * @param id The notification ID
   * @returns The updated notification
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.update(id, {
      read: true,
      readAt: new Date(),
    });
  }

  /**
   * Mark all notifications as read for a user
   * @param userId The user ID
   * @returns The count of updated notifications
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    
    return result.count;
  }

  /**
   * Dismiss a notification
   * @param id The notification ID
   * @returns The updated notification
   */
  async dismiss(id: string): Promise<Notification> {
    return this.update(id, {
      dismissed: true,
    });
  }

  /**
   * Dismiss all notifications for a user
   * @param userId The user ID
   * @returns The count of updated notifications
   */
  async dismissAll(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, dismissed: false },
      data: {
        dismissed: true,
      },
    });
    
    return result.count;
  }

  /**
   * Mark a notification as email sent
   * @param id The notification ID
   * @returns The updated notification
   */
  async markAsEmailSent(id: string): Promise<Notification> {
    return this.update(id, {
      emailSent: true,
      emailSentAt: new Date(),
    });
  }

  /**
   * Get count of unread notifications for a user
   * @param userId The user ID
   * @returns The count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.count({ userId, read: false });
  }

  /**
   * Delete old notifications
   * @param olderThan Date threshold
   * @returns The count of deleted notifications
   */
  async deleteOldNotifications(olderThan: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    });
    
    return result.count;
  }
}
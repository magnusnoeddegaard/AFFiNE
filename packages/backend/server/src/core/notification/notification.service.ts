import { Injectable, Logger } from '@nestjs/common';
import { NotificationModel, NotificationType } from '../../models/notification';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../base/mail/mail.service';
import { QueueService } from '../../base/queue';


/**
 * Service for handling notification delivery
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  
  constructor(
    private readonly notificationModel: NotificationModel,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Create a new notification
   * @param userId User to notify
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param data Additional data
   * @param sendEmail Whether to send email
   * @returns The created notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
    sendEmail = false,
  ): Promise<any> {
    // Create notification in the database
    const notification = await this.notificationModel.createNotification({
      userId,
      type,
      title,
      message,
      data,
      email: sendEmail,
    });

    // Queue delivery
    await this.queueDelivery(notification.id);

    return notification;
  }

  /**
   * Queue notification for delivery
   * @param notificationId Notification ID
   */
  private async queueDelivery(notificationId: string): Promise<void> {
    // Add to queue for processing (for both realtime and email delivery)
    await this.queueService.add(
      'notification:delivery',
      { notificationId },
      { 
        priority: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds initial delay
        }
      }
    );
  }

  /**
   * Process notification delivery
   * @param notificationId Notification ID
   */
  async processDelivery(notificationId: string): Promise<void> {
    const notification = await this.notificationModel.findById(notificationId);
    
    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found for delivery`);
      return;
    }

    // Handle real-time delivery
    await this.deliverRealtime(notification);

    // Handle email delivery if needed
    if (notification.email && !notification.emailSent) {
      await this.deliverEmail(notification);
    }
  }

  /**
   * Deliver notification via real-time channels
   * @param notification Notification to deliver
   */
  private async deliverRealtime(notification: any): Promise<void> {
    try {
      // In a real implementation, this would use a WebSocket or SSE service
      // For example:
      // this.websocketGateway.sendToUser(notification.userId, 'notification', notification);
      this.logger.debug(`Real-time notification delivered to user ${notification.userId}`);
    } catch (error) {
      this.logger.error(`Failed to deliver real-time notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Deliver notification via email
   * @param notification Notification to deliver
   */
  private async deliverEmail(notification: any): Promise<void> {
    try {
      const result = await this.mailService.sendNotificationEmail(
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.data,
      );

      if (result.success) {
        await this.notificationModel.markAsEmailSent(notification.id);
      }
    } catch (error) {
      this.logger.error(`Failed to deliver email notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Get notifications for a user
   * @param userId User ID
   * @param options Query options
   * @returns List of notifications
   */
  async getUserNotifications(userId: string, options: any = {}): Promise<any[]> {
    return this.notificationModel.findByUser(userId, options);
  }

  /**
   * Get unread notifications for a user
   * @param userId User ID
   * @param options Query options
   * @returns List of unread notifications
   */
  async getUnreadNotifications(userId: string, options: any = {}): Promise<any[]> {
    return this.notificationModel.findUnreadByUser(userId, options);
  }

  /**
   * Get unread notification count for a user
   * @param userId User ID
   * @returns Count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.getUnreadCount(userId);
  }

  /**
   * Mark a notification as read
   * @param id Notification ID
   * @returns Updated notification
   */
  async markAsRead(id: string): Promise<any> {
    return this.notificationModel.markAsRead(id);
  }

  /**
   * Mark all notifications as read for a user
   * @param userId User ID
   * @returns Count of updated notifications
   */
  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationModel.markAllAsRead(userId);
  }

  /**
   * Dismiss a notification
   * @param id Notification ID
   * @returns Updated notification
   */
  async dismiss(id: string): Promise<any> {
    return this.notificationModel.dismiss(id);
  }

  /**
   * Dismiss all notifications for a user
   * @param userId User ID
   * @returns Count of updated notifications
   */
  async dismissAll(userId: string): Promise<number> {
    return this.notificationModel.dismissAll(userId);
  }
  
  /**
   * Clean up old notifications
   * @param daysToKeep Number of days to keep notifications
   * @returns Count of deleted notifications
   */
  async cleanupOldNotifications(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    return this.notificationModel.deleteOldNotifications(cutoffDate);
  }
  
  /**
   * Find notification by ID
   * @param id Notification ID
   * @returns The notification or null
   */
  async findNotificationById(id: string): Promise<any> {
    return this.notificationModel.findById(id);
  }
  
  /**
   * Count notifications for a user
   * @param userId User ID
   * @returns Count of notifications
   */
  async countUserNotifications(userId: string): Promise<number> {
    return this.notificationModel.count({ userId: userId });
  }
}
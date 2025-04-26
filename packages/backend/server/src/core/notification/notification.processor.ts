import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationService } from './notification.service';

/**
 * Processor for notification queue jobs
 */
@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Process notification delivery
   * @param job Job data
   */
  @Process('delivery')
  async processDelivery(job: Job<{ notificationId: string }>): Promise<void> {
    this.logger.debug(`Processing notification delivery: ${job.data.notificationId}`);
    
    try {
      await this.notificationService.processDelivery(job.data.notificationId);
      this.logger.debug(`Notification delivery processed: ${job.data.notificationId}`);
    } catch (error) {
      this.logger.error(`Error processing notification delivery: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger job retry
    }
  }

  /**
   * Process notification cleanup
   * @param job Job data
   */
  @Process('cleanup')
  async processCleanup(job: Job<{ daysToKeep: number }>): Promise<void> {
    this.logger.debug(`Processing notification cleanup: ${job.data.daysToKeep} days`);
    
    try {
      const deletedCount = await this.notificationService.cleanupOldNotifications(job.data.daysToKeep);
      this.logger.debug(`Notification cleanup processed: ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`Error processing notification cleanup: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger job retry
    }
  }
}
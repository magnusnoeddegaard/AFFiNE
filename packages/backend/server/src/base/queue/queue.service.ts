import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';

/**
 * Service for handling queue operations
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  
  constructor(
    @InjectQueue('notification') private readonly notificationQueue: Queue,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  /**
   * Add a job to a queue
   * @param queueName Queue name and job type separated by colon (e.g., 'notification:delivery')
   * @param data Job data
   * @param options Job options
   * @returns Job ID
   */
  async add(queueName: string, data: any, options?: JobOptions): Promise<string> {
    const [queue, jobName] = queueName.split(':');
    
    try {
      let targetQueue: Queue;
      
      // Select queue based on name
      switch (queue) {
        case 'notification':
          targetQueue = this.notificationQueue;
          break;
        case 'mail':
          targetQueue = this.mailQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queue}`);
      }
      
      const job = await targetQueue.add(jobName, data, options);
      return job.id.toString();
    } catch (error) {
      this.logger.error(`Failed to add job to queue ${queueName}: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Clean a queue
   * @param queueName Queue name (e.g., 'notification')
   * @returns Success status
   */
  async clean(queueName: string): Promise<boolean> {
    try {
      let targetQueue: Queue;
      
      // Select queue based on name
      switch (queueName) {
        case 'notification':
          targetQueue = this.notificationQueue;
          break;
        case 'mail':
          targetQueue = this.mailQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }
      
      await targetQueue.clean(30000, 'completed'); // Clean completed jobs older than 30 seconds
      await targetQueue.clean(604800000, 'failed'); // Clean failed jobs older than 7 days
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to clean queue ${queueName}: ${error.message}`, error.stack);
      return false;
    }
  }
}
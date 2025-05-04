import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DocServiceCronJob {
  private readonly logger = new Logger(DocServiceCronJob.name);

  @Cron('0 0 * * *') // This runs at midnight every day
  handleCron() {
    this.logger.debug('Running scheduled document service job');
    // Add your cron job logic here
  }
}
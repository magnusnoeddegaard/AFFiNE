import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { ModelsModule } from '../../models/module';
import { MailModule } from '../../base/mail/mail.module';
import { QueueModule } from '../../base/queue/queue.module';
import { NotificationProcessor } from './notification.processor';
import { EmailTemplateService } from './email-template.service';

@Module({
  imports: [
    ModelsModule,
    MailModule,
    QueueModule,
  ],
  providers: [
    NotificationService,
    NotificationResolver,
    NotificationProcessor,
    EmailTemplateService,
  ],
  exports: [
    NotificationService,
    EmailTemplateService,
  ],
})
export class NotificationModule {}
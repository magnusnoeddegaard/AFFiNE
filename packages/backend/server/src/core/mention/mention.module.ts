import { Module } from '@nestjs/common';
import { MentionService } from './mention.service';
import { MentionResolver } from './mention.resolver';
import { NotificationModule } from '../notification/notification.module';
import { ModelsModule } from '../../models/module';

@Module({
  imports: [
    NotificationModule,
    ModelsModule,
  ],
  providers: [
    MentionService,
    MentionResolver,
  ],
  exports: [
    MentionService,
  ],
})
export class MentionModule {}
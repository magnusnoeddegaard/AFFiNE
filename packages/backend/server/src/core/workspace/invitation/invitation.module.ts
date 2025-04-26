import { Module } from '@nestjs/common';
import { WorkspaceInvitationService } from './invitation.service';
import { WorkspaceInvitationResolver } from './invitation.resolver';
import { ModelsModule } from '../../../models/module';
import { NotificationModule } from '../../notification/notification.module';
import { AuthModule } from '../../auth/auth.module';
import { MailModule } from '../../../base/mail/mail.module';

@Module({
  imports: [
    ModelsModule,
    NotificationModule,
    AuthModule,
    MailModule,
  ],
  providers: [
    WorkspaceInvitationService,
    WorkspaceInvitationResolver,
  ],
  exports: [
    WorkspaceInvitationService,
  ],
})
export class WorkspaceInvitationModule {}
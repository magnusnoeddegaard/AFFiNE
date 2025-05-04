import { Module } from '@nestjs/common';

import { ConfigModule } from '../config';
import { MailService } from './mail.service';
import { UserModule } from '../../core/user/index';
import { UserModel } from '../../models/user';

@Module({
  imports: [ConfigModule, UserModule],
  providers: [MailService, UserModel], // Add UserModel to providers
  exports: [MailService],
})
export class MailModule {}
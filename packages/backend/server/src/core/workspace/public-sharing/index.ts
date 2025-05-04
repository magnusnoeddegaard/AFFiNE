import { Module } from '@nestjs/common';
import { PublicSharingService } from './service';
import { PublicSharingResolver } from './resolver';
import { PublicSharingController } from './controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../base/prisma/index';
import { ConfigModule as AppConfigModule } from '../../../base/config/index';
import { PermissionModule } from '../../permission/index';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AppConfigModule,
    PermissionModule
  ],
  providers: [
    PublicSharingService,
    PublicSharingResolver,
  ],
  controllers: [
    PublicSharingController,
  ],
  exports: [
    PublicSharingService,
  ],
})
export class PublicSharingModule {}
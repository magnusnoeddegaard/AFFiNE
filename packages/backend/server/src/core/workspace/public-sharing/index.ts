import { Module } from '@nestjs/common';
import { PublicSharingService } from './service';
import { PublicSharingResolver } from './resolver';
import { PublicSharingController } from './controller';

@Module({
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
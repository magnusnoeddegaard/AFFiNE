import { Module } from '@nestjs/common';
import { DocumentSharingService } from './service';
import { DocumentSharingResolver } from './resolver';
import { DocumentSharingController } from './controller';

@Module({
  providers: [
    DocumentSharingService,
    DocumentSharingResolver,
  ],
  controllers: [
    DocumentSharingController,
  ],
  exports: [
    DocumentSharingService,
  ],
})
export class DocumentSharingModule {}
import { Module } from '@nestjs/common';
import { DocumentRenderService } from './service';
import { DocumentRenderController } from './controller';
import { DocumentRenderResolver } from './resolver';

@Module({
  providers: [
    DocumentRenderService,
    DocumentRenderResolver,
  ],
  controllers: [DocumentRenderController],
  exports: [DocumentRenderService],
})
export class DocumentRenderModule {}
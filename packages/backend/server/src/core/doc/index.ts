import { Module } from '@nestjs/common';
import { DocumentController } from './controller';
import { DocumentResolver } from './resolver';
import { DocumentService } from './service';
import { DocumentHistoryService } from './history.service';
import { DocumentHistoryResolver } from './history.resolver';
import { HistoryModel } from '../../models/history';
import { DocumentModel } from '../../models/doc';
import { DocumentSyncModule } from './sync';
import { DocumentRenderModule } from './render';
import { DocumentSharingModule } from './sharing';
import { PermissionModule } from '../permission';

@Module({
  imports: [
    PermissionModule,
    DocumentSyncModule, 
    DocumentRenderModule,
    DocumentSharingModule,
  ],
  providers: [
    DocumentService,
    DocumentResolver,
    DocumentHistoryService,
    DocumentHistoryResolver,
    HistoryModel,
    DocumentModel,
  ],
  controllers: [DocumentController],
  exports: [
    DocumentService, 
    DocumentHistoryService, 
    DocumentSyncModule, 
    DocumentRenderModule,
    DocumentSharingModule,
  ],
})
export class DocumentModule {}
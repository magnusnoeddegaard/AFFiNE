import { Module } from '@nestjs/common';
import { DocumentSyncGateway } from './sync.gateway';
import { DocumentSyncService } from './sync.service';
import { DocumentModel } from '../../../models/doc';
import { DocumentHistoryService } from '../history.service';
import { HistoryModel } from '../../../models/history';

@Module({
  providers: [
    DocumentSyncGateway,
    DocumentSyncService,
    DocumentModel,
    DocumentHistoryService,
    HistoryModel,
  ],
  exports: [DocumentSyncService],
})
export class DocumentSyncModule {}
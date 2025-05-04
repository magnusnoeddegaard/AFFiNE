import { Module } from '@nestjs/common';

import { DocumentModel } from '../../models/doc';
import { HistoryModel } from '../../models/history';
import { PermissionModule } from '../permission';
import { MutexModule } from '../../base/mutex'; // Import MutexModule
import { DocumentController } from './controller';
import { DocumentHistoryResolver } from './history.resolver';
import { DocumentHistoryService } from './history.service';
import { DocumentRenderModule } from './render';
import { DocumentResolver } from './resolver';
import { DocumentService } from './service';
import { DocumentSharingModule } from './sharing';
import { DocumentSyncModule } from './sync';
import { DatabaseDocReader } from './database-doc-reader.js';

export { DocumentHistoryService } from './history.service';
export { DocumentService } from './service';
export { DatabaseDocReader } from './database-doc-reader.js';

@Module({
  imports: [
    PermissionModule,
    DocumentSyncModule,
    DocumentRenderModule,
    DocumentSharingModule,
    MutexModule, // Add MutexModule to imports array
  ],
  providers: [
    DocumentService,
    DocumentResolver,
    DocumentHistoryService,
    DocumentHistoryResolver,
    HistoryModel,
    DocumentModel,
    DatabaseDocReader,
  ],
  controllers: [DocumentController],
  exports: [
    DocumentService,
    DocumentHistoryService,
    DocumentSyncModule,
    DocumentRenderModule,
    DocumentSharingModule,
    DatabaseDocReader,
    DocumentModel,
  ],
})
export class DocumentModule {}
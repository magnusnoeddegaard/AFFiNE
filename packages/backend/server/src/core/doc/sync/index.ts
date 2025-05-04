import { Module } from '@nestjs/common';
import { DocumentSyncGateway } from './sync.gateway';
import { DocumentSyncService } from './sync.service';
import { DocumentModel } from '../../../models/doc';
import { DocumentHistoryService } from '../history.service';
import { HistoryModel } from '../../../models/history';
import { MutexModule } from '../../../base/mutex/mutex.module';
import { RedisModule } from '../../../base/redis/index'

@Module({
  imports: [
    MutexModule,
    RedisModule,
  ],
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
import { Module, forwardRef } from '@nestjs/common';
import { DocumentRenderService } from './service';
import { DocumentRenderController } from './controller';
import { DocumentRenderResolver } from './resolver';
import { DocumentModule } from '../index';
import { PermissionModule } from '../../permission';
import { MutexModule } from '../../../base/mutex';
import { StorageModule } from '../../../base/storage';

@Module({
  imports: [
    forwardRef(() => DocumentModule),
    PermissionModule,  // This is required for PermissionService
    MutexModule,      // This is required for MutexService
    StorageModule,    // This is required for StorageService
  ],
  providers: [
    DocumentRenderService,
    DocumentRenderResolver,
  ],
  controllers: [DocumentRenderController],
  exports: [DocumentRenderService],
})
export class DocumentRenderModule {}
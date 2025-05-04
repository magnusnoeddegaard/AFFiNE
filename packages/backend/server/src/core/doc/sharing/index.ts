import { Module, forwardRef } from '@nestjs/common';
import { DocumentSharingService } from './service';
import { DocumentSharingResolver } from './resolver';
import { DocumentSharingController } from './controller';
import { ConfigModule } from '../../../base/config/index';
import { PrismaModule } from '../../../base/prisma/index';
import { PermissionModule } from '../../permission/index';
import { WorkspaceModule } from '../../workspace/index';
import { WorkspaceActivityModule } from '../../workspace/activity/index';
import { DocumentModule } from '../index';
import { DocumentRenderModule } from '../render/index';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    PermissionModule,
    WorkspaceModule,
    WorkspaceActivityModule,
    forwardRef(() => DocumentModule),
    forwardRef(() => DocumentRenderModule),
  ],
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
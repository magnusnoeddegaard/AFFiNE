import { Module } from '@nestjs/common';

import { PermissionModule } from '../permission';
import { ConfigModule as AppConfigModule } from '../../base/config';
import { PrismaModule } from '../../base/prisma';
import { MutexModule } from '../../base/mutex';
import {
  WorkspaceInvitationResolver,
  WorkspaceMemberResolver,
  WorkspaceResolver,
} from './resolver';
import { WorkspaceService } from './service';

export { WorkspaceService } from './service';

@Module({
  imports: [
    PermissionModule,
    AppConfigModule,
    PrismaModule,
    MutexModule,
  ],
  providers: [
    WorkspaceService,
    WorkspaceResolver,
    WorkspaceMemberResolver,
    WorkspaceInvitationResolver,
  ],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
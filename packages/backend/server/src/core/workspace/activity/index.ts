import { Module } from '@nestjs/common';
import { WorkspaceActivityService } from './service';
import { WorkspaceActivityResolver } from './resolver';
import { PermissionModule } from '../../permission';

@Module({
  imports: [PermissionModule],
  providers: [
    WorkspaceActivityService,
    WorkspaceActivityResolver
  ],
  exports: [
    WorkspaceActivityService
  ]
})
export class WorkspaceActivityModule {}
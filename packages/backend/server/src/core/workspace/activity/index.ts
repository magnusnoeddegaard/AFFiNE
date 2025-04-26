import { Module } from '@nestjs/common';
import { WorkspaceActivityService } from './service';
import { WorkspaceActivityResolver } from './resolver';

@Module({
  providers: [
    WorkspaceActivityService,
    WorkspaceActivityResolver
  ],
  exports: [
    WorkspaceActivityService
  ]
})
export class WorkspaceActivityModule {}
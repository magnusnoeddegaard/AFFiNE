import { Module } from '@nestjs/common';
import { PermissionService } from './service';
import { PermissionResolver } from './resolver';

@Module({
  providers: [PermissionService, PermissionResolver],
  exports: [PermissionService],
})
export class PermissionModule {}
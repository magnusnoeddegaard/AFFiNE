import { Module } from '@nestjs/common';

import { PermissionResolver } from './resolver';
import { PermissionService } from './service';

export { PermissionService } from './service';

@Module({
  providers: [PermissionService, PermissionResolver],
  exports: [PermissionService],
})
export class PermissionModule {}

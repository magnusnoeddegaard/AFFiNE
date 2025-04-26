import { Module } from '@nestjs/common';
import { AuthModule } from './auth';
import { UserModule } from './user';
import { DocumentModule } from './doc';
import { StorageModule } from './storage';
import { PermissionModule } from './permission';
import { WorkspaceModule } from './workspace';

@Module({
  imports: [
    AuthModule,
    UserModule,
    DocumentModule,
    StorageModule,
    PermissionModule,
    WorkspaceModule,
  ],
  exports: [
    AuthModule,
    UserModule,
    DocumentModule,
    StorageModule,
    PermissionModule,
    WorkspaceModule,
  ],
})
export class CoreModule {}
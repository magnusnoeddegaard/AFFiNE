import { Module } from '@nestjs/common';
import { WorkspaceService } from './service';
import { WorkspaceResolver, WorkspaceMemberResolver, WorkspaceInvitationResolver } from './resolver';
import { PermissionModule } from '../permission';
import { TeamModule } from './team/module';
import { InvitationModule } from './invitation/invitation.module';
import { WorkspaceActivityModule } from './activity';
import { PublicSharingModule } from './public-sharing';

@Module({
  imports: [
    PermissionModule,
    TeamModule,
    InvitationModule,
    WorkspaceActivityModule,
    PublicSharingModule,
  ],
  providers: [
    WorkspaceService,
    WorkspaceResolver,
    WorkspaceMemberResolver,
    WorkspaceInvitationResolver,
  ],
  exports: [
    WorkspaceService,
  ],
})
export class WorkspaceModule {}
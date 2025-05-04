import { Module } from '@nestjs/common';

import { MutexModule } from '../../../base/mutex';
import { AuthModule } from '../../auth';
import { NotificationModule } from '../../notification/notification.module';
import { PermissionModule } from '../../permission';
import { TeamMemberResolver, TeamResolver } from './resolver';
import { TeamService } from './service';
// Add the missing model imports
import { TeamModel } from '../../../models/team';
import { TeamMemberModel } from '../../../models/team-member';
import { UserModel } from '../../../models/user';

@Module({
  imports: [AuthModule, PermissionModule, NotificationModule, MutexModule],
  providers: [
    TeamService, 
    TeamResolver, 
    TeamMemberResolver,
    // Add the missing models to providers
    TeamModel,
    TeamMemberModel,
    UserModel
  ],
  exports: [TeamService],
})
export class TeamModule {}
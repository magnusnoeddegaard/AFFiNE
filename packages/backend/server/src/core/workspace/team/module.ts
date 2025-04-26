import { Module } from '@nestjs/common';
import { TeamService } from './service';
import { TeamResolver, TeamMemberResolver } from './resolver';
import { AuthModule } from '../../auth/module';
import { PermissionModule } from '../../permission/module';
import { NotificationModule } from '../../notification/module';
import { MutexModule } from '../../../base/mutex/mutex.module';

@Module({
  imports: [
    AuthModule,
    PermissionModule,
    NotificationModule,
    MutexModule,
  ],
  providers: [
    TeamService,
    TeamResolver,
    TeamMemberResolver,
  ],
  exports: [
    TeamService,
  ],
})
export class TeamModule {}
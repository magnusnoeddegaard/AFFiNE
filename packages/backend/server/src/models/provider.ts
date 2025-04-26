import { Provider } from '@nestjs/common';
import { DocumentModel } from './doc';
import { DocumentUserModel } from './doc-user';
import { HistoryModel } from './history';
import { UserModel } from './user';
import { UserSettingsModel } from './user-settings';
import { WorkspaceModel } from './workspace';
import { WorkspaceUserModel } from './workspace-user';
import { NotificationModel } from './notification';
import { VerificationTokenModel } from './verification-token';
import { SessionModel } from './session';
import { PermissionModel } from './permission';
import { TeamModel } from './team';
import { TeamMemberModel } from './team-member';

/**
 * Model providers for dependency injection
 */
export const modelProviders: Provider[] = [
  DocumentModel,
  DocumentUserModel,
  HistoryModel,
  UserModel,
  UserSettingsModel,
  WorkspaceModel,
  WorkspaceUserModel,
  NotificationModel,
  VerificationTokenModel,
  SessionModel,
  PermissionModel,
  TeamModel,
  TeamMemberModel,
];
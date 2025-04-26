import { SoftDelete, Timestamps } from './index';

/**
 * Workspace visibility options
 */
export enum WorkspaceVisibility {
  PRIVATE = 'PRIVATE',
  RESTRICTED = 'RESTRICTED',
  PUBLIC = 'PUBLIC',
}

/**
 * Workspace base interface
 */
export interface WorkspaceBase extends Timestamps, SoftDelete {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  visibility: WorkspaceVisibility;
  ownerId: string;
  settings: WorkspaceSettings;
}

/**
 * Workspace settings
 */
export interface WorkspaceSettings {
  defaultDocumentVisibility: string;
  documentNameTemplate: string;
  customTheme: Record<string, any> | null;
  features: WorkspaceFeatures;
}

/**
 * Workspace enabled features
 */
export interface WorkspaceFeatures {
  ai: boolean;
  history: boolean;
  realTimeCollaboration: boolean;
  publicSharing: boolean;
}

/**
 * Workspace user role
 */
export enum WorkspaceUserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Workspace user relation
 */
export interface WorkspaceUser extends Timestamps {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceUserRole;
  invitedBy: string | null;
  invitedAt: Date | null;
  joinedAt: Date | null;
  settings: WorkspaceUserSettings;
}

/**
 * User-specific settings for a workspace
 */
export interface WorkspaceUserSettings {
  showOnHomepage: boolean;
  defaultDocumentView: string;
  notificationSettings: WorkspaceNotificationSettings;
}

/**
 * Workspace notification settings
 */
export interface WorkspaceNotificationSettings {
  documentUpdates: boolean;
  comments: boolean;
  mentions: boolean;
  invites: boolean;
}

/**
 * Team in a workspace
 */
export interface Team extends Timestamps {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  workspaceId: string;
  leaderId: string | null;
  settings: TeamSettings;
}

/**
 * Team settings
 */
export interface TeamSettings {
  color: string | null;
  defaultRole: WorkspaceUserRole;
  features: {
    privateDocuments: boolean;
    privateChat: boolean;
  };
}

/**
 * Team member relation
 */
export interface TeamMember extends Timestamps {
  id: string;
  teamId: string;
  userId: string;
  role: WorkspaceUserRole;
  addedBy: string;
  addedAt: Date;
}
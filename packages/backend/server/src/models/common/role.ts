import { Timestamps } from './index';

/**
 * Resource types for permissions
 */
export enum ResourceType {
  DOCUMENT = 'DOCUMENT',
  WORKSPACE = 'WORKSPACE',
  BLOB = 'BLOB',
}

/**
 * Permission levels
 */
export enum PermissionLevel {
  NONE = 'NONE',
  READ = 'READ',
  COMMENT = 'COMMENT',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

/**
 * Permission base interface
 */
export interface PermissionBase extends Timestamps {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  userId: string | null;
  workspaceId: string | null;
  userGroupId: string | null;
  level: PermissionLevel;
  inheritFrom: string | null;
}

/**
 * User group for permissions
 */
export interface UserGroup extends Timestamps {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
}

/**
 * User group member relation
 */
export interface UserGroupMember extends Timestamps {
  id: string;
  userGroupId: string;
  userId: string;
}
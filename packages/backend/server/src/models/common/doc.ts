import { SoftDelete, Timestamps } from './index';

/**
 * Document visibility options
 */
export enum DocumentVisibility {
  PRIVATE = 'PRIVATE',
  RESTRICTED = 'RESTRICTED',
  PUBLIC = 'PUBLIC',
}

/**
 * Document type enum
 */
export enum DocumentType {
  DOC = 'DOC',
  PAGE = 'PAGE',
  WHITEBOARD = 'WHITEBOARD',
}

/**
 * Document base interface
 */
export interface DocumentBase extends Timestamps, SoftDelete {
  id: string;
  title: string;
  type: DocumentType;
  visibility: DocumentVisibility;
  workspaceId: string;
  parentId?: string | null;
  order?: number;
  favorite?: boolean;
  favoriteOrder?: number | null;
  properties?: Record<string, any>;
}

/**
 * Document content type
 */
export interface DocumentContent extends Timestamps {
  id: string;
  documentId: string;
  version: number;
  content: string;
  blobIds: string[];
}

/**
 * Document history entry
 */
export interface DocumentHistory extends Timestamps {
  id: string;
  documentId: string;
  contentId: string;
  version: number;
  createdById: string;
  message?: string;
}

/**
 * Document permission levels
 */
export enum DocumentPermission {
  NONE = 'NONE',
  READ = 'READ',
  COMMENT = 'COMMENT',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

/**
 * Document user relation
 */
export interface DocumentUser extends Timestamps {
  id: string;
  documentId: string;
  userId: string;
  permission: DocumentPermission;
}
import { Timestamps } from './index';

/**
 * User base interface
 */
export interface UserBase extends Timestamps {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  isActive: boolean;
  authId: string; // Reference to Supabase auth user
}

/**
 * User settings interface
 */
export interface UserSettings extends Timestamps {
  id: string;
  userId: string;
  theme: UserTheme;
  locale: string;
  timezone: string;
  notificationPreferences: NotificationPreferences;
  editorSettings: EditorSettings;
  customizations: Record<string, any>;
}

/**
 * User theme options
 */
export enum UserTheme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  docComments: boolean;
  docEdits: boolean;
  workspaceInvites: boolean;
  workspaceUpdates: boolean;
  mentions: boolean;
}

/**
 * Editor settings
 */
export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  spellcheck: boolean;
  autocorrect: boolean;
  defaultDocType: string;
}

/**
 * User authentication settings
 */
export interface UserAuthentication extends Timestamps {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}
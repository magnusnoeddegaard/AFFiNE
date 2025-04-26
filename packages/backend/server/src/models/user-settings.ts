import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { EditorSettings, NotificationPreferences, UserSettings, UserTheme } from './common';

/**
 * UserSettings model for user settings operations
 */
@Injectable()
export class UserSettingsModel extends BaseModel<UserSettings> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.userSettings;
  }

  /**
   * Find settings by user ID
   * @param userId The user ID
   * @returns The user settings or null
   */
  async findByUserId(userId: string): Promise<UserSettings | null> {
    return this.model.findUnique({
      where: { userId },
    });
  }

  /**
   * Update user theme
   * @param userId The user ID
   * @param theme The new theme
   * @returns The updated settings
   */
  async updateTheme(userId: string, theme: UserTheme): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    return this.update(settings.id, { theme });
  }

  /**
   * Update user locale
   * @param userId The user ID
   * @param locale The new locale
   * @returns The updated settings
   */
  async updateLocale(userId: string, locale: string): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    return this.update(settings.id, { locale });
  }

  /**
   * Update user timezone
   * @param userId The user ID
   * @param timezone The new timezone
   * @returns The updated settings
   */
  async updateTimezone(userId: string, timezone: string): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    return this.update(settings.id, { timezone });
  }

  /**
   * Update notification preferences
   * @param userId The user ID
   * @param preferences The new preferences
   * @returns The updated settings
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    return this.update(settings.id, {
      notificationPreferences: {
        ...settings.notificationPreferences,
        ...preferences,
      },
    });
  }

  /**
   * Update editor settings
   * @param userId The user ID
   * @param editorSettings The new editor settings
   * @returns The updated settings
   */
  async updateEditorSettings(
    userId: string,
    editorSettings: Partial<EditorSettings>,
  ): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    return this.update(settings.id, {
      editorSettings: {
        ...settings.editorSettings,
        ...editorSettings,
      },
    });
  }

  /**
   * Update custom settings
   * @param userId The user ID
   * @param key The setting key
   * @param value The setting value
   * @returns The updated settings
   */
  async updateCustomSetting(
    userId: string,
    key: string,
    value: any,
  ): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    const customizations = { ...settings.customizations, [key]: value };
    
    return this.update(settings.id, { customizations });
  }

  /**
   * Reset settings to defaults
   * @param userId The user ID
   * @returns The updated settings
   */
  async resetToDefaults(userId: string): Promise<UserSettings> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      throw new Error(`Settings not found for user ${userId}`);
    }
    
    return this.update(settings.id, {
      theme: 'SYSTEM',
      locale: 'en-US',
      timezone: 'UTC',
      notificationPreferences: {
        email: true,
        inApp: true,
        docComments: true,
        docEdits: true,
        workspaceInvites: true,
        workspaceUpdates: true,
        mentions: true,
      },
      editorSettings: {
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1.5,
        spellcheck: true,
        autocorrect: true,
        defaultDocType: 'DOC',
      },
      customizations: {},
    });
  }
}
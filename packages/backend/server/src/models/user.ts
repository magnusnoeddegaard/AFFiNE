import { Injectable } from '@nestjs/common';

import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { UserBase } from './common';

/**
 * User model for user operations
 */
@Injectable()
export class UserModel extends BaseModel<UserBase> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.user;
  }

  /**
   * Find a user by email
   * @param email The user email
   * @returns The user or null
   */
  async findByEmail(email: string): Promise<UserBase | null> {
    return this.model.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by Supabase auth ID
   * @param authId The auth ID
   * @returns The user or null
   */
  async findByAuthId(authId: string): Promise<UserBase | null> {
    return this.model.findUnique({
      where: { authId },
    });
  }

  /**
   * Create a user with settings
   * @param userData The user data
   * @returns The created user
   */
  async createWithSettings(
    userData: Omit<UserBase, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserBase> {
    return this.prisma.$transaction(async (tx: any) => {
      // Create the user
      const user = await tx.user.create({
        data: userData,
      });

      // Create default user settings
      await tx.userSettings.create({
        data: {
          userId: user.id,
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
        },
      });

      return user;
    });
  }

  /**
   * Update user profile
   * @param id The user ID
   * @param data The update data
   * @returns The updated user
   */
  async updateProfile(
    id: string,
    data: Pick<UserBase, 'name' | 'avatarUrl'>
  ): Promise<UserBase> {
    return this.update(id, data);
  }

  /**
   * Update user email
   * @param id The user ID
   * @param email The new email
   * @returns The updated user
   */
  async updateEmail(id: string, email: string): Promise<UserBase> {
    return this.update(id, { email });
  }

  /**
   * Update last login time
   * @param id The user ID
   * @returns The updated user
   */
  async updateLastLogin(id: string): Promise<UserBase> {
    return this.update(id, { lastLoginAt: new Date() });
  }

  /**
   * Deactivate a user
   * @param id The user ID
   * @returns The updated user
   */
  async deactivate(id: string): Promise<UserBase> {
    return this.update(id, { isActive: false });
  }

  /**
   * Reactivate a user
   * @param id The user ID
   * @returns The updated user
   */
  async reactivate(id: string): Promise<UserBase> {
    return this.update(id, { isActive: true });
  }

  /**
   * Check if an email is already in use
   * @param email The email to check
   * @returns Whether the email is in use
   */
  async isEmailInUse(email: string): Promise<boolean> {
    return this.exists({ email });
  }
}

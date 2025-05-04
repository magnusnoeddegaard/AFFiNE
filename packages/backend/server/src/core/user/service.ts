import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../base/prisma';
import { StorageService } from '../../base/storage';
import { AuthService } from '../auth/service';
import { UpdateUserProfileInput, UpdateUserSettingsInput, UserProfile, UserSettings } from './types';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private authService: AuthService,
    private storageService: StorageService,
  ) {}

  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.name || undefined,
      avatarUrl: user.avatarUrl || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUserProfile(userId: string, data: UpdateUserProfileInput): Promise<UserProfile> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.displayName,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.name || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    // First check if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get user settings or create default if not exists
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      return {
        userId: settings.userId,
        theme: settings.theme || undefined,
        language: settings.language || undefined,
        notifications: settings.notifications,
        updatedAt: settings.updatedAt,
      };
    }

    // Create default settings if none exist
    const defaultSettings = await this.prisma.userSettings.create({
      data: {
        userId,
        theme: 'light',
        language: 'en',
        notifications: false,
      },
    });

    return {
      userId: defaultSettings.userId,
      theme: defaultSettings.theme || undefined,
      language: defaultSettings.language || undefined,
      notifications: defaultSettings.notifications,
      updatedAt: defaultSettings.updatedAt,
    };
  }

  async updateUserSettings(userId: string, data: UpdateUserSettingsInput): Promise<UserSettings> {
    // First check if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Upsert user settings (update if exists, create if not)
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: {
        theme: data.theme !== undefined ? data.theme : undefined,
        language: data.language !== undefined ? data.language : undefined,
        notifications: data.notifications !== undefined ? data.notifications : undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        theme: data.theme || 'light',
        language: data.language || 'en',
        notifications: data.notifications !== undefined ? data.notifications : false,
      },
    });

    return {
      userId: settings.userId,
      theme: settings.theme || undefined,
      language: settings.language || undefined,
      notifications: settings.notifications,
      updatedAt: settings.updatedAt,
    };
  }

  async uploadAvatar(userId: string, file: Buffer, fileType: string): Promise<string> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Generate a unique key for the avatar
    const key = `avatars/${userId}/${Date.now()}.${fileType.split('/')[1]}`;

    // Store the file using the storage service
    await this.storageService.storeFile(key, file, {
      contentType: fileType,
      isPublic: "true",
    });

    // Get the public URL of the avatar
    const avatarUrl = await this.storageService.getFileUrl(key);

    // Update the user's avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return avatarUrl;
  }

  async updateEmail(userId: string, newEmail: string, password: string): Promise<UserProfile> {
    // Verify user and password
    const isValid = await this.authService.verifyCredentials(userId, password);
    
    if (!isValid) {
      throw new Error('Invalid password');
    }

    // Update email in Supabase and database
    await this.authService.updateEmail(userId, newEmail, password);
    
    // Update user in database
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.name || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async deleteAccount(userId: string, password: string): Promise<boolean> {
    // Verify user and password
    const isValid = await this.authService.verifyCredentials(userId, password);
    
    if (!isValid) {
      throw new Error('Invalid password');
    }

    // Delete user in Supabase
    await this.authService.deleteUser(userId, password);
    
    // Delete user in database - this should cascade delete all other user data
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return true;
  }
}
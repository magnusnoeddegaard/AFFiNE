import { Body, Controller, Delete, Get, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guard';
import { UserService } from './service';
import { UpdateEmailInput, UpdateUserProfileInput, UpdateUserSettingsInput, UserProfile, UserSettings } from './types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getUserProfile(@Body('userId') userId: string): Promise<UserProfile> {
    return this.userService.getUserProfile(userId);
  }

  @Put('profile')
  async updateUserProfile(
    @Body('userId') userId: string,
    @Body('data') data: UpdateUserProfileInput,
  ): Promise<UserProfile> {
    return this.userService.updateUserProfile(userId, data);
  }

  @Get('settings')
  async getUserSettings(@Body('userId') userId: string): Promise<UserSettings> {
    return this.userService.getUserSettings(userId);
  }

  @Put('settings')
  async updateUserSettings(
    @Body('userId') userId: string,
    @Body('data') data: UpdateUserSettingsInput,
  ): Promise<UserSettings> {
    return this.userService.updateUserSettings(userId, data);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Body('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const avatarUrl = await this.userService.uploadAvatar(userId, file.buffer, file.mimetype);
    return { avatarUrl };
  }

  @Put('email')
  async updateEmail(
    @Body('userId') userId: string,
    @Body() data: UpdateEmailInput,
  ): Promise<UserProfile> {
    return this.userService.updateEmail(userId, data.newEmail, data.password);
  }

  @Delete()
  async deleteAccount(
    @Body('userId') userId: string,
    @Body('password') password: string,
  ): Promise<{ success: boolean }> {
    const success = await this.userService.deleteAccount(userId, password);
    return { success };
  }
}
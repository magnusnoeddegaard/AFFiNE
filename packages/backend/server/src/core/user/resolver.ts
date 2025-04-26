import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guard';
import { UserService } from './service';
import { UpdateEmailInput, UpdateUserProfileInput, UpdateUserSettingsInput, UserProfile, UserSettings } from './types';

@Resolver(() => UserProfile)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => UserProfile)
  @UseGuards(JwtAuthGuard)
  async userProfile(@Context() context: any): Promise<UserProfile> {
    const userId = context.req.user.id;
    return this.userService.getUserProfile(userId);
  }

  @Mutation(() => UserProfile)
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(
    @Context() context: any,
    @Args('input') input: UpdateUserProfileInput,
  ): Promise<UserProfile> {
    const userId = context.req.user.id;
    return this.userService.updateUserProfile(userId, input);
  }

  @Query(() => UserSettings)
  @UseGuards(JwtAuthGuard)
  async userSettings(@Context() context: any): Promise<UserSettings> {
    const userId = context.req.user.id;
    return this.userService.getUserSettings(userId);
  }

  @Mutation(() => UserSettings)
  @UseGuards(JwtAuthGuard)
  async updateUserSettings(
    @Context() context: any,
    @Args('input') input: UpdateUserSettingsInput,
  ): Promise<UserSettings> {
    const userId = context.req.user.id;
    return this.userService.updateUserSettings(userId, input);
  }

  @Mutation(() => UserProfile)
  @UseGuards(JwtAuthGuard)
  async updateEmail(
    @Context() context: any,
    @Args('input') input: UpdateEmailInput,
  ): Promise<UserProfile> {
    const userId = context.req.user.id;
    return this.userService.updateEmail(userId, input.newEmail, input.password);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @Context() context: any,
    @Args('password') password: string,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.userService.deleteAccount(userId, password);
  }
}
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto, NotificationsResponseDto, CountResponseDto } from './dto/notification.dto';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationFilterInput } from './dto/notification-filter.input';

@Resolver(() => NotificationDto)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => NotificationsResponseDto)
  async notifications(
    @CurrentUser() user: any,
    @Args('filter', { nullable: true }) filter?: NotificationFilterInput,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
  ): Promise<NotificationsResponseDto> {
    const options = {
      skip,
      take: take || 20,
    };

    // If filter is for unread only
    if (filter?.unreadOnly) {
      const notifications = await this.notificationService.getUnreadNotifications(user.id, options);
      const totalCount = await this.notificationService.getUnreadCount(user.id);
      return { notifications, totalCount };
    }

    // Otherwise get all notifications
    const notifications = await this.notificationService.getUserNotifications(user.id, options);
    const totalCount = await this.notificationService.notificationModel.count({ userId: user.id });
    return { notifications, totalCount };
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => CountResponseDto)
  async notificationCount(
    @CurrentUser() user: any,
    @Args('unreadOnly', { type: () => Boolean, defaultValue: true }) unreadOnly: boolean,
  ): Promise<CountResponseDto> {
    let count: number;
    
    if (unreadOnly) {
      count = await this.notificationService.getUnreadCount(user.id);
    } else {
      count = await this.notificationService.notificationModel.count({ userId: user.id });
    }
    
    return { count };
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => NotificationDto)
  async readNotification(
    @CurrentUser() user: any,
    @Args('id') id: string,
  ): Promise<NotificationDto> {
    const notification = await this.notificationService.notificationModel.findById(id);
    
    // Check if the notification belongs to the user
    if (!notification || notification.userId !== user.id) {
      throw new Error('Notification not found');
    }
    
    return this.notificationService.markAsRead(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => CountResponseDto)
  async readAllNotifications(
    @CurrentUser() user: any,
  ): Promise<CountResponseDto> {
    const count = await this.notificationService.markAllAsRead(user.id);
    return { count };
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => NotificationDto)
  async dismissNotification(
    @CurrentUser() user: any,
    @Args('id') id: string,
  ): Promise<NotificationDto> {
    const notification = await this.notificationService.notificationModel.findById(id);
    
    // Check if the notification belongs to the user
    if (!notification || notification.userId !== user.id) {
      throw new Error('Notification not found');
    }
    
    return this.notificationService.dismiss(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => CountResponseDto)
  async dismissAllNotifications(
    @CurrentUser() user: any,
  ): Promise<CountResponseDto> {
    const count = await this.notificationService.dismissAll(user.id);
    return { count };
  }
}
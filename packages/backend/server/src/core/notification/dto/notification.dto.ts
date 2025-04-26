import { ObjectType, Field, ID, GraphQLISODateTime, Int, registerEnumType } from '@nestjs/graphql';
import { NotificationType } from '../../../models/notification';

// Register the notification type enum for GraphQL
registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'Types of notifications',
});

@ObjectType()
export class NotificationDto {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => NotificationType)
  type: NotificationType;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field()
  read: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  readAt: Date | null;

  @Field()
  dismissed: boolean;

  @Field()
  email: boolean;

  @Field()
  emailSent: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  emailSentAt: Date | null;

  @Field(() => String)
  data: string; // JSON string
}

@ObjectType()
export class NotificationsResponseDto {
  @Field(() => [NotificationDto])
  notifications: NotificationDto[];

  @Field(() => Int)
  totalCount: number;
}

@ObjectType()
export class CountResponseDto {
  @Field(() => Int)
  count: number;
}
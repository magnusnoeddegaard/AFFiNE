import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  WORKSPACE_INVITATION = 'WORKSPACE_INVITATION',
  WORKSPACE_JOIN = 'WORKSPACE_JOIN',
  WORKSPACE_LEAVE = 'WORKSPACE_LEAVE',
  WORKSPACE_ROLE_CHANGED = 'WORKSPACE_ROLE_CHANGED',
  DOCUMENT_SHARE = 'DOCUMENT_SHARE',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  DOCUMENT_EDIT = 'DOCUMENT_EDIT',
  DOCUMENT_COMMENT = 'DOCUMENT_COMMENT',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_REPLIED = 'COMMENT_REPLIED',
  MENTION = 'MENTION',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'The type of notification',
});

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  DISMISSED = 'DISMISSED',
}

registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
  description: 'The status of a notification',
});

@ObjectType()
export class NotificationTarget {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => String, { nullable: true })
  name?: string;
}

@ObjectType()
export class NotificationActor {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;
}

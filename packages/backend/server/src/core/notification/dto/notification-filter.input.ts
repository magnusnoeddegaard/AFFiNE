import { InputType, Field } from '@nestjs/graphql';
import { NotificationType } from '../../../models/notification';

@InputType()
export class NotificationFilterInput {
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  unreadOnly?: boolean;

  @Field(() => [NotificationType], { nullable: true })
  types?: NotificationType[];

  @Field(() => Boolean, { nullable: true })
  includeEmailSent?: boolean;

  @Field(() => Boolean, { nullable: true })
  includeDismissed?: boolean;
}
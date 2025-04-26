import { ObjectType, Field, ID, GraphQLISODateTime, registerEnumType } from '@nestjs/graphql';
import { WorkspaceUserRole } from '../../../../models/common';

// Register the workspace user role enum for GraphQL
registerEnumType(WorkspaceUserRole, {
  name: 'WorkspaceUserRole',
  description: 'Roles for workspace users',
});

@ObjectType()
export class InvitationResponseDto {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => ID, { nullable: true })
  inviteId?: string;
}

@ObjectType()
export class InviteLinkResponseDto {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  inviteLink?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  expiresAt?: Date;
}

@ObjectType()
export class AcceptInvitationResponseDto {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => ID, { nullable: true })
  workspaceId?: string;
}

@ObjectType()
export class InvitationDto {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  email: string;

  @Field()
  type: string;

  @Field(() => WorkspaceUserRole)
  role: WorkspaceUserRole;

  @Field(() => ID)
  inviterId: string;

  @Field()
  isPublicLink: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  expiresAt: Date;
}
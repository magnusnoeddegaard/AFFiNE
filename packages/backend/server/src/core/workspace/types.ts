import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum WorkspaceVisibility {
  PRIVATE = 'PRIVATE',
  RESTRICTED = 'RESTRICTED',
  PUBLIC = 'PUBLIC',
}

registerEnumType(WorkspaceVisibility, {
  name: 'WorkspaceVisibility',
  description: 'The visibility of a workspace',
});

export enum PublicAccessLevel {
  NONE = 'NONE',
  READ = 'READ',
  COMMENT = 'COMMENT',
  WRITE = 'WRITE',
}

registerEnumType(PublicAccessLevel, {
  name: 'PublicAccessLevel',
  description: 'The access level granted to the public for a workspace',
});

@ObjectType()
export class Workspace {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => WorkspaceVisibility)
  visibility: WorkspaceVisibility;

  @Field(() => PublicAccessLevel, { defaultValue: PublicAccessLevel.NONE })
  publicAccessLevel: PublicAccessLevel;

  @Field(() => Boolean, { defaultValue: false })
  publicJoinable: boolean;

  @Field(() => String)
  ownerId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => WorkspaceVisibility, { defaultValue: WorkspaceVisibility.PRIVATE })
  visibility?: WorkspaceVisibility;
  
  @Field(() => PublicAccessLevel, { defaultValue: PublicAccessLevel.NONE })
  publicAccessLevel?: PublicAccessLevel;
  
  @Field(() => Boolean, { defaultValue: false })
  publicJoinable?: boolean;
}

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => WorkspaceVisibility, { nullable: true })
  visibility?: WorkspaceVisibility;
  
  @Field(() => PublicAccessLevel, { nullable: true })
  publicAccessLevel?: PublicAccessLevel;
  
  @Field(() => Boolean, { nullable: true })
  publicJoinable?: boolean;
}

@ObjectType()
export class PublicWorkspaceInfo {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => PublicAccessLevel)
  publicAccessLevel: PublicAccessLevel;

  @Field(() => Boolean)
  publicJoinable: boolean;
  
  @Field(() => Date)
  createdAt: Date;
  
  @Field(() => Date)
  updatedAt: Date;
}

export enum WorkspaceMemberRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

registerEnumType(WorkspaceMemberRole, {
  name: 'WorkspaceMemberRole',
  description: 'The role of a member in a workspace',
});

@ObjectType()
export class WorkspaceMember {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceId: string;

  @Field(() => ID)
  userId: string;

  @Field(() => WorkspaceMemberRole)
  role: WorkspaceMemberRole;

  @Field(() => Date)
  joinedAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class AddWorkspaceMemberInput {
  @Field(() => String)
  workspaceId: string;

  @Field(() => String)
  userId: string;

  @Field(() => WorkspaceMemberRole, { defaultValue: WorkspaceMemberRole.MEMBER })
  role?: WorkspaceMemberRole;
}

@InputType()
export class UpdateWorkspaceMemberRoleInput {
  @Field(() => WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

registerEnumType(InvitationStatus, {
  name: 'InvitationStatus',
  description: 'The status of a workspace invitation',
});

@ObjectType()
export class WorkspaceInvitation {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceId: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String)
  invitedBy: string;

  @Field(() => WorkspaceMemberRole)
  role: WorkspaceMemberRole;

  @Field(() => InvitationStatus)
  status: InvitationStatus;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;
}

@InputType()
export class InviteToWorkspaceInput {
  @Field(() => String)
  workspaceId: string;

  @Field(() => String)
  email: string;

  @Field(() => WorkspaceMemberRole, { defaultValue: WorkspaceMemberRole.MEMBER })
  role?: WorkspaceMemberRole;
}

@InputType()
export class RespondToInvitationInput {
  @Field(() => InvitationStatus)
  status: InvitationStatus;
}

export enum ActivityType {
  DOCUMENT_CREATED = 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  MEMBER_ROLE_UPDATED = 'MEMBER_ROLE_UPDATED',
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  PERMISSION_UPDATED = 'PERMISSION_UPDATED',
}

registerEnumType(ActivityType, {
  name: 'ActivityType',
  description: 'The type of activity in a workspace',
});

@ObjectType()
export class WorkspaceActivity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceId: string;

  @Field(() => ID, { nullable: true })
  documentId?: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ActivityType)
  activityType: ActivityType;

  @Field(() => String, { nullable: true })
  details?: string;
  
  @Field(() => ID, { nullable: true })
  targetId?: string;

  @Field(() => Date)
  createdAt: Date;
}

@InputType()
export class GetWorkspaceActivitiesInput {
  @Field(() => String)
  workspaceId: string;

  @Field(() => [ActivityType], { nullable: true })
  activityTypes?: ActivityType[];

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Number, { nullable: true })
  limit?: number;

  @Field(() => Number, { nullable: true })
  offset?: number;
}
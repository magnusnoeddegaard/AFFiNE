import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TeamMemberRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
}

registerEnumType(TeamMemberRole, {
  name: 'TeamMemberRole',
  description: 'The role of a member in a team',
});

@ObjectType()
export class Team {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => ID)
  workspaceId: string;

  @Field(() => ID, { nullable: true })
  leaderId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String, { nullable: true })
  color?: string;
}

@InputType()
export class CreateTeamInput {
  @Field(() => String)
  workspaceId: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  color?: string;
}

@InputType()
export class UpdateTeamInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  color?: string;
}

@ObjectType()
export class TeamMember {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => ID)
  userId: string;

  @Field(() => TeamMemberRole)
  role: TeamMemberRole;

  @Field(() => ID)
  addedBy: string;

  @Field(() => Date)
  addedAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;
}

@InputType()
export class AddTeamMemberInput {
  @Field(() => String)
  teamId: string;

  @Field(() => String)
  userId: string;

  @Field(() => TeamMemberRole, { defaultValue: TeamMemberRole.MEMBER })
  role?: TeamMemberRole;
}

@InputType()
export class UpdateTeamMemberRoleInput {
  @Field(() => TeamMemberRole)
  role: TeamMemberRole;
}

@InputType()
export class BulkTeamMemberInput {
  @Field(() => String)
  teamId: string;

  @Field(() => [String])
  userIds: string[];

  @Field(() => TeamMemberRole, { defaultValue: TeamMemberRole.MEMBER })
  role?: TeamMemberRole;
}
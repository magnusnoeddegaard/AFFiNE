import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum PermissionLevel {
  NONE = 'NONE',
  READ = 'READ',
  COMMENT = 'COMMENT',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

registerEnumType(PermissionLevel, {
  name: 'PermissionLevel',
  description: 'The permission level for a resource',
});

export enum ResourceType {
  DOCUMENT = 'DOCUMENT',
  WORKSPACE = 'WORKSPACE',
}

registerEnumType(ResourceType, {
  name: 'ResourceType',
  description: 'The type of resource',
});

@ObjectType()
export class Permission {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  resourceId: string;

  @Field(() => ResourceType)
  resourceType: ResourceType;

  @Field(() => String)
  userId: string;

  @Field(() => PermissionLevel)
  level: PermissionLevel;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreatePermissionInput {
  @Field(() => String)
  resourceId: string;

  @Field(() => ResourceType)
  resourceType: ResourceType;

  @Field(() => String)
  userId: string;

  @Field(() => PermissionLevel)
  level: PermissionLevel;
}

@InputType()
export class UpdatePermissionInput {
  @Field(() => PermissionLevel)
  level: PermissionLevel;
}

@ObjectType()
export class PermissionCheck {
  @Field(() => Boolean)
  hasPermission: boolean;

  @Field(() => PermissionLevel, { nullable: true })
  currentLevel?: PermissionLevel;
}
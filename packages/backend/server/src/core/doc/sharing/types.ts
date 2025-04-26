import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { PermissionLevel } from '../../permission/types';

@ObjectType()
export class PublicShareLink {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  documentId: string;

  @Field(() => String)
  token: string;

  @Field(() => String)
  url: string;

  @Field(() => PermissionLevel)
  permissionLevel: PermissionLevel;

  @Field(() => Boolean)
  allowAnonymous: boolean;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => ID)
  createdBy: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  lastAccessedAt?: Date;

  @Field(() => Int)
  accessCount: number;
}

@InputType()
export class CreateShareLinkInput {
  @Field(() => ID)
  documentId: string;

  @Field(() => PermissionLevel, { defaultValue: PermissionLevel.READ })
  permissionLevel?: PermissionLevel;

  @Field(() => Boolean, { defaultValue: true })
  allowAnonymous?: boolean;

  @Field(() => Int, { 
    description: 'Expiration time in days. Default is 30 days.',
    nullable: true,
    defaultValue: 30
  })
  expirationDays?: number;
}

@InputType()
export class UpdateShareLinkInput {
  @Field(() => PermissionLevel, { nullable: true })
  permissionLevel?: PermissionLevel;

  @Field(() => Boolean, { nullable: true })
  allowAnonymous?: boolean;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}
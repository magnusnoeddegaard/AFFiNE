import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

@ObjectType()
export class UserProfile {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  displayName?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class UpdateUserProfileInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

@ObjectType()
export class UserSettings {
  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  theme?: string;

  @Field(() => String, { nullable: true })
  language?: string;

  @Field(() => Boolean, { defaultValue: false })
  notifications: boolean;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class UpdateUserSettingsInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  theme?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  language?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  notifications?: boolean;
}

@InputType()
export class UpdateEmailInput {
  @Field(() => String)
  @IsEmail()
  newEmail: string;

  @Field(() => String)
  @IsString()
  password: string;
}
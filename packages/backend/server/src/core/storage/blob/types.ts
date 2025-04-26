import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum BlobType {
  ATTACHMENT = 'ATTACHMENT',
  IMAGE = 'IMAGE',
  AVATAR = 'AVATAR',
  OTHER = 'OTHER',
}

registerEnumType(BlobType, {
  name: 'BlobType',
  description: 'The type of blob',
});

@ObjectType()
export class Blob {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  key: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  mimeType: string;

  @Field(() => Number)
  size: number;

  @Field(() => BlobType)
  type: BlobType;

  @Field(() => String)
  url: string;

  @Field(() => String)
  createdBy: string;

  @Field(() => String, { nullable: true })
  documentId?: string;

  @Field(() => String, { nullable: true })
  workspaceId?: string;

  @Field(() => Date)
  createdAt: Date;
}

@InputType()
export class UploadBlobInput {
  @Field(() => String)
  @IsString()
  @MaxLength(255)
  name: string;

  @Field(() => BlobType)
  @IsEnum(BlobType)
  type: BlobType;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  documentId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  workspaceId?: string;
}
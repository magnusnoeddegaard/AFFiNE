import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum DocumentType {
  PAGE = 'PAGE',
  NOTE = 'NOTE',
  COLLECTION = 'COLLECTION',
}

registerEnumType(DocumentType, {
  name: 'DocumentType',
  description: 'The type of document',
});

export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  TRASHED = 'TRASHED',
}

registerEnumType(DocumentStatus, {
  name: 'DocumentStatus',
  description: 'The status of document',
});

@ObjectType()
export class Document {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => DocumentType)
  type: DocumentType;

  @Field(() => DocumentStatus)
  status: DocumentStatus;

  @Field(() => String)
  createdBy: string;

  @Field(() => String, { nullable: true })
  workspaceId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreateDocumentInput {
  @Field(() => String)
  @IsString()
  @MaxLength(255)
  title: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @Field(() => DocumentType)
  @IsEnum(DocumentType)
  type: DocumentType;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  parentId?: string;
}

@InputType()
export class UpdateDocumentInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @Field(() => DocumentStatus, { nullable: true })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}

@InputType()
export class DocumentFilters {
  @Field(() => [DocumentType], { nullable: true })
  @IsOptional()
  types?: DocumentType[];

  @Field(() => [DocumentStatus], { nullable: true })
  @IsOptional()
  statuses?: DocumentStatus[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  workspaceId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  parentId?: string;
}

@ObjectType()
export class DocumentContent {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  documentId: string;

  @Field(() => String)
  content: string;
  
  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class UpdateDocumentContentInput {
  @Field(() => String)
  @IsString()
  content: string;
}
import { Resolver, Query, Args, ID, InputType, Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DocumentRenderService, RenderFormat } from './service';

// Register RenderFormat enum for GraphQL
registerEnumType(RenderFormat, {
  name: 'RenderFormat',
  description: 'Document render format options',
});

@InputType()
export class RenderDocumentInput {
  @Field(() => ID)
  documentId: string;

  @Field(() => RenderFormat, { nullable: true, defaultValue: RenderFormat.HTML })
  format?: RenderFormat;

  @Field(() => Number, { nullable: true })
  version?: number;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  includeMetadata?: boolean;
}

@ObjectType()
export class DocumentRenderMetadata {
  @Field(() => String, { nullable: true })
  title?: string;
  
  @Field(() => String, { nullable: true })
  description?: string;
  
  @Field(() => String, { nullable: true })
  author?: string;
  
  @Field(() => Date, { nullable: true })
  createdAt?: Date;
  
  @Field(() => Date, { nullable: true })
  updatedAt?: Date;
  
  @Field(() => Number, { nullable: true })
  version?: number;
}

@ObjectType()
export class DocumentRenderInfo {
  @Field(() => String)
  url: string;
  
  @Field(() => String)
  mimeType: string;
  
  @Field(() => String)
  filename: string;
  
  @Field(() => DocumentRenderMetadata, { nullable: true })
  metadata?: DocumentRenderMetadata;
}

@Resolver()
@UseGuards(AuthGuard)
export class DocumentRenderResolver {
  constructor(
    private readonly documentRenderService: DocumentRenderService,
  ) {}

  /**
   * Get document render info - for building download/view links in the UI
   */
  @Query(() => DocumentRenderInfo, { nullable: true })
  async documentRenderInfo(
    @Args('input') input: RenderDocumentInput,
    @CurrentUser() userId: string,
  ): Promise<DocumentRenderInfo | null> {
    // Get render info without actually rendering the document
    const result = await this.documentRenderService.renderDocument(
      input.documentId,
      userId,
      {
        format: input.format,
        version: input.version,
        includeMetadata: input.includeMetadata,
      }
    );
    
    if (!result) {
      return null;
    }
    
    // Return render info
    return {
      url: `/documents/${input.documentId}/render?format=${input.format}${input.version ? `&version=${input.version}` : ''}`,
      mimeType: result.mimeType,
      filename: result.filename,
      metadata: result.metadata,
    };
  }
  
  /**
   * Get supported render formats
   */
  @Query(() => [String])
  renderFormats(): string[] {
    return Object.values(RenderFormat);
  }
}
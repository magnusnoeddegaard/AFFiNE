import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MentionService } from './mention.service';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MentionResponseDto } from './dto/mention.dto';

@Resolver()
export class MentionResolver {
  constructor(private readonly mentionService: MentionService) {}

  /**
   * Mention users in a document
   * @param user Current user
   * @param documentId Document ID
   * @param userIds User IDs to mention
   * @returns Result of the mention operation
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => MentionResponseDto)
  async mentionUsers(
    @CurrentUser() user: any,
    @Args('documentId') documentId: string,
    @Args('userIds', { type: () => [String] }) userIds: string[],
  ): Promise<MentionResponseDto> {
    // Get the document content to extract context for mentions
    // Here we would typically get this from a document service or model directly
    const document = await this.mentionService.documentModel.getWithContent(documentId);
    
    if (!document) {
      return { success: false, message: 'Document not found', processedCount: 0 };
    }
    
    // Process the mentions
    const result = await this.mentionService.processMentions(
      documentId,
      document.content.content,
      userIds,
      user.id,
    );
    
    return {
      success: result.success,
      message: result.success 
        ? `Successfully processed ${result.processedCount} mentions`
        : 'Failed to process mentions',
      processedCount: result.processedCount,
    };
  }
}
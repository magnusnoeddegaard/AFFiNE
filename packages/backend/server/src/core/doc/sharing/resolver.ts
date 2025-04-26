import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DocumentSharingService } from './service';
import { AuthGuard } from '../../auth/guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PublicShareLink, CreateShareLinkInput, UpdateShareLinkInput } from './types';

@Resolver(() => PublicShareLink)
export class DocumentSharingResolver {
  constructor(private readonly documentSharingService: DocumentSharingService) {}

  @Mutation(() => PublicShareLink)
  @UseGuards(AuthGuard)
  async createDocumentShareLink(
    @Args('input') input: CreateShareLinkInput,
    @CurrentUser() userId: string,
  ): Promise<PublicShareLink> {
    return this.documentSharingService.createShareLink(userId, input);
  }

  @Query(() => [PublicShareLink])
  @UseGuards(AuthGuard)
  async documentShareLinks(
    @Args('documentId') documentId: string,
    @CurrentUser() userId: string,
  ): Promise<PublicShareLink[]> {
    return this.documentSharingService.getShareLinks(documentId, userId);
  }

  @Mutation(() => PublicShareLink)
  @UseGuards(AuthGuard)
  async updateDocumentShareLink(
    @Args('id') id: string,
    @Args('input') input: UpdateShareLinkInput,
    @CurrentUser() userId: string,
  ): Promise<PublicShareLink> {
    return this.documentSharingService.updateShareLink(id, userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteDocumentShareLink(
    @Args('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<boolean> {
    return this.documentSharingService.deleteShareLink(id, userId);
  }
}
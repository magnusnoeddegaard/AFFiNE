import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guard';
import { DocumentSharingService } from './service';
import {
  CreateShareLinkInput,
  PublicShareLink,
  UpdateShareLinkInput,
} from './types';

@Resolver(() => PublicShareLink)
export class DocumentSharingResolver {
  constructor(
    private readonly documentSharingService: DocumentSharingService
  ) {}

  @Mutation(() => PublicShareLink)
  @UseGuards(JwtAuthGuard)
  async createDocumentShareLink(
    @Args('input') input: CreateShareLinkInput,
    @CurrentUser() userId: string
  ): Promise<PublicShareLink> {
    return this.documentSharingService.createShareLink(userId, input);
  }

  @Query(() => [PublicShareLink])
  @UseGuards(JwtAuthGuard)
  async documentShareLinks(
    @Args('documentId') documentId: string,
    @CurrentUser() userId: string
  ): Promise<PublicShareLink[]> {
    return this.documentSharingService.getShareLinks(documentId, userId);
  }

  @Mutation(() => PublicShareLink)
  @UseGuards(JwtAuthGuard)
  async updateDocumentShareLink(
    @Args('id') id: string,
    @Args('input') input: UpdateShareLinkInput,
    @CurrentUser() userId: string
  ): Promise<PublicShareLink> {
    return this.documentSharingService.updateShareLink(id, userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteDocumentShareLink(
    @Args('id') id: string,
    @CurrentUser() userId: string
  ): Promise<boolean> {
    return this.documentSharingService.deleteShareLink(id, userId);
  }
}

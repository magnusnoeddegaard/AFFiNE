import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../auth/guard';
import { BlobService } from './service';
import { Blob } from './types';

@Resolver(() => Blob)
export class BlobResolver {
  constructor(private blobService: BlobService) {}

  @Query(() => Blob)
  @UseGuards(JwtAuthGuard)
  async blob(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Blob> {
    const userId = context.req.user.id;
    return this.blobService.getBlob(userId, id);
  }

  @Query(() => [Blob])
  @UseGuards(JwtAuthGuard)
  async documentBlobs(
    @Context() context: any,
    @Args('documentId', { type: () => ID }) documentId: string,
  ): Promise<Blob[]> {
    const userId = context.req.user.id;
    return this.blobService.getDocumentBlobs(userId, documentId);
  }

  @Query(() => [Blob])
  @UseGuards(JwtAuthGuard)
  async workspaceBlobs(
    @Context() context: any,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
  ): Promise<Blob[]> {
    const userId = context.req.user.id;
    return this.blobService.getWorkspaceBlobs(userId, workspaceId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteBlob(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.blobService.deleteBlob(userId, id);
  }
}
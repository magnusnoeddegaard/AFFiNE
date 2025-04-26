import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guard';
import { DocumentService } from './service';
import {
  CreateDocumentInput,
  Document,
  DocumentContent,
  DocumentFilters,
  UpdateDocumentContentInput,
  UpdateDocumentInput,
} from './types';

@Resolver(() => Document)
export class DocumentResolver {
  constructor(private documentService: DocumentService) {}

  @Query(() => Document)
  @UseGuards(JwtAuthGuard)
  async document(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Document> {
    const userId = context.req.user.id;
    return this.documentService.getDocument(userId, id);
  }

  @Query(() => [Document])
  @UseGuards(JwtAuthGuard)
  async documents(
    @Context() context: any,
    @Args('filters', { nullable: true }) filters?: DocumentFilters,
  ): Promise<Document[]> {
    const userId = context.req.user.id;
    return this.documentService.getDocuments(userId, filters);
  }

  @Mutation(() => Document)
  @UseGuards(JwtAuthGuard)
  async createDocument(
    @Context() context: any,
    @Args('input') input: CreateDocumentInput,
  ): Promise<Document> {
    const userId = context.req.user.id;
    return this.documentService.createDocument(userId, input);
  }

  @Mutation(() => Document)
  @UseGuards(JwtAuthGuard)
  async updateDocument(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDocumentInput,
  ): Promise<Document> {
    const userId = context.req.user.id;
    return this.documentService.updateDocument(userId, id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteDocument(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.documentService.deleteDocument(userId, id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async permanentlyDeleteDocument(
    @Context() context: any,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.documentService.permanentlyDeleteDocument(userId, id);
  }

  @Query(() => DocumentContent)
  @UseGuards(JwtAuthGuard)
  async documentContent(
    @Context() context: any,
    @Args('documentId', { type: () => ID }) documentId: string,
  ): Promise<DocumentContent> {
    const userId = context.req.user.id;
    return this.documentService.getDocumentContent(userId, documentId);
  }

  @Mutation(() => DocumentContent)
  @UseGuards(JwtAuthGuard)
  async updateDocumentContent(
    @Context() context: any,
    @Args('documentId', { type: () => ID }) documentId: string,
    @Args('input') input: UpdateDocumentContentInput,
  ): Promise<DocumentContent> {
    const userId = context.req.user.id;
    return this.documentService.updateDocumentContent(userId, documentId, input);
  }
}
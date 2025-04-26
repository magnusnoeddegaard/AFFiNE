import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DocumentHistoryService } from './history.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard';
import { CurrentUser } from '../auth/decorator';
import { DocumentPermissionGuard } from '../permission/guards/document-permission.guard';
import { RequiredPermission } from '../permission/decorators/required-permission.decorator';
import { DocumentPermission } from '../../models/common';

@Resolver('DocumentHistory')
export class DocumentHistoryResolver {
  constructor(private readonly historyService: DocumentHistoryService) {}

  @Query('documentHistory')
  @UseGuards(JwtAuthGuard, DocumentPermissionGuard)
  @RequiredPermission(DocumentPermission.READ)
  async getDocumentHistory(
    @Args('documentId') documentId: string,
    @Args('limit') limit?: number,
    @Args('skip') skip?: number,
  ) {
    return this.historyService.getDocumentHistory(documentId, limit, skip);
  }

  @Query('documentVersion')
  @UseGuards(JwtAuthGuard, DocumentPermissionGuard)
  @RequiredPermission(DocumentPermission.READ)
  async getDocumentVersion(
    @Args('documentId') documentId: string,
    @Args('version') version: number,
  ) {
    return this.historyService.getDocumentVersion(documentId, version);
  }

  @Query('compareDocumentVersions')
  @UseGuards(JwtAuthGuard, DocumentPermissionGuard)
  @RequiredPermission(DocumentPermission.READ)
  async compareDocumentVersions(
    @Args('documentId') documentId: string,
    @Args('versionA') versionA: number,
    @Args('versionB') versionB: number,
  ) {
    return this.historyService.compareVersions(documentId, versionA, versionB);
  }

  @Mutation('restoreDocumentVersion')
  @UseGuards(JwtAuthGuard, DocumentPermissionGuard)
  @RequiredPermission(DocumentPermission.WRITE)
  async restoreDocumentVersion(
    @Args('documentId') documentId: string,
    @Args('version') version: number,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.historyService.restoreVersion(documentId, version, user.id);
    return !!result;
  }

  @Mutation('createDocumentSnapshot')
  @UseGuards(JwtAuthGuard, DocumentPermissionGuard)
  @RequiredPermission(DocumentPermission.WRITE)
  async createDocumentSnapshot(
    @Args('documentId') documentId: string,
    @Args('message') message: string,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.historyService.createSnapshot(documentId, user.id, message);
    return !!result;
  }
}
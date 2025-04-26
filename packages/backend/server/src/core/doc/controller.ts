import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post()
  async createDocument(
    @Body('userId') userId: string,
    @Body('document') document: CreateDocumentInput,
  ): Promise<Document> {
    return this.documentService.createDocument(userId, document);
  }

  @Get(':id')
  async getDocument(
    @Body('userId') userId: string,
    @Param('id') id: string,
  ): Promise<Document> {
    return this.documentService.getDocument(userId, id);
  }

  @Get()
  async getDocuments(
    @Body('userId') userId: string,
    @Query() filters: DocumentFilters,
  ): Promise<Document[]> {
    return this.documentService.getDocuments(userId, filters);
  }

  @Put(':id')
  async updateDocument(
    @Body('userId') userId: string,
    @Param('id') id: string,
    @Body('document') document: UpdateDocumentInput,
  ): Promise<Document> {
    return this.documentService.updateDocument(userId, id, document);
  }

  @Delete(':id')
  async deleteDocument(
    @Body('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.documentService.deleteDocument(userId, id);
    return { success };
  }

  @Delete(':id/permanent')
  async permanentlyDeleteDocument(
    @Body('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.documentService.permanentlyDeleteDocument(userId, id);
    return { success };
  }

  @Get(':id/content')
  async getDocumentContent(
    @Body('userId') userId: string,
    @Param('id') id: string,
  ): Promise<DocumentContent> {
    return this.documentService.getDocumentContent(userId, id);
  }

  @Put(':id/content')
  async updateDocumentContent(
    @Body('userId') userId: string,
    @Param('id') id: string,
    @Body('content') content: UpdateDocumentContentInput,
  ): Promise<DocumentContent> {
    return this.documentService.updateDocumentContent(userId, id, content);
  }
}
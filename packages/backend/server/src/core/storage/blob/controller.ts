import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guard';
import { BlobService } from './service';
import { Blob, UploadBlobInput } from './types';

@Controller('blobs')
@UseGuards(JwtAuthGuard)
export class BlobController {
  constructor(private blobService: BlobService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBlob(
    @Body('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() input: UploadBlobInput,
  ): Promise<Blob> {
    return this.blobService.uploadBlob(userId, file.buffer, file.mimetype, input);
  }

  @Get(':id')
  async getBlob(
    @Body('userId') userId: string,
    @Param('id') id: string,
  ): Promise<Blob> {
    return this.blobService.getBlob(userId, id);
  }

  @Delete(':id')
  async deleteBlob(
    @Body('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.blobService.deleteBlob(userId, id);
    return { success };
  }

  @Get('document/:documentId')
  async getDocumentBlobs(
    @Body('userId') userId: string,
    @Param('documentId') documentId: string,
  ): Promise<Blob[]> {
    return this.blobService.getDocumentBlobs(userId, documentId);
  }

  @Get('workspace/:workspaceId')
  async getWorkspaceBlobs(
    @Body('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<Blob[]> {
    return this.blobService.getWorkspaceBlobs(userId, workspaceId);
  }
}
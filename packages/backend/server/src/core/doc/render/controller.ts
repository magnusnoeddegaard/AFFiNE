import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  HttpException,
  Headers,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DocumentRenderService, RenderFormat } from './service';
import { ApiTags, ApiParam, ApiQuery, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('document-render')
@Controller('documents')
export class DocumentRenderController {
  constructor(
    private readonly documentRenderService: DocumentRenderService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Render a document in the specified format
   */
  @ApiOperation({ summary: 'Render a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiQuery({ name: 'format', enum: RenderFormat, required: false, description: 'Output format' })
  @ApiQuery({ name: 'version', required: false, description: 'Document version to render' })
  @ApiQuery({ name: 'download', required: false, description: 'Force download if true', type: Boolean })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document rendered successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @UseGuards(AuthGuard)
  @Get(':id/render')
  async renderDocument(
    @Param('id') id: string,
    @Query('format') format: RenderFormat,
    @Query('version') version: string,
    @Query('download') download: string,
    @Headers('user-agent') userAgent: string,
    @Req() request: any,
    @CurrentUser() userId: string,
    @Res() res: Response,
  ) {
    const parsedVersion = version ? parseInt(version, 10) : undefined;
    

    // Build render options
    const renderOptions: any = {
      format: format as RenderFormat,
      includeMetadata: true,
      userAgent,
      baseUrl: this.getBaseUrl(request),
    };

    // If version is provided but not a valid number
    if (parsedVersion !== undefined) {
      renderOptions.version = parsedVersion as number;
    }
    
    // Render the document
    const result = await this.documentRenderService.renderDocument(id, userId, renderOptions);
    
    if (!result) {
      throw new HttpException('Document not found or access denied', HttpStatus.NOT_FOUND);
    }
    
    // Set content type header
    res.setHeader('Content-Type', result.mimeType);
    
    // Set content disposition header based on download parameter
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
    }
    
    // Send the rendered document
    return res.send(result.content);
  }
  
  /**
   * Get public share view for a document (HTML only)
   */
  @ApiOperation({ summary: 'Get public share view for a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiParam({ name: 'shareId', description: 'Share ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document rendered successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found' })
  @Get('share/:shareId/:id')
  async getPublicShareView(
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Headers('user-agent') userAgent: string,
    @Req() request: any,
    @Res() res: Response,
  ) {
    // This is a placeholder for public sharing
    // In a real implementation, you would:
    // 1. Verify the shareId is valid for this document
    // 2. Check if the share is still active (not expired)
    // 3. Render the document with public permissions
    
    // For now, we'll just return a simple message
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <head>
          <title>Document Shared View</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>Document Shared View</h1>
          <p>This is a placeholder for the public share view of document ${id} with share ID ${shareId}.</p>
          <p>Public sharing functionality will be implemented in a future update.</p>
        </body>
      </html>
    `);
  }
  
  /**
   * Get base URL from request
   */
  private getBaseUrl(request: any): string {
    const protocol = request.protocol || 'http';
    const host = request.get('host') || 'localhost';
    return `${protocol}://${host}`;
  }
}
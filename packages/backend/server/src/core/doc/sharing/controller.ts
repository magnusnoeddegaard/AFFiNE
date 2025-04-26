import { Controller, Get, Param, Req, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { DocumentSharingService } from './service';
import { DocumentService } from '../service';
import { DocumentRenderService, RenderFormat, RenderOptions } from '../render/service';
import { PermissionLevel } from '../../permission/types';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';

@ApiTags('Document Sharing')
@Controller('documents')
export class DocumentSharingController {
  constructor(
    private readonly documentSharingService: DocumentSharingService,
    private readonly documentService: DocumentService,
    private readonly documentRenderService: DocumentRenderService,
  ) {}

  @ApiOperation({ summary: 'Get document by share token' })
  @ApiParam({ name: 'token', description: 'Share token' })
  @ApiResponse({ status: 200, description: 'Returns the document' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  @ApiResponse({ status: 403, description: 'Share link has expired' })
  @UseGuards(OptionalAuthGuard)
  @Get('share/:token')
  async getDocumentByShareToken(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Get document info from share token
    const documentInfo = await this.documentSharingService.getDocumentByShareToken(token);
    
    // If anonymous access is not allowed and user is not authenticated, deny access
    if (!documentInfo.allowAnonymous && !req.user) {
      throw new ForbiddenException('Authentication required to access this document');
    }

    return res.json({
      document: documentInfo.document,
      permissionLevel: documentInfo.permissionLevel,
    });
  }

  @ApiOperation({ summary: 'Render document with share token' })
  @ApiParam({ name: 'token', description: 'Share token' })
  @ApiParam({ name: 'format', description: 'Render format (html, pdf, md, txt)' })
  @ApiResponse({ status: 200, description: 'Returns the rendered document' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  @ApiResponse({ status: 403, description: 'Share link has expired or insufficient permissions' })
  @UseGuards(OptionalAuthGuard)
  @Get('share/:token/render/:format')
  async renderDocumentWithShareToken(
    @Param('token') token: string,
    @Param('format') format: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Get document info from share token
    const documentInfo = await this.documentSharingService.getDocumentByShareToken(token);
    
    // If anonymous access is not allowed and user is not authenticated, deny access
    if (!documentInfo.allowAnonymous && !req.user) {
      throw new ForbiddenException('Authentication required to access this document');
    }

    // Validate format
    let renderFormat: RenderFormat;
    switch (format.toLowerCase()) {
      case 'html':
        renderFormat = RenderFormat.HTML;
        break;
      case 'pdf':
        renderFormat = RenderFormat.PDF;
        break;
      case 'md':
        renderFormat = RenderFormat.MARKDOWN;
        break;
      case 'txt':
        renderFormat = RenderFormat.TEXT;
        break;
      default:
        renderFormat = RenderFormat.HTML;
    }

    // Set user ID to the creator of the share link for permission check
    const userId = req.user?.id || documentInfo.document.createdBy;

    // Render document
    const renderOptions: RenderOptions = {
      format: renderFormat,
      includeMetadata: true,
      userAgent: req.headers['user-agent'] as string,
    };

    const rendered = await this.documentRenderService.renderDocument(
      documentInfo.document.id,
      userId,
      renderOptions,
    );

    if (!rendered) {
      throw new ForbiddenException('Unable to render document');
    }

    // Set content-type header
    res.setHeader('Content-Type', rendered.mimeType);
    
    // Set content-disposition header for download
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${rendered.filename}"`,
    );

    // Return rendered content
    return res.send(rendered.content);
  }
}
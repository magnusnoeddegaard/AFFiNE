import { Injectable, Logger } from '@nestjs/common';
import { DocumentService } from '../service';
import { DocumentHistoryService } from '../history.service';
import { DocumentModel } from '../../../models/doc';
import { PermissionService } from '../../permission/service';
import { PermissionLevel, ResourceType } from '../../permission/types';
import { MutexService } from '../../../base/mutex/mutex.service';
import { StorageService } from '../../../base/storage/storage.service';

export enum RenderFormat {
  HTML = 'html',
  PDF = 'pdf',
  MARKDOWN = 'md',
  TEXT = 'txt',
}

export interface RenderOptions {
  format?: RenderFormat;
  version?: number;
  includeMetadata?: boolean;
  userAgent?: string;
  baseUrl?: string;
}

export interface DocumentRenderResult {
  content: string | Buffer;
  mimeType: string;
  filename: string;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
  };
}

/**
 * Service for document rendering
 */
@Injectable()
export class DocumentRenderService {
  private readonly logger = new Logger(DocumentRenderService.name);
  
  constructor(
    private readonly documentService: DocumentService,
    private readonly documentHistoryService: DocumentHistoryService,
    private readonly documentModel: DocumentModel,
    private readonly permissionService: PermissionService,
    private readonly mutexService: MutexService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Render a document in a specified format
   */
  async renderDocument(
    documentId: string, 
    userId: string,
    options: RenderOptions = {}
  ): Promise<DocumentRenderResult | null> {
    // Default to HTML format
    const format = options.format || RenderFormat.HTML;
    
    // Check if user has access to the document
    const hasAccess = await this.permissionService.checkPermission(
      ResourceType.DOCUMENT,
      documentId,
      userId,
      PermissionLevel.READ
    );
    
    if (!hasAccess) {
      this.logger.warn(`User ${userId} does not have access to document ${documentId}`);
      return null;
    }
    
    // Get document content (current or specific version)
    let documentContent;
    
    if (options.version !== undefined) {
      const versionData = await this.documentHistoryService.getDocumentVersion(
        documentId, 
        options.version
      );
      
      if (!versionData) {
        this.logger.warn(`Version ${options.version} not found for document ${documentId}`);
        return null;
      }
      
      documentContent = versionData.content;
    } else {
      const document = await this.documentModel.getWithContent(documentId);
      
      if (!document) {
        this.logger.warn(`Document ${documentId} not found`);
        return null;
      }
      
      documentContent = document.content;
    }
    
    // Get document metadata
    const document = await this.documentModel.findById(documentId);
    
    if (!document) {
      this.logger.warn(`Document ${documentId} not found`);
      return null;
    }
    
    // Metadata to include in rendered document
    const metadata = options.includeMetadata ? {
      title: document.title || 'Untitled Document',
      description: document.summary || '',
      author: document.createdBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      version: documentContent.version,
    } : undefined;
    
    // Prepare result with appropriate MIME type
    const result: DocumentRenderResult = {
      content: '',
      mimeType: this.getMimeType(format),
      filename: this.generateFilename(document.title || 'document', format),
      metadata,
    };
    
    // Render document in specified format
    switch (format) {
      case RenderFormat.HTML:
        result.content = await this.renderHtml(documentContent, document, options);
        break;
      case RenderFormat.PDF:
        result.content = await this.renderPdf(documentContent, document, options);
        break;
      case RenderFormat.MARKDOWN:
        result.content = await this.renderMarkdown(documentContent, document, options);
        break;
      case RenderFormat.TEXT:
        result.content = await this.renderText(documentContent, document, options);
        break;
      default:
        this.logger.warn(`Unsupported format: ${format}`);
        return null;
    }
    
    return result;
  }
  
  /**
   * Render document as HTML
   */
  private async renderHtml(documentContent: any, document: any, options: RenderOptions): Promise<string> {
    // Extract document data
    const { title, createdBy, createdAt, updatedAt } = document;
    const content = documentContent.content;
    
    // Basic HTML template
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Untitled Document'}</title>
  <meta name="description" content="${document.summary || ''}">
  <meta name="author" content="${createdBy || ''}">
  <meta property="og:title" content="${title || 'Untitled Document'}">
  <meta property="og:description" content="${document.summary || ''}">
  <meta property="og:type" content="article">
  ${options.baseUrl ? `<meta property="og:url" content="${options.baseUrl}/documents/${document.id}">` : ''}
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; }
    p { margin-bottom: 1em; }
    .metadata { 
      color: #666; 
      font-size: 0.9em;
      margin-bottom: 2em;
      padding-bottom: 1em;
      border-bottom: 1px solid #eee;
    }
  </style>
</head>
<body>
  <h1>${title || 'Untitled Document'}</h1>
  <div class="metadata">
    <div>Created: ${new Date(createdAt).toLocaleString()}</div>
    <div>Last updated: ${new Date(updatedAt).toLocaleString()}</div>
  </div>
  <div class="content">
    ${this.processContentForHtml(content)}
  </div>
</body>
</html>`;

    return html;
  }
  
  /**
   * Render document as PDF
   */
  private async renderPdf(documentContent: any, document: any, options: RenderOptions): Promise<Buffer> {
    // For PDF rendering, we would typically:
    // 1. First render to HTML
    // 2. Use a PDF renderer like Puppeteer to convert HTML to PDF
    
    // This is a placeholder that would be replaced with actual PDF generation
    // For a real implementation, you would need to integrate with a PDF rendering library
    const html = await this.renderHtml(documentContent, document, options);
    
    // Placeholder for PDF generation
    // In a real implementation, you would convert the HTML to PDF here
    // return await generatePdfFromHtml(html);
    
    // For now, return a simple Buffer
    return Buffer.from(`PDF generation not yet implemented. Document: ${document.id}`);
  }
  
  /**
   * Render document as Markdown
   */
  private async renderMarkdown(documentContent: any, document: any, options: RenderOptions): Promise<string> {
    // Extract document data
    const { title, createdBy, createdAt, updatedAt } = document;
    const content = documentContent.content;
    
    // Basic Markdown template
    const markdown = `# ${title || 'Untitled Document'}

Created: ${new Date(createdAt).toLocaleString()}
Last updated: ${new Date(updatedAt).toLocaleString()}

${this.processContentForMarkdown(content)}
`;

    return markdown;
  }
  
  /**
   * Render document as plain text
   */
  private async renderText(documentContent: any, document: any, options: RenderOptions): Promise<string> {
    // Extract document data
    const { title, createdBy, createdAt, updatedAt } = document;
    const content = documentContent.content;
    
    // Basic text template
    const text = `${title || 'Untitled Document'}

Created: ${new Date(createdAt).toLocaleString()}
Last updated: ${new Date(updatedAt).toLocaleString()}

${this.processContentForText(content)}
`;

    return text;
  }
  
  /**
   * Process document content for HTML output
   */
  private processContentForHtml(content: any): string {
    // This is a simplified implementation
    // In a real application, you would need to process BlockSuite format to HTML
    
    // For now, assume content is just a string or JSON
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's JSON or an object, stringify it
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return 'Content could not be processed';
    }
  }
  
  /**
   * Process document content for Markdown output
   */
  private processContentForMarkdown(content: any): string {
    // This is a simplified implementation
    // In a real application, you would need to process BlockSuite format to Markdown
    
    // For now, assume content is just a string or JSON
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's JSON or an object, stringify it
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return 'Content could not be processed';
    }
  }
  
  /**
   * Process document content for plain text output
   */
  private processContentForText(content: any): string {
    // This is a simplified implementation
    // In a real application, you would need to process BlockSuite format to plain text
    
    // For now, assume content is just a string or JSON
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's JSON or an object, stringify it
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return 'Content could not be processed';
    }
  }
  
  /**
   * Get MIME type for a format
   */
  private getMimeType(format: RenderFormat): string {
    switch (format) {
      case RenderFormat.HTML:
        return 'text/html';
      case RenderFormat.PDF:
        return 'application/pdf';
      case RenderFormat.MARKDOWN:
        return 'text/markdown';
      case RenderFormat.TEXT:
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * Generate filename for a document
   */
  private generateFilename(title: string, format: RenderFormat): string {
    // Sanitize title for use in a filename
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    // Get file extension
    const extension = format.toString();
    
    return `${sanitizedTitle}.${extension}`;
  }
}
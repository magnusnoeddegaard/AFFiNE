import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '../../models/notification';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

/**
 * Service for managing email templates for notifications
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private readonly plainTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private readonly defaultTemplate: HandlebarsTemplateDelegate;
  private readonly defaultPlainTemplate: HandlebarsTemplateDelegate;

  constructor(private readonly configService: ConfigService) {
    // Load templates
    this.loadTemplates();
    
    // Register Handlebars helpers
    this.registerHelpers();
    
    // Compile default template
    this.defaultTemplate = Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eee;
          }
          .logo {
            max-width: 150px;
            height: auto;
          }
          .content {
            padding: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            color: #888;
            font-size: 12px;
            border-top: 1px solid #eee;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 15px;
          }
          @media (max-width: 480px) {
            .container {
              width: 100%;
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="{{logoUrl}}" alt="AFFiNE Logo" class="logo">
          </div>
          <div class="content">
            <h2>{{title}}</h2>
            <p>Hello {{userName}},</p>
            <p>{{message}}</p>
            {{{content}}}
            <p>Thank you for using AFFiNE!</p>
          </div>
          <div class="footer">
            <p>© {{year}} AFFiNE. All rights reserved.</p>
            <p>You're receiving this email because you have an AFFiNE account.</p>
          </div>
        </div>
      </body>
      </html>
    `);
    
    // Compile default plain text template
    this.defaultPlainTemplate = Handlebars.compile(`
{{title}}

Hello {{userName}},

{{message}}

{{content}}

Thank you for using AFFiNE!

© {{year}} AFFiNE. All rights reserved.
You're receiving this email because you have an AFFiNE account.
`);
  }

  /**
   * Load all email templates
   */
  private loadTemplates(): void {
    try {
      // In a real implementation, this would load template files from the filesystem
      // For now, we'll simulate it with hardcoded templates
      
      // Document shared template
      this.templates.set(NotificationType.DOCUMENT_SHARED, Handlebars.compile(`
        <p>A document has been shared with you:</p>
        <p><strong>{{documentTitle}}</strong></p>
        <a href="{{documentUrl}}" class="button">View Document</a>
      `));
      
      // Workspace invitation template
      this.templates.set(NotificationType.WORKSPACE_INVITATION, Handlebars.compile(`
        <p>You've been invited to join the workspace:</p>
        <p><strong>{{workspaceName}}</strong></p>
        <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
      `));
      
      // Mention template
      this.templates.set(NotificationType.MENTION, Handlebars.compile(`
        <p>You were mentioned in <strong>{{documentTitle}}</strong>:</p>
        <blockquote style="border-left: 4px solid #eee; padding-left: 15px; margin-left: 0;">
          {{{mentionContext}}}
        </blockquote>
        <a href="{{documentUrl}}" class="button">View Mention</a>
      `));
      
      // Comment added template
      this.templates.set(NotificationType.COMMENT_ADDED, Handlebars.compile(`
        <p>New comment on <strong>{{documentTitle}}</strong>:</p>
        <blockquote style="border-left: 4px solid #eee; padding-left: 15px; margin-left: 0;">
          {{{commentText}}}
        </blockquote>
        <a href="{{commentUrl}}" class="button">View Comment</a>
      `));
      
      // Comment replied template
      this.templates.set(NotificationType.COMMENT_REPLIED, Handlebars.compile(`
        <p>New reply to your comment on <strong>{{documentTitle}}</strong>:</p>
        <blockquote style="border-left: 4px solid #eee; padding-left: 15px; margin-left: 0;">
          {{{commentText}}}
        </blockquote>
        <a href="{{commentUrl}}" class="button">View Comment</a>
      `));
      
      // Document updated template
      this.templates.set(NotificationType.DOCUMENT_UPDATED, Handlebars.compile(`
        <p>A document you follow has been updated:</p>
        <p><strong>{{documentTitle}}</strong></p>
        <p>Updated by: {{updatedBy}}</p>
        <a href="{{documentUrl}}" class="button">View Document</a>
      `));
      
      // Workspace role changed template
      this.templates.set(NotificationType.WORKSPACE_ROLE_CHANGED, Handlebars.compile(`
        <p>Your role in the workspace <strong>{{workspaceName}}</strong> has been changed to <strong>{{newRole}}</strong>.</p>
        <a href="{{workspaceUrl}}" class="button">Go to Workspace</a>
      `));
      
      // Load plain text templates
      
      // Document shared plain template
      this.plainTemplates.set(NotificationType.DOCUMENT_SHARED, Handlebars.compile(`
A document has been shared with you:
{{documentTitle}}

View Document: {{documentUrl}}
      `));
      
      // Workspace invitation plain template
      this.plainTemplates.set(NotificationType.WORKSPACE_INVITATION, Handlebars.compile(`
You've been invited to join the workspace:
{{workspaceName}}

Accept Invitation: {{invitationUrl}}
      `));
      
      // Mention plain template
      this.plainTemplates.set(NotificationType.MENTION, Handlebars.compile(`
You were mentioned in {{documentTitle}}:

{{mentionContext}}

View Mention: {{documentUrl}}
      `));
      
      // Comment added plain template
      this.plainTemplates.set(NotificationType.COMMENT_ADDED, Handlebars.compile(`
New comment on {{documentTitle}}:

{{commentText}}

View Comment: {{commentUrl}}
      `));
      
      // Comment replied plain template
      this.plainTemplates.set(NotificationType.COMMENT_REPLIED, Handlebars.compile(`
New reply to your comment on {{documentTitle}}:

{{commentText}}

View Comment: {{commentUrl}}
      `));
      
      // Document updated plain template
      this.plainTemplates.set(NotificationType.DOCUMENT_UPDATED, Handlebars.compile(`
A document you follow has been updated:
{{documentTitle}}
Updated by: {{updatedBy}}

View Document: {{documentUrl}}
      `));
      
      // Workspace role changed plain template
      this.plainTemplates.set(NotificationType.WORKSPACE_ROLE_CHANGED, Handlebars.compile(`
Your role in the workspace {{workspaceName}} has been changed to {{newRole}}.

Go to Workspace: {{workspaceUrl}}
      `));
      
    } catch (error) {
      this.logger.error(`Failed to load email templates: ${error.message}`, error.stack);
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });
    
    Handlebars.registerHelper('formatTime', (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    });
    
    Handlebars.registerHelper('formatDateTime', (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });
  }

  /**
   * Get an email template for a notification type
   * @param type Notification type
   * @param data Template data
   * @returns Rendered HTML template
   */
  getEmailTemplate(type: NotificationType, data: Record<string, any>): string {
    try {
      // Get template for this notification type
      const typeTemplate = this.templates.get(type.toString());
      
      if (!typeTemplate) {
        this.logger.warn(`No email template found for notification type: ${type}`);
        return this.renderDefaultTemplate('', data);
      }
      
      // Render the type-specific template
      const content = typeTemplate(data);
      
      // Render the full template with the content
      return this.renderDefaultTemplate(content, data);
    } catch (error) {
      this.logger.error(`Failed to render email template: ${error.message}`, error.stack);
      return this.renderDefaultTemplate('', data);
    }
  }

  /**
   * Get a plain text email template for a notification type
   * @param type Notification type
   * @param data Template data
   * @returns Rendered plain text template
   */
  getPlainTextEmailTemplate(type: NotificationType, data: Record<string, any>): string {
    try {
      // Get template for this notification type
      const typeTemplate = this.plainTemplates.get(type.toString());
      
      if (!typeTemplate) {
        this.logger.warn(`No plain text email template found for notification type: ${type}`);
        return this.renderDefaultPlainTemplate('', data);
      }
      
      // Render the type-specific template
      const content = typeTemplate(data);
      
      // Render the full template with the content
      return this.renderDefaultPlainTemplate(content, data);
    } catch (error) {
      this.logger.error(`Failed to render plain text email template: ${error.message}`, error.stack);
      return this.renderDefaultPlainTemplate('', data);
    }
  }

  /**
   * Render the default email template
   * @param content Content to include in the template
   * @param data Additional template data
   * @returns Rendered HTML template
   */
  private renderDefaultTemplate(content: string, data: Record<string, any>): string {
    const templateData = {
      title: data.title || 'Notification',
      userName: data.userName || 'User',
      message: data.message || '',
      content: content,
      logoUrl: this.configService.get('mail.logoUrl') || 'https://affine.pro/logo.png',
      year: new Date().getFullYear(),
      ...data,
    };
    
    return this.defaultTemplate(templateData);
  }

  /**
   * Render the default plain text email template
   * @param content Content to include in the template
   * @param data Additional template data
   * @returns Rendered plain text template
   */
  private renderDefaultPlainTemplate(content: string, data: Record<string, any>): string {
    const templateData = {
      title: data.title || 'Notification',
      userName: data.userName || 'User',
      message: data.message || '',
      content: content,
      year: new Date().getFullYear(),
      ...data,
    };
    
    return this.defaultPlainTemplate(templateData);
  }
}
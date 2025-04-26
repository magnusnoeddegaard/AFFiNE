import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { UserModel } from '../../models/user';
import { NotificationType } from '../../models/notification';

/**
 * Service for handling email sending
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly userModel: UserModel,
  ) {
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   */
  private initializeTransporter(): void {
    const mailConfig = this.configService.get('mail');
    
    if (!mailConfig) {
      this.logger.warn('Mail configuration not found, using ethereal test account');
      this.createTestAccount();
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: {
        user: mailConfig.user,
        pass: mailConfig.pass,
      },
    });
  }

  /**
   * Create a test account for development
   */
  private async createTestAccount(): Promise<void> {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      this.logger.debug(`Test email account created: ${testAccount.user}`);
    } catch (error) {
      this.logger.error(`Failed to create test email account: ${error.message}`, error.stack);
    }
  }

  /**
   * Send an email
   * @param to Recipient email
   * @param subject Email subject
   * @param html Email HTML content
   * @param text Email plain text content
   * @returns Success status and message info
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ success: boolean; info?: any }> {
    try {
      const mailOptions = {
        from: this.configService.get('mail.from') || 'noreply@affine.pro',
        to,
        subject,
        html,
        text: text || '',
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.debug(`Email sent: ${info.messageId}`);
      
      // For development, log the test URL
      if (this.configService.get('environment') !== 'production') {
        this.logger.debug(`Test URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      
      return { success: true, info };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  /**
   * Send a notification email
   * @param userId User ID to send to
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param data Additional data
   * @returns Success status and message info
   */
  async sendNotificationEmail(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
  ): Promise<{ success: boolean; info?: any }> {
    try {
      // Get the user
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        this.logger.warn(`User ${userId} not found for email notification`);
        return { success: false };
      }
      
      // Get email template based on notification type
      const templateHtml = this.getNotificationTemplate(type, title, message, data, user);
      const templateText = this.getNotificationTextTemplate(type, title, message, data, user);
      
      // Send the email
      return this.sendEmail(
        user.email,
        title,
        templateHtml,
        templateText,
      );
    } catch (error) {
      this.logger.error(`Failed to send notification email: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  /**
   * Get HTML template for notification email
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param data Additional data
   * @param user User data
   * @returns HTML template string
   */
  private getNotificationTemplate(
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any>,
    user: any,
  ): string {
    // This is a basic template, ideally you would use a proper email templating system
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
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
            <img src="https://affine.pro/logo.png" alt="AFFiNE Logo" class="logo">
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>Hello ${user.name || user.email},</p>
            <p>${message}</p>
            ${this.getTypeSpecificContent(type, data)}
            <p>Thank you for using AFFiNE!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AFFiNE. All rights reserved.</p>
            <p>You're receiving this email because you have an AFFiNE account.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get plain text template for notification email
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param data Additional data
   * @param user User data
   * @returns Plain text template string
   */
  private getNotificationTextTemplate(
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any>,
    user: any,
  ): string {
    return `
${title}

Hello ${user.name || user.email},

${message}

${this.getTypeSpecificTextContent(type, data)}

Thank you for using AFFiNE!

© ${new Date().getFullYear()} AFFiNE. All rights reserved.
You're receiving this email because you have an AFFiNE account.
`;
  }

  /**
   * Get type-specific content for notification email
   * @param type Notification type
   * @param data Additional data
   * @returns HTML content specific to notification type
   */
  private getTypeSpecificContent(type: NotificationType, data: Record<string, any>): string {
    switch (type) {
      case NotificationType.DOCUMENT_SHARED:
        return `
          <p>A document has been shared with you:</p>
          <p><strong>${data.documentTitle || 'Document'}</strong></p>
          <a href="${data.documentUrl || '#'}" class="button">View Document</a>
        `;
      
      case NotificationType.WORKSPACE_INVITATION:
        return `
          <p>You've been invited to join the workspace:</p>
          <p><strong>${data.workspaceName || 'Workspace'}</strong></p>
          <a href="${data.invitationUrl || '#'}" class="button">Accept Invitation</a>
        `;
      
      case NotificationType.MENTION:
        return `
          <p>You were mentioned in <strong>${data.documentTitle || 'a document'}</strong>:</p>
          <blockquote style="border-left: 4px solid #eee; padding-left: 15px; margin-left: 0;">
            ${data.mentionContext || ''}
          </blockquote>
          <a href="${data.documentUrl || '#'}" class="button">View Mention</a>
        `;
      
      case NotificationType.COMMENT_ADDED:
      case NotificationType.COMMENT_REPLIED:
        return `
          <p>New comment on <strong>${data.documentTitle || 'a document'}</strong>:</p>
          <blockquote style="border-left: 4px solid #eee; padding-left: 15px; margin-left: 0;">
            ${data.commentText || ''}
          </blockquote>
          <a href="${data.commentUrl || '#'}" class="button">View Comment</a>
        `;
      
      default:
        return '';
    }
  }

  /**
   * Get type-specific content for plain text notification email
   * @param type Notification type
   * @param data Additional data
   * @returns Plain text content specific to notification type
   */
  private getTypeSpecificTextContent(type: NotificationType, data: Record<string, any>): string {
    switch (type) {
      case NotificationType.DOCUMENT_SHARED:
        return `
A document has been shared with you:
${data.documentTitle || 'Document'}

View Document: ${data.documentUrl || ''}
`;
      
      case NotificationType.WORKSPACE_INVITATION:
        return `
You've been invited to join the workspace:
${data.workspaceName || 'Workspace'}

Accept Invitation: ${data.invitationUrl || ''}
`;
      
      case NotificationType.MENTION:
        return `
You were mentioned in ${data.documentTitle || 'a document'}:

${data.mentionContext || ''}

View Mention: ${data.documentUrl || ''}
`;
      
      case NotificationType.COMMENT_ADDED:
      case NotificationType.COMMENT_REPLIED:
        return `
New comment on ${data.documentTitle || 'a document'}:

${data.commentText || ''}

View Comment: ${data.commentUrl || ''}
`;
      
      default:
        return '';
    }
  }
}
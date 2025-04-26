import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { DocumentModel } from '../../models/doc';
import { UserModel } from '../../models/user';
import { NotificationType } from '../../models/notification';
import { ConfigService } from '@nestjs/config';

/**
 * Service for handling mentions
 */
@Injectable()
export class MentionService {
  private readonly logger = new Logger(MentionService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly documentModel: DocumentModel,
    private readonly userModel: UserModel,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process mentions in document content
   * @param documentId Document ID
   * @param content Document content
   * @param mentionedUserIds List of user IDs mentioned in the content
   * @param mentionerUserId User ID who created the mentions
   * @returns Processing result
   */
  async processMentions(
    documentId: string,
    content: string,
    mentionedUserIds: string[],
    mentionerUserId: string,
  ): Promise<{ success: boolean; processedCount: number }> {
    try {
      if (!mentionedUserIds.length) {
        return { success: true, processedCount: 0 };
      }
      
      // Get document details
      const document = await this.documentModel.findById(documentId);
      
      if (!document) {
        this.logger.warn(`Document ${documentId} not found for mentions`);
        return { success: false, processedCount: 0 };
      }
      
      // Get mentioner user details
      const mentionerUser = await this.userModel.findById(mentionerUserId);
      
      if (!mentionerUser) {
        this.logger.warn(`User ${mentionerUserId} not found for mentions`);
        return { success: false, processedCount: 0 };
      }
      
      // Create unique set of user IDs to prevent duplicate notifications
      const uniqueUserIds = [...new Set(mentionedUserIds)];
      
      // Filter out the user who created the mentions
      const filteredUserIds = uniqueUserIds.filter(id => id !== mentionerUserId);
      
      // Process each mentioned user
      const processPromises = filteredUserIds.map(userId => 
        this.processMentionForUser(userId, document, content, mentionerUser)
      );
      
      // Wait for all notifications to be processed
      await Promise.all(processPromises);
      
      return { success: true, processedCount: filteredUserIds.length };
    } catch (error) {
      this.logger.error(`Error processing mentions: ${error.message}`, error.stack);
      return { success: false, processedCount: 0 };
    }
  }

  /**
   * Process a mention for a specific user
   * @param userId User ID who was mentioned
   * @param document Document in which the user was mentioned
   * @param content Document content
   * @param mentionerUser User who created the mention
   */
  private async processMentionForUser(
    userId: string,
    document: any,
    content: string,
    mentionerUser: any,
  ): Promise<void> {
    try {
      // Get mentioned user details
      const mentionedUser = await this.userModel.findById(userId);
      
      if (!mentionedUser) {
        this.logger.warn(`Mentioned user ${userId} not found`);
        return;
      }
      
      // Extract context around the mention
      const mentionContext = this.extractMentionContext(content, mentionedUser.name || mentionedUser.email);
      
      // Get base URL for document links
      const baseUrl = this.configService.get('app.baseUrl') || 'https://app.affine.pro';
      
      // Create notification for the mentioned user
      await this.notificationService.createNotification(
        userId,
        NotificationType.MENTION,
        `You were mentioned by ${mentionerUser.name || mentionerUser.email}`,
        `${mentionerUser.name || mentionerUser.email} mentioned you in "${document.title}"`,
        {
          documentId: document.id,
          documentTitle: document.title,
          mentionerUserId: mentionerUser.id,
          mentionerName: mentionerUser.name || mentionerUser.email,
          mentionContext,
          documentUrl: `${baseUrl}/workspace/${document.workspaceId}/doc/${document.id}`,
        },
        true, // Send email
      );
      
      this.logger.debug(`Processed mention for user ${userId} in document ${document.id}`);
    } catch (error) {
      this.logger.error(`Error processing mention for user ${userId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Extract context around a mention
   * @param content Document content
   * @param mentionText Text to look for
   * @returns Context around the mention
   */
  private extractMentionContext(content: string, mentionText: string): string {
    // This is a simple implementation that extracts content around the mention
    // In a real implementation, this would depend on your document format (e.g., JSON, Markdown, etc.)
    
    try {
      // Look for the mention pattern (e.g., @username)
      const mentionPattern = new RegExp(`@${mentionText}\\b`, 'i');
      const match = mentionPattern.exec(content);
      
      if (!match) {
        return '';
      }
      
      // Extract a window of text around the mention
      const startPos = Math.max(0, match.index - 50);
      const endPos = Math.min(content.length, match.index + mentionText.length + 50);
      
      let context = content.substring(startPos, endPos);
      
      // Add ellipsis if we're cutting off text
      if (startPos > 0) {
        context = '...' + context;
      }
      
      if (endPos < content.length) {
        context = context + '...';
      }
      
      return context;
    } catch (error) {
      this.logger.error(`Error extracting mention context: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Extract mentioned user IDs from document content
   * @param content Document content
   * @returns List of mentioned user IDs
   */
  async extractMentionedUserIds(content: string): Promise<string[]> {
    try {
      // This is a simple implementation that assumes mentions are in a standard format
      // In a real implementation, this would depend on your document format (e.g., JSON, Markdown, etc.)
      
      // Look for mention patterns like {"type":"mention","userId":"123"}
      const mentionPattern = /"type"\s*:\s*"mention"\s*,\s*"userId"\s*:\s*"([^"]+)"/g;
      const mentionedUserIds: string[] = [];
      
      let match;
      while ((match = mentionPattern.exec(content)) !== null) {
        if (match[1]) {
          mentionedUserIds.push(match[1]);
        }
      }
      
      return mentionedUserIds;
    } catch (error) {
      this.logger.error(`Error extracting mentioned user IDs: ${error.message}`, error.stack);
      return [];
    }
  }
}
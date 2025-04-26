import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkspaceModel } from '../../../models/workspace';
import { WorkspaceUserModel } from '../../../models/workspace-user';
import { UserModel } from '../../../models/user';
import { VerificationTokenModel } from '../../../models/verification-token';
import { NotificationService } from '../../notification/notification.service';
import { MailService } from '../../../base/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { NotificationType } from '../../../models/notification';
import { WorkspaceUserRole } from '../../../models/common';

/**
 * Service for handling workspace invitations
 */
@Injectable()
export class WorkspaceInvitationService {
  private readonly logger = new Logger(WorkspaceInvitationService.name);

  constructor(
    private readonly workspaceModel: WorkspaceModel,
    private readonly workspaceUserModel: WorkspaceUserModel,
    private readonly userModel: UserModel,
    private readonly tokenModel: VerificationTokenModel,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Invite a user to a workspace by email
   * @param workspaceId Workspace ID
   * @param email Email to invite
   * @param role Role to assign (defaults to MEMBER)
   * @param inviterId User ID sending the invitation
   * @returns Result of the invitation
   */
  async inviteUserByEmail(
    workspaceId: string,
    email: string,
    role: WorkspaceUserRole = WorkspaceUserRole.MEMBER,
    inviterId: string,
  ): Promise<{ success: boolean; message: string; inviteId?: string }> {
    try {
      // Check if workspace exists
      const workspace = await this.workspaceModel.findById(workspaceId);
      
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }
      
      // Check if inviter has permission to invite
      const inviterWorkspace = await this.workspaceUserModel.findByWorkspaceAndUser(workspaceId, inviterId);
      
      if (!inviterWorkspace) {
        throw new ForbiddenException('You do not have permission to invite users to this workspace');
      }
      
      // Only admins and owners can invite
      if (inviterWorkspace.role !== WorkspaceUserRole.ADMIN && inviterWorkspace.role !== WorkspaceUserRole.OWNER) {
        throw new ForbiddenException('Only workspace admins and owners can invite users');
      }
      
      // Check if the role is valid for invitation
      if (role === WorkspaceUserRole.OWNER) {
        throw new BadRequestException('Cannot invite a user as an owner');
      }
      
      // Get the inviter user
      const inviter = await this.userModel.findById(inviterId);
      
      if (!inviter) {
        throw new NotFoundException('Inviter not found');
      }
      
      // Check if user already exists
      const existingUser = await this.userModel.findByEmail(email);
      
      if (existingUser) {
        // Check if user is already in workspace
        const existingWorkspaceUser = await this.workspaceUserModel.findByWorkspaceAndUser(workspaceId, existingUser.id);
        
        if (existingWorkspaceUser) {
          return { success: false, message: 'User is already a member of this workspace' };
        }
        
        // Create workspace user directly
        await this.workspaceUserModel.create({
          workspaceId,
          userId: existingUser.id,
          role,
          invitedBy: inviterId,
          invitedAt: new Date(),
          joinedAt: new Date(),
          settings: {},
        });
        
        // Notify the user about the invitation
        await this.notificationService.createNotification(
          existingUser.id,
          NotificationType.WORKSPACE_INVITATION,
          `You have been added to workspace: ${workspace.name}`,
          `${inviter.name || inviter.email} has added you to the workspace: ${workspace.name}`,
          {
            workspaceId,
            workspaceName: workspace.name,
            inviterId,
            inviterName: inviter.name || inviter.email,
          },
          true, // Send email
        );
        
        return { success: true, message: 'User has been added to the workspace' };
      } else {
        // Create an invitation token
        const token = uuidv4();
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7 days expiration
        
        // Create a verification token for the invitation
        const inviteToken = await this.tokenModel.create({
          token,
          type: 'INVITE',
          userId: inviterId, // The inviter is the owner of the token
          email,
          expires,
          used: false,
          usedAt: null,
          data: {
            workspaceId,
            role,
            inviterId,
            workspaceName: workspace.name,
          },
        });
        
        // Send invitation email
        const baseUrl = this.configService.get('app.baseUrl') || 'https://app.affine.pro';
        const inviteUrl = `${baseUrl}/invite/workspace/${token}`;
        
        await this.mailService.sendEmail(
          email,
          `Invitation to join workspace: ${workspace.name}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've been invited to join a workspace</h2>
              <p>${inviter.name || inviter.email} has invited you to join the workspace: <strong>${workspace.name}</strong>.</p>
              <p>Click the button below to accept the invitation:</p>
              <a href="${inviteUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">Accept Invitation</a>
              <p style="margin-top: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${inviteUrl}">${inviteUrl}</a></p>
              <p style="margin-top: 30px; color: #666; font-size: 12px;">This invitation will expire in 7 days.</p>
            </div>
          `,
          `
You've been invited to join a workspace

${inviter.name || inviter.email} has invited you to join the workspace: ${workspace.name}.

Click the link below to accept the invitation:
${inviteUrl}

This invitation will expire in 7 days.
          `,
        );
        
        return { 
          success: true, 
          message: 'Invitation has been sent to the user', 
          inviteId: inviteToken.id,
        };
      }
    } catch (error) {
      this.logger.error(`Error inviting user to workspace: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Accept a workspace invitation
   * @param token Invitation token
   * @param userId User ID accepting the invitation
   * @returns Result of the acceptance
   */
  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{ success: boolean; message: string; workspaceId?: string }> {
    try {
      // Find the invitation token
      const inviteToken = await this.tokenModel.findByToken(token);
      
      if (!inviteToken) {
        throw new NotFoundException('Invitation not found');
      }
      
      // Check if the token is expired
      if (inviteToken.expires < new Date()) {
        throw new BadRequestException('Invitation has expired');
      }
      
      // Check if the token has been used
      if (inviteToken.used) {
        throw new BadRequestException('Invitation has already been used');
      }
      
      // Check if the token is for a workspace invitation
      if (inviteToken.type !== 'INVITE') {
        throw new BadRequestException('Invalid invitation token');
      }
      
      // Get the user accepting the invitation
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Check if the invitation was sent to the user's email
      if (user.email !== inviteToken.email) {
        throw new BadRequestException('This invitation was not sent to your email address');
      }
      
      // Extract invitation data
      const { workspaceId, role } = inviteToken.data;
      
      // Check if workspace exists
      const workspace = await this.workspaceModel.findById(workspaceId);
      
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }
      
      // Check if user is already in workspace
      const existingWorkspaceUser = await this.workspaceUserModel.findByWorkspaceAndUser(workspaceId, userId);
      
      if (existingWorkspaceUser) {
        // Mark the token as used
        await this.tokenModel.markAsUsed(inviteToken.id);
        
        return { 
          success: false, 
          message: 'You are already a member of this workspace',
          workspaceId,
        };
      }
      
      // Create workspace user
      await this.workspaceUserModel.create({
        workspaceId,
        userId,
        role,
        invitedBy: inviteToken.userId,
        invitedAt: inviteToken.createdAt,
        joinedAt: new Date(),
        settings: {},
      });
      
      // Mark the token as used
      await this.tokenModel.markAsUsed(inviteToken.id);
      
      // Notify the inviter that the invitation was accepted
      const inviter = await this.userModel.findById(inviteToken.userId);
      
      if (inviter) {
        await this.notificationService.createNotification(
          inviter.id,
          NotificationType.WORKSPACE_INVITATION,
          'Workspace invitation accepted',
          `${user.name || user.email} has accepted your invitation to join workspace: ${workspace.name}`,
          {
            workspaceId,
            workspaceName: workspace.name,
            userId,
            userName: user.name || user.email,
          },
          false, // Don't send email for this
        );
      }
      
      return { 
        success: true, 
        message: 'You have successfully joined the workspace',
        workspaceId,
      };
    } catch (error) {
      this.logger.error(`Error accepting workspace invitation: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate a workspace invitation link
   * @param workspaceId Workspace ID
   * @param role Role to assign (defaults to MEMBER)
   * @param inviterId User ID generating the link
   * @returns Generated invitation link
   */
  async generateInvitationLink(
    workspaceId: string,
    role: WorkspaceUserRole = WorkspaceUserRole.MEMBER,
    inviterId: string,
  ): Promise<{ success: boolean; message: string; inviteLink?: string; expiresAt?: Date }> {
    try {
      // Check if workspace exists
      const workspace = await this.workspaceModel.findById(workspaceId);
      
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }
      
      // Check if inviter has permission to invite
      const inviterWorkspace = await this.workspaceUserModel.findByWorkspaceAndUser(workspaceId, inviterId);
      
      if (!inviterWorkspace) {
        throw new ForbiddenException('You do not have permission to invite users to this workspace');
      }
      
      // Only admins and owners can invite
      if (inviterWorkspace.role !== WorkspaceUserRole.ADMIN && inviterWorkspace.role !== WorkspaceUserRole.OWNER) {
        throw new ForbiddenException('Only workspace admins and owners can invite users');
      }
      
      // Check if the role is valid for invitation
      if (role === WorkspaceUserRole.OWNER) {
        throw new BadRequestException('Cannot invite a user as an owner');
      }
      
      // Create a unique token for the invitation link
      const token = uuidv4();
      const expires = new Date();
      expires.setDate(expires.getDate() + 30); // 30 days expiration for links
      
      // Create a verification token for the invitation
      await this.tokenModel.create({
        token,
        type: 'INVITE_LINK',
        userId: inviterId,
        email: '', // Empty email for invitation links
        expires,
        used: false,
        usedAt: null,
        data: {
          workspaceId,
          role,
          inviterId,
          workspaceName: workspace.name,
          isPublicLink: true,
        },
      });
      
      // Generate the invitation link
      const baseUrl = this.configService.get('app.baseUrl') || 'https://app.affine.pro';
      const inviteLink = `${baseUrl}/invite/workspace/${token}`;
      
      return { 
        success: true, 
        message: 'Invitation link generated successfully', 
        inviteLink,
        expiresAt: expires,
      };
    } catch (error) {
      this.logger.error(`Error generating workspace invitation link: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Revoke an invitation
   * @param inviteId Invitation ID
   * @param userId User ID revoking the invitation
   * @returns Result of the revocation
   */
  async revokeInvitation(
    inviteId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find the invitation token
      const inviteToken = await this.tokenModel.findById(inviteId);
      
      if (!inviteToken) {
        throw new NotFoundException('Invitation not found');
      }
      
      // Check if the user has permission to revoke the invitation
      if (inviteToken.userId !== userId) {
        const { workspaceId } = inviteToken.data;
        
        // Check if the user is an admin or owner of the workspace
        const userWorkspace = await this.workspaceUserModel.findByWorkspaceAndUser(workspaceId, userId);
        
        if (!userWorkspace || (userWorkspace.role !== WorkspaceUserRole.ADMIN && userWorkspace.role !== WorkspaceUserRole.OWNER)) {
          throw new ForbiddenException('You do not have permission to revoke this invitation');
        }
      }
      
      // Delete the invitation token
      await this.tokenModel.delete(inviteId);
      
      return { success: true, message: 'Invitation has been revoked' };
    } catch (error) {
      this.logger.error(`Error revoking workspace invitation: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get active invitations for a workspace
   * @param workspaceId Workspace ID
   * @param requesterId User ID requesting the invitations
   * @returns List of active invitations
   */
  async getWorkspaceInvitations(
    workspaceId: string,
    requesterId: string,
  ): Promise<any[]> {
    // Check if user has permission to view invitations
    const requesterWorkspace = await this.workspaceUserModel.findByWorkspaceAndUser(workspaceId, requesterId);
    
    if (!requesterWorkspace || (requesterWorkspace.role !== WorkspaceUserRole.ADMIN && requesterWorkspace.role !== WorkspaceUserRole.OWNER)) {
      throw new ForbiddenException('You do not have permission to view invitations for this workspace');
    }
    
    // Find all active invitations for the workspace
    const invitations = await this.tokenModel.findMany({
      where: {
        type: { in: ['INVITE', 'INVITE_LINK'] },
        used: false,
        expires: { gt: new Date() },
        data: { path: ['workspaceId'], equals: workspaceId },
      },
    });
    
    // Transform and return the invitations
    return invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email || null,
      type: invitation.type,
      role: invitation.data.role,
      inviterId: invitation.userId,
      isPublicLink: invitation.data.isPublicLink || false,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expires,
    }));
  }
}
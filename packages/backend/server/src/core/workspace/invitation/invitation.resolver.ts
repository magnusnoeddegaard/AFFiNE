import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WorkspaceInvitationService } from './invitation.service';
import { GqlJwtAuthGuard } from '../../auth/guards/gql-jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { 
  InvitationResponseDto, 
  InviteLinkResponseDto, 
  InvitationDto,
  AcceptInvitationResponseDto 
} from './dto/invitation.dto';
import { WorkspaceUserRole } from '../../../models/common';

@Resolver()
export class WorkspaceInvitationResolver {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  /**
   * Invite a user to a workspace by email
   * @param user Current user
   * @param workspaceId Workspace ID
   * @param email Email to invite
   * @param role Role to assign
   * @returns Result of the invitation
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => InvitationResponseDto)
  async inviteUserToWorkspace(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('email') email: string,
    @Args('role', { nullable: true }) role?: WorkspaceUserRole,
  ): Promise<InvitationResponseDto> {
    const result = await this.invitationService.inviteUserByEmail(
      workspaceId,
      email,
      role || WorkspaceUserRole.MEMBER,
      user.id,
    );
    
    return {
      success: result.success,
      message: result.message,
      inviteId: result.inviteId,
    };
  }

  /**
   * Invite multiple users to a workspace by email
   * @param user Current user
   * @param workspaceId Workspace ID
   * @param emails Emails to invite
   * @param role Role to assign
   * @returns Results of the invitations
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => [InvitationResponseDto])
  async inviteUsersToWorkspace(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('emails', { type: () => [String] }) emails: string[],
    @Args('role', { nullable: true }) role?: WorkspaceUserRole,
  ): Promise<InvitationResponseDto[]> {
    // Process each email invitation
    const results = await Promise.all(
      emails.map(email => 
        this.invitationService.inviteUserByEmail(
          workspaceId,
          email,
          role || WorkspaceUserRole.MEMBER,
          user.id,
        )
      )
    );
    
    // Map results to DTO format
    return results.map(result => ({
      success: result.success,
      message: result.message,
      inviteId: result.inviteId,
    }));
  }

  /**
   * Accept a workspace invitation
   * @param user Current user
   * @param token Invitation token
   * @returns Result of the acceptance
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => AcceptInvitationResponseDto)
  async acceptWorkspaceInvitation(
    @CurrentUser() user: any,
    @Args('token') token: string,
  ): Promise<AcceptInvitationResponseDto> {
    const result = await this.invitationService.acceptInvitation(token, user.id);
    
    return {
      success: result.success,
      message: result.message,
      workspaceId: result.workspaceId,
    };
  }

  /**
   * Generate a workspace invitation link
   * @param user Current user
   * @param workspaceId Workspace ID
   * @param role Role to assign
   * @returns Generated invitation link
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => InviteLinkResponseDto)
  async generateWorkspaceInvitationLink(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('role', { nullable: true }) role?: WorkspaceUserRole,
  ): Promise<InviteLinkResponseDto> {
    const result = await this.invitationService.generateInvitationLink(
      workspaceId,
      role || WorkspaceUserRole.MEMBER,
      user.id,
    );
    
    return {
      success: result.success,
      message: result.message,
      inviteLink: result.inviteLink,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * Revoke a workspace invitation
   * @param user Current user
   * @param inviteId Invitation ID
   * @returns Result of the revocation
   */
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => InvitationResponseDto)
  async revokeWorkspaceInvitation(
    @CurrentUser() user: any,
    @Args('inviteId') inviteId: string,
  ): Promise<InvitationResponseDto> {
    const result = await this.invitationService.revokeInvitation(inviteId, user.id);
    
    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Get active invitations for a workspace
   * @param user Current user
   * @param workspaceId Workspace ID
   * @returns List of active invitations
   */
  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [InvitationDto])
  async getWorkspaceInvitations(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
  ): Promise<InvitationDto[]> {
    return this.invitationService.getWorkspaceInvitations(workspaceId, user.id);
  }
}
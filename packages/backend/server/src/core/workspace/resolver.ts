import { Args, Context, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard';
import { WorkspaceService } from './service';
import { 
  AddWorkspaceMemberInput, 
  CreateWorkspaceInput, 
  InviteToWorkspaceInput, 
  RespondToInvitationInput, 
  UpdateWorkspaceInput, 
  UpdateWorkspaceMemberRoleInput, 
  Workspace, 
  WorkspaceInvitation, 
  WorkspaceMember 
} from './types';

@Resolver(() => Workspace)
export class WorkspaceResolver {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Query(() => [Workspace])
  @UseGuards(JwtAuthGuard)
  async myWorkspaces(@Context() context: any) {
    const userId = context.req.user.id;
    return this.workspaceService.getUserWorkspaces(userId);
  }

  @Query(() => Workspace)
  @UseGuards(JwtAuthGuard)
  async workspace(@Args('id', { type: () => ID }) id: string) {
    return this.workspaceService.getWorkspace(id);
  }

  @ResolveField(() => [WorkspaceMember])
  async members(@Parent() workspace: Workspace) {
    return this.workspaceService.getWorkspaceMembers(workspace.id);
  }

  @Mutation(() => Workspace)
  @UseGuards(JwtAuthGuard)
  async createWorkspace(
    @Args('input') input: CreateWorkspaceInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.createWorkspace(userId, input);
  }

  @Mutation(() => Workspace)
  @UseGuards(JwtAuthGuard)
  async updateWorkspace(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateWorkspaceInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.updateWorkspace(id, userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteWorkspace(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    await this.workspaceService.deleteWorkspace(id, userId);
    return true;
  }
}

@Resolver(() => WorkspaceMember)
export class WorkspaceMemberResolver {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Mutation(() => WorkspaceMember)
  @UseGuards(JwtAuthGuard)
  async addWorkspaceMember(
    @Args('input') input: AddWorkspaceMemberInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.addWorkspaceMember(userId, input);
  }

  @Mutation(() => WorkspaceMember)
  @UseGuards(JwtAuthGuard)
  async updateWorkspaceMemberRole(
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @Args('memberId', { type: () => ID }) memberId: string,
    @Args('input') input: UpdateWorkspaceMemberRoleInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.updateWorkspaceMemberRole(workspaceId, memberId, userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async removeWorkspaceMember(
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @Args('memberId', { type: () => ID }) memberId: string,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    await this.workspaceService.removeWorkspaceMember(workspaceId, memberId, userId);
    return true;
  }
}

@Resolver(() => WorkspaceInvitation)
export class WorkspaceInvitationResolver {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Query(() => [WorkspaceInvitation])
  @UseGuards(JwtAuthGuard)
  async workspaceInvitations(
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.getWorkspaceInvitations(workspaceId, userId);
  }

  @Query(() => [WorkspaceInvitation])
  @UseGuards(JwtAuthGuard)
  async myInvitations(@Context() context: any) {
    const userId = context.req.user.id;
    return this.workspaceService.getUserInvitations(userId);
  }

  @Mutation(() => WorkspaceInvitation)
  @UseGuards(JwtAuthGuard)
  async inviteToWorkspace(
    @Args('input') input: InviteToWorkspaceInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.inviteToWorkspace(userId, input);
  }

  @Mutation(() => WorkspaceInvitation)
  @UseGuards(JwtAuthGuard)
  async respondToInvitation(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: RespondToInvitationInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.workspaceService.respondToInvitation(id, userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async cancelInvitation(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    await this.workspaceService.cancelInvitation(id, userId);
    return true;
  }
}
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '../../base/config/config.service';
import { MutexService } from '../../base/mutex/mutex.service';
import { PrismaService } from '../../base/prisma/prisma.service';
import { PermissionService } from '../permission/service';
import { PermissionLevel, ResourceType } from '../permission/types';
import { WorkspaceService } from './service';
import {
  CreateWorkspaceInput,
  InvitationStatus,
  UpdateWorkspaceInput,
  WorkspaceMemberRole,
  WorkspaceVisibility,
} from './types';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prismaService: PrismaService;
  let permissionService: PermissionService;

  const mockPrisma: any = {
    $transaction: jest.fn((callback: (tx: any) => any) => callback(mockPrisma)),
    workspace: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceMember: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceInvitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    document: {
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPermissionService = {
    enforcePermission: jest.fn(),
    checkPermission: jest.fn(),
    getPermission: jest.fn(),
    createPermission: jest.fn(),
  };

  const mockMutexService = {
    withLock: jest.fn((key, callback) => callback()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: MutexService,
          useValue: mockMutexService,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    prismaService = module.get<PrismaService>(PrismaService);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a workspace and set owner permissions', async () => {
      const userId = 'user-id';
      const input: CreateWorkspaceInput = {
        name: 'Test Workspace',
        description: 'Test Description',
        visibility: WorkspaceVisibility.PRIVATE,
      };

      const expectedWorkspace = {
        id: 'workspace-id',
        name: input.name,
        description: input.description,
        visibility: input.visibility,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workspace.create.mockResolvedValue(expectedWorkspace);
      mockPrisma.workspaceMember.create.mockResolvedValue({
        id: 'member-id',
        workspaceId: expectedWorkspace.id,
        userId,
        role: WorkspaceMemberRole.OWNER,
      });
      mockPrisma.permission.create.mockResolvedValue({
        id: 'permission-id',
        resourceId: expectedWorkspace.id,
        resourceType: ResourceType.WORKSPACE,
        userId,
        level: PermissionLevel.OWNER,
      });

      const result = await service.createWorkspace(userId, input);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: input.name,
            description: input.description,
            visibility: input.visibility,
            ownerId: userId,
          }),
        })
      );

      expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            workspaceId: expectedWorkspace.id,
            userId,
            role: WorkspaceMemberRole.OWNER,
          },
        })
      );

      expect(mockPrisma.permission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            resourceId: expectedWorkspace.id,
            resourceType: ResourceType.WORKSPACE,
            userId,
            level: PermissionLevel.OWNER,
          },
        })
      );

      expect(result).toEqual(expectedWorkspace);
    });
  });

  describe('getWorkspace', () => {
    it('should return a workspace if it exists', async () => {
      const workspaceId = 'workspace-id';
      const expectedWorkspace = {
        id: workspaceId,
        name: 'Test Workspace',
        description: 'Test Description',
        visibility: WorkspaceVisibility.PRIVATE,
        ownerId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workspace.findUnique.mockResolvedValue(expectedWorkspace);

      const result = await service.getWorkspace(workspaceId);

      expect(mockPrisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: workspaceId },
      });
      expect(result).toEqual(expectedWorkspace);
    });

    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.getWorkspace('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateWorkspace', () => {
    it('should update a workspace if user has admin permission', async () => {
      const workspaceId = 'workspace-id';
      const userId = 'user-id';
      const input: UpdateWorkspaceInput = {
        name: 'Updated Workspace',
        description: 'Updated Description',
      };

      const expectedWorkspace = {
        id: workspaceId,
        name: input.name,
        description: input.description,
        visibility: WorkspaceVisibility.PRIVATE,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPermissionService.enforcePermission.mockResolvedValue(undefined);
      mockPrisma.workspace.update.mockResolvedValue(expectedWorkspace);

      const result = await service.updateWorkspace(workspaceId, userId, input);

      expect(mockPermissionService.enforcePermission).toHaveBeenCalledWith(
        workspaceId,
        ResourceType.WORKSPACE,
        userId,
        PermissionLevel.ADMIN
      );

      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: workspaceId },
        data: input,
      });

      expect(result).toEqual(expectedWorkspace);
    });

    it('should throw ForbiddenException if user does not have admin permission', async () => {
      mockPermissionService.enforcePermission.mockRejectedValue(
        new ForbiddenException()
      );

      await expect(
        service.updateWorkspace('workspace-id', 'user-id', {
          name: 'Updated Workspace',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('inviteToWorkspace', () => {
    it('should create an invitation if user has admin permission', async () => {
      const userId = 'user-id';
      const input = {
        workspaceId: 'workspace-id',
        email: 'test@example.com',
        role: WorkspaceMemberRole.MEMBER,
      };

      const expectedInvitation = {
        id: 'invitation-id',
        workspaceId: input.workspaceId,
        email: input.email.toLowerCase(),
        invitedBy: userId,
        role: input.role,
        status: InvitationStatus.PENDING,
        expiresAt: expect.any(Date),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPermissionService.enforcePermission.mockResolvedValue(undefined);
      mockPermissionService.checkPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.workspaceInvitation.findFirst.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue(7);
      mockPrisma.workspaceInvitation.create.mockResolvedValue(
        expectedInvitation
      );

      const result = await service.inviteToWorkspace(userId, input);

      expect(mockPermissionService.enforcePermission).toHaveBeenCalledWith(
        input.workspaceId,
        ResourceType.WORKSPACE,
        userId,
        PermissionLevel.ADMIN
      );

      expect(mockPrisma.workspaceInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: input.workspaceId,
            email: input.email.toLowerCase(),
            invitedBy: userId,
            role: input.role,
            status: InvitationStatus.PENDING,
          }),
        })
      );

      expect(result).toEqual(expectedInvitation);
    });

    it('should throw ForbiddenException if user does not have admin permission', async () => {
      mockPermissionService.enforcePermission.mockRejectedValue(
        new ForbiddenException()
      );

      await expect(
        service.inviteToWorkspace('user-id', {
          workspaceId: 'workspace-id',
          email: 'test@example.com',
          role: WorkspaceMemberRole.MEMBER,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if invitation for email already exists', async () => {
      mockPermissionService.enforcePermission.mockResolvedValue(undefined);
      mockPrisma.workspaceInvitation.findFirst.mockResolvedValue({
        id: 'existing-invitation-id',
      });

      await expect(
        service.inviteToWorkspace('user-id', {
          workspaceId: 'workspace-id',
          email: 'test@example.com',
          role: WorkspaceMemberRole.MEMBER,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is already a member', async () => {
      mockPermissionService.enforcePermission.mockResolvedValue(undefined);
      mockPrisma.workspaceInvitation.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({
        id: 'existing-member-id',
      });

      await expect(
        service.inviteToWorkspace('user-id', {
          workspaceId: 'workspace-id',
          email: 'test@example.com',
          role: WorkspaceMemberRole.MEMBER,
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

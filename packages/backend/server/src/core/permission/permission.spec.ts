import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './service';
import { PrismaService } from '../../base/prisma/prisma.service';
import { PermissionLevel, ResourceType } from './types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaService: PrismaService;

  const mockPrisma = {
    permission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPermission', () => {
    it('should create a permission', async () => {
      const input = {
        resourceId: 'resource-id',
        resourceType: ResourceType.DOCUMENT,
        userId: 'user-id',
        level: PermissionLevel.WRITE,
      };

      const expectedResult = {
        id: 'permission-id',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.permission.create.mockResolvedValue(expectedResult);

      const result = await service.createPermission(input);

      expect(mockPrisma.permission.create).toHaveBeenCalledWith({
        data: input,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPermission', () => {
    it('should get a permission if it exists', async () => {
      const resourceId = 'resource-id';
      const resourceType = ResourceType.DOCUMENT;
      const userId = 'user-id';

      const expectedResult = {
        id: 'permission-id',
        resourceId,
        resourceType,
        userId,
        level: PermissionLevel.WRITE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.permission.findFirst.mockResolvedValue(expectedResult);

      const result = await service.getPermission(resourceId, resourceType, userId);

      expect(mockPrisma.permission.findFirst).toHaveBeenCalledWith({
        where: {
          resourceId,
          resourceType,
          userId,
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should return null if permission does not exist', async () => {
      mockPrisma.permission.findFirst.mockResolvedValue(null);

      const result = await service.getPermission('resource-id', ResourceType.DOCUMENT, 'user-id');

      expect(result).toBeNull();
    });
  });

  describe('updatePermission', () => {
    it('should update a permission if it exists', async () => {
      const id = 'permission-id';
      const input = { level: PermissionLevel.ADMIN };

      const existingPermission = {
        id,
        resourceId: 'resource-id',
        resourceType: ResourceType.DOCUMENT,
        userId: 'user-id',
        level: PermissionLevel.WRITE,
      };

      const expectedResult = {
        ...existingPermission,
        level: PermissionLevel.ADMIN,
        updatedAt: new Date(),
      };

      mockPrisma.permission.findUnique.mockResolvedValue(existingPermission);
      mockPrisma.permission.update.mockResolvedValue(expectedResult);

      const result = await service.updatePermission(id, input);

      expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockPrisma.permission.update).toHaveBeenCalledWith({
        where: { id },
        data: { level: input.level },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException if permission does not exist', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePermission('non-existent-id', { level: PermissionLevel.ADMIN })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkPermission', () => {
    it('should return hasPermission=true if permission level is sufficient', async () => {
      const resourceId = 'resource-id';
      const resourceType = ResourceType.DOCUMENT;
      const userId = 'user-id';
      const requiredLevel = PermissionLevel.WRITE;

      mockPrisma.permission.findFirst.mockResolvedValue({
        id: 'permission-id',
        resourceId,
        resourceType,
        userId,
        level: PermissionLevel.ADMIN, // Higher level than required
      });

      const result = await service.checkPermission(resourceId, resourceType, userId, requiredLevel);

      expect(result).toEqual({
        hasPermission: true,
        currentLevel: PermissionLevel.ADMIN,
      });
    });

    it('should return hasPermission=false if permission level is insufficient', async () => {
      const resourceId = 'resource-id';
      const resourceType = ResourceType.DOCUMENT;
      const userId = 'user-id';
      const requiredLevel = PermissionLevel.ADMIN;

      mockPrisma.permission.findFirst.mockResolvedValue({
        id: 'permission-id',
        resourceId,
        resourceType,
        userId,
        level: PermissionLevel.WRITE, // Lower level than required
      });

      const result = await service.checkPermission(resourceId, resourceType, userId, requiredLevel);

      expect(result).toEqual({
        hasPermission: false,
        currentLevel: PermissionLevel.WRITE,
      });
    });

    it('should return hasPermission=false if permission does not exist', async () => {
      mockPrisma.permission.findFirst.mockResolvedValue(null);

      const result = await service.checkPermission(
        'resource-id',
        ResourceType.DOCUMENT,
        'user-id',
        PermissionLevel.WRITE
      );

      expect(result).toEqual({
        hasPermission: false,
      });
    });
  });

  describe('enforcePermission', () => {
    it('should not throw if permission level is sufficient', async () => {
      jest.spyOn(service, 'checkPermission').mockResolvedValue({
        hasPermission: true,
        currentLevel: PermissionLevel.ADMIN,
      });

      await expect(
        service.enforcePermission('resource-id', ResourceType.DOCUMENT, 'user-id', PermissionLevel.WRITE)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if permission level is insufficient', async () => {
      jest.spyOn(service, 'checkPermission').mockResolvedValue({
        hasPermission: false,
        currentLevel: PermissionLevel.READ,
      });

      await expect(
        service.enforcePermission('resource-id', ResourceType.DOCUMENT, 'user-id', PermissionLevel.WRITE)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
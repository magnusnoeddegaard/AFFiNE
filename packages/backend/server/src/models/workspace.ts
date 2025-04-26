import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { WorkspaceBase, WorkspaceSettings, WorkspaceVisibility } from './common';

/**
 * Workspace model for workspace operations
 */
@Injectable()
export class WorkspaceModel extends BaseModel<WorkspaceBase> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.workspace;
  }

  /**
   * Create a workspace with default settings
   * @param data The workspace data
   * @returns The created workspace
   */
  async createWithSettings(
    data: Omit<WorkspaceBase, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt' | 'settings'>,
  ): Promise<WorkspaceBase> {
    const defaultSettings: WorkspaceSettings = {
      defaultDocumentVisibility: WorkspaceVisibility.PRIVATE,
      documentNameTemplate: 'New Document',
      customTheme: null,
      features: {
        ai: true,
        history: true,
        realTimeCollaboration: true,
        publicSharing: true,
      },
    };
    
    return this.create({
      ...data,
      settings: defaultSettings,
    });
  }

  /**
   * Find workspaces by owner ID
   * @param ownerId The owner ID
   * @param options Query options
   * @returns The workspaces
   */
  async findByOwner(ownerId: string, options: any = {}): Promise<WorkspaceBase[]> {
    return this.findMany(
      { ownerId, deleted: false },
      options,
    );
  }

  /**
   * Update workspace settings
   * @param id The workspace ID
   * @param settings The new settings
   * @returns The updated workspace
   */
  async updateSettings(
    id: string,
    settings: Partial<WorkspaceSettings>,
  ): Promise<WorkspaceBase> {
    const workspace = await this.findById(id);
    
    if (!workspace) {
      throw new Error(`Workspace not found: ${id}`);
    }
    
    return this.update(id, {
      settings: {
        ...workspace.settings,
        ...settings,
      },
    });
  }

  /**
   * Update workspace visibility
   * @param id The workspace ID
   * @param visibility The new visibility
   * @returns The updated workspace
   */
  async updateVisibility(
    id: string,
    visibility: WorkspaceVisibility,
  ): Promise<WorkspaceBase> {
    return this.update(id, { visibility });
  }

  /**
   * Transfer workspace ownership
   * @param id The workspace ID
   * @param newOwnerId The new owner ID
   * @returns The updated workspace
   */
  async transferOwnership(id: string, newOwnerId: string): Promise<WorkspaceBase> {
    return this.prisma.$transaction(async (tx) => {
      // Update the workspace
      const workspace = await tx.workspace.update({
        where: { id },
        data: { ownerId: newOwnerId },
      });
      
      // Update the workspace user roles
      await tx.workspaceUser.updateMany({
        where: { workspaceId: id, userId: newOwnerId },
        data: { role: 'OWNER' },
      });
      
      // Update the previous owner's role
      await tx.workspaceUser.updateMany({
        where: { workspaceId: id, userId: workspace.ownerId, NOT: { userId: newOwnerId } },
        data: { role: 'ADMIN' },
      });
      
      return workspace;
    });
  }

  /**
   * Clone a workspace
   * @param id The source workspace ID
   * @param newName The new workspace name
   * @param ownerId The owner ID for the new workspace
   * @returns The cloned workspace
   */
  async clone(
    id: string,
    newName: string,
    ownerId: string,
  ): Promise<WorkspaceBase> {
    const source = await this.findById(id);
    
    if (!source) {
      throw new Error(`Workspace not found: ${id}`);
    }
    
    return this.prisma.$transaction(async (tx) => {
      // Create the new workspace
      const workspace = await tx.workspace.create({
        data: {
          name: newName,
          description: source.description,
          avatarUrl: source.avatarUrl,
          visibility: source.visibility,
          ownerId,
          settings: source.settings,
        },
      });
      
      // Add the owner as a workspace user
      await tx.workspaceUser.create({
        data: {
          workspaceId: workspace.id,
          userId: ownerId,
          role: 'OWNER',
          joinedAt: new Date(),
          settings: {
            showOnHomepage: true,
            defaultDocumentView: 'DOC',
            notificationSettings: {
              documentUpdates: true,
              comments: true,
              mentions: true,
              invites: true,
            },
          },
        },
      });
      
      return workspace;
    });
  }

  /**
   * Restore a soft-deleted workspace
   * @param id The workspace ID
   * @returns The restored workspace
   */
  async restore(id: string): Promise<WorkspaceBase> {
    return this.model.update({
      where: { id },
      data: {
        deleted: false,
        deletedAt: null,
      },
    });
  }

  /**
   * Hard delete a workspace and all related data
   * @param id The workspace ID
   * @returns Whether the deletion was successful
   */
  async hardDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete workspace documents and their content
        const documents = await tx.document.findMany({
          where: { workspaceId: id },
        });
        
        for (const doc of documents) {
          await tx.documentContent.deleteMany({
            where: { documentId: doc.id },
          });
          
          await tx.documentHistory.deleteMany({
            where: { documentId: doc.id },
          });
          
          await tx.documentUser.deleteMany({
            where: { documentId: doc.id },
          });
        }
        
        await tx.document.deleteMany({
          where: { workspaceId: id },
        });
        
        // Delete workspace users
        await tx.workspaceUser.deleteMany({
          where: { workspaceId: id },
        });
        
        // Delete the workspace
        await tx.workspace.delete({
          where: { id },
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error hard deleting workspace:', error);
      return false;
    }
  }
}
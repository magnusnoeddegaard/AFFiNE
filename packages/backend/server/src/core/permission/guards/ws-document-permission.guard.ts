import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PermissionService } from '../service';
import { ResourceType } from '../../../models/common';
import { Reflector } from '@nestjs/core';
import { WS_REQUIRED_PERMISSION_KEY } from '../decorators/ws-required-permission.decorator';
import { Socket } from 'socket.io';

/**
 * Guard for WebSocket connections to check document permissions
 */
@Injectable()
export class WsDocumentPermissionGuard implements CanActivate {
  private readonly logger = new Logger(WsDocumentPermissionGuard.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required permission level from the decorator
    const requiredPermission = this.reflector.get<string>(
      WS_REQUIRED_PERMISSION_KEY,
      context.getHandler(),
    );
    
    if (!requiredPermission) {
      return true; // No permission required
    }
    
    // Get the client and data
    const client: Socket = context.switchToWs().getClient();
    const data = context.switchToWs().getData();
    
    // Get the document ID from the request
    const documentId = data.documentId;
    
    if (!documentId) {
      this.logger.warn('No document ID provided in WebSocket message');
      throw new WsException('Document ID is required');
    }
    
    // Get the user from the handshake auth
    const user = client.handshake.auth.user;
    
    if (!user) {
      this.logger.warn('No user found in WebSocket connection');
      throw new WsException('Unauthorized');
    }
    
    try {
      // Check if the user has the required permission
      const hasPermission = await this.permissionService.hasPermission(
        ResourceType.DOCUMENT,
        documentId,
        user.id,
        requiredPermission,
      );
      
      if (!hasPermission) {
        this.logger.warn(
          `User ${user.id} does not have ${requiredPermission} permission for document ${documentId}`,
        );
        throw new WsException('Insufficient permissions');
      }
      
      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      
      this.logger.error(`Error checking permissions: ${error.message}`, error.stack);
      throw new WsException('An error occurred while checking permissions');
    }
  }
}
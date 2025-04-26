import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { DocumentSyncService } from './sync.service';
import { WsDocumentPermissionGuard } from '../../permission/guards/ws-document-permission.guard';
import { WsRequiredPermission } from '../../permission/decorators/ws-required-permission.decorator';
import { DocumentPermission } from '../../../models/common';

@WebSocketGateway({
  namespace: 'document-sync',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class DocumentSyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly syncService: DocumentSyncService) {}

  async handleConnection(client: Socket) {
    // Initial connection, don't need to do anything special
    // Authentication will be handled in SubscribeMessage
  }

  async handleDisconnect(client: Socket) {
    // Remove client from any rooms
    await this.syncService.handleClientDisconnect(client);
  }

  @UseGuards(WsJwtGuard, WsDocumentPermissionGuard)
  @WsRequiredPermission(DocumentPermission.READ)
  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ): Promise<WsResponse<{ success: boolean }>> {
    const success = await this.syncService.joinDocumentRoom(client, data.documentId);
    return { event: 'join-result', data: { success } };
  }

  @UseGuards(WsJwtGuard, WsDocumentPermissionGuard)
  @WsRequiredPermission(DocumentPermission.READ)
  @SubscribeMessage('leave-document')
  async handleLeaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ): Promise<WsResponse<{ success: boolean }>> {
    const success = await this.syncService.leaveDocumentRoom(client, data.documentId);
    return { event: 'leave-result', data: { success } };
  }

  @UseGuards(WsJwtGuard, WsDocumentPermissionGuard)
  @WsRequiredPermission(DocumentPermission.WRITE)
  @SubscribeMessage('document-update')
  async handleDocumentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      documentId: string;
      operation: any;
      version: number;
      cursor?: any;
    },
  ): Promise<WsResponse<{ success: boolean; error?: string }>> {
    try {
      await this.syncService.handleDocumentUpdate(client, data);
      return { event: 'update-result', data: { success: true } };
    } catch (error) {
      return {
        event: 'update-result',
        data: { success: false, error: error.message },
      };
    }
  }

  @UseGuards(WsJwtGuard, WsDocumentPermissionGuard)
  @WsRequiredPermission(DocumentPermission.READ)
  @SubscribeMessage('cursor-update')
  async handleCursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      documentId: string;
      cursor: any;
    },
  ): Promise<WsResponse<{ success: boolean }>> {
    await this.syncService.handleCursorUpdate(client, data);
    return { event: 'cursor-result', data: { success: true } };
  }

  @UseGuards(WsJwtGuard, WsDocumentPermissionGuard)
  @WsRequiredPermission(DocumentPermission.READ)
  @SubscribeMessage('sync-request')
  async handleSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ): Promise<WsResponse<{ content: any; version: number }>> {
    const result = await this.syncService.getDocumentContentForSync(data.documentId);
    return { event: 'sync-result', data: result };
  }
}
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../service';
import { Socket } from 'socket.io';

/**
 * Guard for WebSocket connections to check JWT token
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn('No token provided in WebSocket connection');
      throw new WsException('Unauthorized');
    }

    try {
      const user = await this.authService.validateToken(token);
      
      if (!user) {
        this.logger.warn('Invalid token in WebSocket connection');
        throw new WsException('Unauthorized');
      }
      
      // Store the user in the socket handshake auth object
      client.handshake.auth.user = user;
      
      return true;
    } catch (error) {
      this.logger.warn(`Error validating token: ${error.message}`);
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    // First check the handshake auth
    if (client.handshake.auth && client.handshake.auth.token) {
      return client.handshake.auth.token;
    }
    
    // Then check the handshake headers for an Authorization header
    if (client.handshake.headers.authorization) {
      const auth = client.handshake.headers.authorization;
      
      if (auth.startsWith('Bearer ')) {
        return auth.substring(7);
      }
    }
    
    // Finally check if token is directly in the query parameters
    if (client.handshake.query && client.handshake.query.token) {
      return client.handshake.query.token as string;
    }
    
    return null;
  }
}
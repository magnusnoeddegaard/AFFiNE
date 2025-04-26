import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../service';
import { Request } from 'express';

/**
 * Guard that tries to authenticate the user but doesn't throw if authentication fails.
 * Useful for endpoints that can be accessed by both authenticated and unauthenticated users.
 */
@Injectable()
export class OptionalAuthGuard {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // Try to authenticate
      const token = this.extractTokenFromHeader(request);
      if (token) {
        const user = await this.authService.validateToken(token);
        if (user) {
          // Set user in request if authentication succeeds
          request.user = user;
        }
      }
    } catch (error) {
      // Don't throw on authentication failure, just continue without setting user
    }
    
    // Always allow the request to proceed
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
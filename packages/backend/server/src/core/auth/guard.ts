import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../base/prisma';
import { LoggerService } from '../../base/logger';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Determine if we're in GraphQL or REST context
    const isGraphQL = context.getType().toString() !== 'http';
    
    // Extract request based on context type
    const request = isGraphQL
      ? GqlExecutionContext.create(context).getContext().req
      : context.switchToHttp().getRequest();
    
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authentication token');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify token
      const payload = this.jwtService.verify(token);
      
      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      // Attach user to request
      request.user = user;
      
      return true;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './service';
import { SessionService } from './session';
import { JwtAuthGuard } from './guard';

// GraphQL types (normally these would be in a separate file)
@Resolver('Auth')
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Mutation()
  async signIn(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context() context: any,
  ) {
    // Get user agent from context request
    const userAgent = context.req.headers['user-agent'] || 'unknown';
    
    // Authenticate with Supabase
    const { user, token } = await this.authService.signInWithEmailPassword(email, password);
    
    // Create a new session
    const sessionId = await this.sessionService.createSession(user.id, {
      userAgent,
    });
    
    return {
      user,
      token,
      sessionId,
    };
  }

  @Mutation()
  async signUp(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('name', { nullable: true }) name: string,
    @Context() context: any,
  ) {
    // Get user agent from context request
    const userAgent = context.req.headers['user-agent'] || 'unknown';
    
    // Register with Supabase
    const { user, token } = await this.authService.signUpWithEmailPassword(email, password, name);
    
    // Create a new session
    const sessionId = await this.sessionService.createSession(user.id, {
      userAgent,
    });
    
    return {
      user,
      token,
      sessionId,
    };
  }

  @Mutation()
  @UseGuards(JwtAuthGuard)
  async signOut(
    @Args('sessionId', { nullable: true }) sessionId: string,
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    
    if (sessionId) {
      // Delete specific session
      await this.sessionService.deleteSession(sessionId);
    } else {
      // Delete all sessions for this user
      await this.sessionService.deleteAllUserSessions(userId);
    }
    
    return { success: true };
  }

  @Query()
  @UseGuards(JwtAuthGuard)
  async me(@Context() context: any) {
    // The user is already attached to the request by the JwtAuthGuard
    return context.req.user;
  }

  @Mutation()
  async validateToken(@Args('token') token: string) {
    const user = await this.authService.validateToken(token);
    return { valid: true, user };
  }
}
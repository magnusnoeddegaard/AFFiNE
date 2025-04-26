import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Get, 
  UseGuards, 
  Req,
  UnauthorizedException
} from '@nestjs/common';
import { AuthService } from './service';
import { SessionService } from './session';
import { JwtAuthGuard } from './guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: { email: string; password: string }) {
    const { email, password } = signInDto;
    
    // Authenticate with Supabase
    const { user, token } = await this.authService.signInWithEmailPassword(email, password);
    
    // Create a new session
    const sessionId = await this.sessionService.createSession(user.id, {
      userAgent: 'web', // This should come from request headers in production
    });
    
    return {
      user,
      token,
      sessionId,
    };
  }

  @Post('sign-up')
  async signUp(@Body() signUpDto: { email: string; password: string; name?: string }) {
    const { email, password, name } = signUpDto;
    
    // Register with Supabase
    const { user, token } = await this.authService.signUpWithEmailPassword(email, password, name);
    
    // Create a new session
    const sessionId = await this.sessionService.createSession(user.id, {
      userAgent: 'web', // This should come from request headers in production
    });
    
    return {
      user,
      token,
      sessionId,
    };
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async signOut(@Req() req, @Body() body: { sessionId?: string }) {
    const { sessionId } = body;
    const userId = req.user.id;
    
    if (sessionId) {
      // Delete specific session
      await this.sessionService.deleteSession(sessionId);
    } else {
      // Delete all sessions for this user
      await this.sessionService.deleteAllUserSessions(userId);
    }
    
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    // The user is already attached to the request by the JwtAuthGuard
    return req.user;
  }

  @Post('validate-token')
  async validateToken(@Body() body: { token: string }) {
    const { token } = body;
    
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    
    const user = await this.authService.validateToken(token);
    return { valid: true, user };
  }
}
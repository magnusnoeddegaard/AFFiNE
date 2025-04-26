import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../base/prisma';
import { LoggerService } from '../../base/logger';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    // Initialize Supabase client
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Missing Supabase configuration');
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Sign in a user with email and password
   */
  async signInWithEmailPassword(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error(`Sign in failed: ${error.message}`, { email });
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user exists in our database
      const user = await this.getOrCreateUser(data.user);
      
      // Generate session token
      const token = this.generateToken(user);
      
      return {
        user,
        token,
      };
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`, { email });
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Sign up a new user with email and password
   */
  async signUpWithEmailPassword(email: string, password: string, name?: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        this.logger.error(`Sign up failed: ${error.message}`, { email });
        throw new Error(error.message);
      }

      // Create user in our database
      const user = await this.getOrCreateUser(data.user, name);
      
      // Generate session token
      const token = this.generateToken(user);
      
      return {
        user,
        token,
      };
    } catch (error) {
      this.logger.error(`User registration error: ${error.message}`, { email });
      throw new Error('User registration failed');
    }
  }

  /**
   * Verify a JWT token and return the user
   */
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get or create a user in our database based on Supabase auth data
   */
  private async getOrCreateUser(supabaseUser: any, name?: string) {
    if (!supabaseUser) {
      throw new Error('User data is missing');
    }

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: supabaseUser.email },
    });

    // If not, create a new user
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: name || supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          authProvider: 'supabase',
        },
      });
    }

    return user;
  }

  /**
   * Generate a JWT token for a user
   */
  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }
}
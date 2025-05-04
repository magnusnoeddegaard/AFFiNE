import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { LoggerService } from '../../base/logger';
import { PrismaService } from '../../base/prisma';

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
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
  async signUpWithEmailPassword(
    email: string,
    password: string,
    name?: string
  ) {
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
   * Verify user credentials without creating a session
   * @param email User email
   * @param password User password
   * @returns User data if credentials are valid
   */
  async verifyCredentials(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error(`Credential verification failed: ${error.message}`, {
          email,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      // Return the user from our database
      const user = await this.prisma.user.findUnique({
        where: { email: data.user.email },
      });

      if (!user) {
        throw new UnauthorizedException('User not found in database');
      }

      return user;
    } catch (error) {
      this.logger.error(`Credential verification error: ${error.message}`, {
        email,
      });
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Update a user's email address
   * @param userId User ID
   * @param newEmail New email address
   * @param password Current password for verification
   * @returns Updated user data
   */
  async updateEmail(userId: string, newEmail: string, password: string) {
    try {
      // Get current user email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Verify credentials before allowing email change
      await this.verifyCredentials(user.email, password);

      // Update email in Supabase
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
      });

      if (error) {
        this.logger.error(
          `Failed to update email in Supabase: ${error.message}`,
          { userId, newEmail }
        );
        throw new InternalServerErrorException('Failed to update email');
      }

      // Update email in our database
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      return updatedUser;
    } catch (error) {
      this.logger.error(`Email update error: ${error.message}`, {
        userId,
        newEmail,
      });
      throw error;
    }
  }

  /**
   * Delete a user account
   * @param userId User ID
   * @param password Current password for verification
   * @returns Success status
   */
  async deleteUser(userId: string, password: string) {
    try {
      // Get current user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Verify credentials before allowing account deletion
      await this.verifyCredentials(user.email, password);

      // Delete user from Supabase
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.error(
          `Failed to delete user from Supabase: ${error.message}`,
          { userId }
        );
        throw new InternalServerErrorException('Failed to delete user account');
      }

      // Delete user from our database
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`User deletion error: ${error.message}`, { userId });
      throw error;
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
          name:
            name ||
            supabaseUser.user_metadata?.name ||
            supabaseUser.email.split('@')[0],
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

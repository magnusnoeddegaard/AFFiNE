import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { Timestamps } from './common';

/**
 * Verification token types
 */
export enum VerificationTokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  INVITE = 'INVITE',
}

/**
 * Verification token interface
 */
export interface VerificationToken extends Timestamps {
  id: string;
  token: string;
  type: VerificationTokenType;
  userId: string;
  email: string;
  expires: Date;
  used: boolean;
  usedAt: Date | null;
  data: Record<string, any>;
}

/**
 * VerificationToken model for token operations
 */
@Injectable()
export class VerificationTokenModel extends BaseModel<VerificationToken> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.verificationToken;
  }

  /**
   * Find a token by its value
   * @param token The token value
   * @returns The token or null
   */
  async findByToken(token: string): Promise<VerificationToken | null> {
    return this.model.findFirst({
      where: { token },
    });
  }

  /**
   * Create a new verification token
   * @param type The token type
   * @param userId The user ID
   * @param email The email address
   * @param expiresInHours How many hours until the token expires
   * @param data Additional data
   * @returns The created token
   */
  async createToken(
    type: VerificationTokenType,
    userId: string,
    email: string,
    expiresInHours: number = 24,
    data: Record<string, any> = {},
  ): Promise<VerificationToken> {
    // Generate a random token
    const token = Buffer.from(Math.random().toString(36) + Date.now().toString(36))
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
    
    // Calculate expiration date
    const expires = new Date();
    expires.setHours(expires.getHours() + expiresInHours);
    
    return this.create({
      token,
      type,
      userId,
      email,
      expires,
      used: false,
      usedAt: null,
      data,
    });
  }

  /**
   * Validate and use a token
   * @param token The token value
   * @returns The token if valid, null otherwise
   */
  async validateAndUseToken(token: string): Promise<VerificationToken | null> {
    const verificationToken = await this.findByToken(token);
    
    if (!verificationToken) {
      return null;
    }
    
    // Check if the token is expired
    if (verificationToken.expires < new Date()) {
      return null;
    }
    
    // Check if the token is already used
    if (verificationToken.used) {
      return null;
    }
    
    // Mark the token as used
    return this.update(verificationToken.id, {
      used: true,
      usedAt: new Date(),
    });
  }

  /**
   * Check if a token is valid without marking it as used
   * @param token The token value
   * @returns Whether the token is valid
   */
  async isTokenValid(token: string): Promise<boolean> {
    const verificationToken = await this.findByToken(token);
    
    if (!verificationToken) {
      return false;
    }
    
    // Check if the token is expired
    if (verificationToken.expires < new Date()) {
      return false;
    }
    
    // Check if the token is already used
    if (verificationToken.used) {
      return false;
    }
    
    return true;
  }

  /**
   * Delete expired tokens
   * @returns The count of deleted tokens
   */
  async deleteExpiredTokens(): Promise<number> {
    const result = await this.prisma.verificationToken.deleteMany({
      where: {
        OR: [
          { expires: { lt: new Date() } },
          { used: true },
        ],
      },
    });
    
    return result.count;
  }

  /**
   * Find active tokens by user ID and type
   * @param userId The user ID
   * @param type The token type
   * @returns The active tokens
   */
  async findActiveByUserAndType(
    userId: string,
    type: VerificationTokenType,
  ): Promise<VerificationToken[]> {
    return this.model.findMany({
      where: {
        userId,
        type,
        used: false,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Invalidate all active tokens for a user and type
   * @param userId The user ID
   * @param type The token type
   * @returns The count of invalidated tokens
   */
  async invalidateTokens(
    userId: string,
    type: VerificationTokenType,
  ): Promise<number> {
    const result = await this.prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        used: false,
        expires: { gt: new Date() },
      },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
    
    return result.count;
  }
}
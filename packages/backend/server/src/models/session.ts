import { Injectable } from '@nestjs/common';
import { PrismaService } from '../base/prisma';
import { BaseModel } from './base';
import { Timestamps } from './common';

/**
 * Session interface
 */
export interface Session extends Timestamps {
  id: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActive: Date;
  expires: Date;
  data: Record<string, any>;
}

/**
 * Session model for session operations
 */
@Injectable()
export class SessionModel extends BaseModel<Session> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return this.prisma.session;
  }

  /**
   * Find a session by token
   * @param token The session token
   * @returns The session or null
   */
  async findByToken(token: string): Promise<Session | null> {
    return this.model.findFirst({
      where: { token },
    });
  }

  /**
   * Find active sessions for a user
   * @param userId The user ID
   * @returns The active sessions
   */
  async findActiveByUser(userId: string): Promise<Session[]> {
    return this.model.findMany({
      where: {
        userId,
        expires: { gt: new Date() },
      },
      orderBy: { lastActive: 'desc' },
    });
  }

  /**
   * Create a new session
   * @param userId The user ID
   * @param ipAddress The IP address
   * @param userAgent The user agent
   * @param expiresInHours How many hours until the session expires
   * @param data Additional session data
   * @returns The created session
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    expiresInHours: number = 24,
    data: Record<string, any> = {},
  ): Promise<Session> {
    // Generate a random token
    const token = Buffer.from(Math.random().toString(36) + Date.now().toString(36))
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
    
    // Calculate expiration date
    const expires = new Date();
    expires.setHours(expires.getHours() + expiresInHours);
    
    return this.create({
      userId,
      token,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      lastActive: new Date(),
      expires,
      data,
    });
  }

  /**
   * Update session last activity
   * @param token The session token
   * @returns The updated session
   */
  async updateActivity(token: string): Promise<Session | null> {
    const session = await this.findByToken(token);
    
    if (!session) {
      return null;
    }
    
    return this.update(session.id, {
      lastActive: new Date(),
    });
  }

  /**
   * Extend session expiration
   * @param token The session token
   * @param expiresInHours How many hours to extend the session
   * @returns The updated session
   */
  async extendSession(token: string, expiresInHours: number = 24): Promise<Session | null> {
    const session = await this.findByToken(token);
    
    if (!session) {
      return null;
    }
    
    // Calculate new expiration date
    const expires = new Date();
    expires.setHours(expires.getHours() + expiresInHours);
    
    return this.update(session.id, {
      lastActive: new Date(),
      expires,
    });
  }

  /**
   * Update session data
   * @param token The session token
   * @param data The data to update
   * @returns The updated session
   */
  async updateSessionData(
    token: string,
    data: Record<string, any>,
  ): Promise<Session | null> {
    const session = await this.findByToken(token);
    
    if (!session) {
      return null;
    }
    
    return this.update(session.id, {
      data: {
        ...session.data,
        ...data,
      },
      lastActive: new Date(),
    });
  }

  /**
   * Invalidate a session
   * @param token The session token
   * @returns Whether the session was invalidated
   */
  async invalidateSession(token: string): Promise<boolean> {
    const session = await this.findByToken(token);
    
    if (!session) {
      return false;
    }
    
    // Set expiration to now
    await this.update(session.id, {
      expires: new Date(),
    });
    
    return true;
  }

  /**
   * Invalidate all sessions for a user
   * @param userId The user ID
   * @param exceptToken Optional token to exclude
   * @returns The count of invalidated sessions
   */
  async invalidateUserSessions(userId: string, exceptToken?: string): Promise<number> {
    const where: any = { userId, expires: { gt: new Date() } };
    
    if (exceptToken) {
      where.NOT = { token: exceptToken };
    }
    
    const result = await this.prisma.session.updateMany({
      where,
      data: {
        expires: new Date(),
      },
    });
    
    return result.count;
  }

  /**
   * Delete expired sessions
   * @returns The count of deleted sessions
   */
  async deleteExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expires: { lt: new Date() },
      },
    });
    
    return result.count;
  }
}
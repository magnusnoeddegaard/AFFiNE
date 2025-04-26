import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../base/prisma';
import { RedisService } from '../../base/redis';

@Injectable()
export class SessionService {
  private readonly sessionPrefix = 'session:';
  private readonly sessionTTL: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.sessionTTL = this.configService.get<number>('SESSION_TTL', 60 * 60 * 24 * 7); // 7 days default
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, metadata: Record<string, any> = {}) {
    // Generate a unique session ID
    const sessionId = `${userId}_${Date.now()}`;
    
    // Create session data
    const sessionData = {
      userId,
      createdAt: new Date(),
      metadata,
      lastActive: new Date(),
    };
    
    // Store in Redis with TTL
    await this.redis.client.set(
      `${this.sessionPrefix}${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      this.sessionTTL
    );
    
    // Store session in database for tracking
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + this.sessionTTL * 1000),
        metadata: metadata as any,
      },
    });
    
    return sessionId;
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string) {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const sessionData = await this.redis.client.get(sessionKey);
    
    if (!sessionData) {
      return null;
    }
    
    // Update last active time
    await this.updateSessionActivity(sessionId);
    
    return JSON.parse(sessionData);
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionId: string) {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const sessionData = await this.redis.client.get(sessionKey);
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastActive = new Date();
      
      await this.redis.client.set(
        sessionKey,
        JSON.stringify(session),
        'EX',
        this.sessionTTL
      );
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string) {
    // Remove from Redis
    await this.redis.client.del(`${this.sessionPrefix}${sessionId}`);
    
    // Update database record
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string) {
    // Get all sessions for user from database
    const sessions = await this.prisma.session.findMany({
      where: { userId },
    });
    
    // Delete each session from Redis
    for (const session of sessions) {
      await this.redis.client.del(`${this.sessionPrefix}${session.id}`);
    }
    
    // Update all session records in database
    await this.prisma.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date() },
    });
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config';
import { RedisService } from '../redis';

@Injectable()
export class MutexService {
  private readonly logger = new Logger(MutexService.name);
  private readonly lockPrefix = 'mutex:';
  private readonly defaultTTL = 30000; // 30 seconds default lock TTL

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Acquire a distributed lock
   * @param key The lock key (resource identifier)
   * @param ttl Time to live in milliseconds
   * @returns A unique lock token if successful, null if already locked
   */
  async acquireLock(key: string, ttl: number = this.defaultTTL): Promise<string | null> {
    const lockKey = this.getLockKey(key);
    const token = this.generateToken();
    
    // Use Redis SET NX (not exists) with expiry
    const acquired = await this.redisService.client.set(
      lockKey,
      token,
      'PX', // PX = milliseconds expiry
      ttl,
      'NX', // NX = only set if key does not exist
    );

    if (acquired === 'OK') {
      this.logger.debug(`Lock acquired: ${key} with token: ${token}`);
      return token;
    }
    
    this.logger.debug(`Failed to acquire lock: ${key}`);
    return null;
  }

  /**
   * Release a previously acquired lock
   * @param key The lock key (resource identifier)
   * @param token The unique token returned when the lock was acquired
   * @returns true if lock was released, false otherwise
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    
    // Use Lua script to ensure we only release our own lock
    const script = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.redisService.client.eval(
      script,
      1, // number of keys
      lockKey, // KEYS[1]
      token, // ARGV[1]
    );
    
    const released = result === 1;
    if (released) {
      this.logger.debug(`Lock released: ${key} with token: ${token}`);
    } else {
      this.logger.debug(`Failed to release lock: ${key} with token: ${token} (lock may have expired or been taken by another process)`);
    }
    
    return released;
  }

  /**
   * Execute a function within a lock
   * @param key The lock key (resource identifier)
   * @param fn The function to execute while holding the lock
   * @param ttl Time to live in milliseconds
   * @param retryDelay Delay between retries in milliseconds
   * @param maxRetries Maximum number of retry attempts
   * @returns The result of the function execution
   * @throws Error if unable to acquire lock after retries
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.defaultTTL,
    retryDelay: number = 100,
    maxRetries: number = 5,
  ): Promise<T> {
    let retries = 0;
    let token: string | null = null;
    
    // Try to acquire the lock with retries
    while (!token && retries < maxRetries) {
      token = await this.acquireLock(key, ttl);
      if (!token) {
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    if (!token) {
      throw new Error(`Failed to acquire lock for ${key} after ${maxRetries} retries`);
    }
    
    try {
      // Execute the function while holding the lock
      return await fn();
    } finally {
      // Always attempt to release the lock
      await this.releaseLock(key, token);
    }
  }

  private getLockKey(key: string): string {
    return `${this.lockPrefix}${key}`;
  }

  private generateToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

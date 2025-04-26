import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', '') || undefined,
    };

    this.client = new Redis(redisConfig);
    this.pubClient = new Redis(redisConfig);
    this.subClient = new Redis(redisConfig);

    // Test the connection
    try {
      await this.client.ping();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Redis connection failed', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.pubClient.quit();
    await this.subClient.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  getPubClient(): Redis {
    return this.pubClient;
  }

  getSubClient(): Redis {
    return this.subClient;
  }

  /**
   * Set a key-value pair with an optional expiration time in seconds
   */
  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    if (expireInSeconds) {
      await this.client.set(key, value, 'EX', expireInSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.pubClient.publish(channel, message);
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, callback: (message: string) => void): void {
    this.subClient.subscribe(channel);
    this.subClient.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.subClient.unsubscribe(channel);
  }
}
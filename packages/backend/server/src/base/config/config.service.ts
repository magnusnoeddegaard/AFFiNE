import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get<T>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue);
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.get<string | undefined>(key, defaultValue?.toString());
    return value ? Number(value) : (defaultValue ?? 0);
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get<string | undefined>(key, defaultValue?.toString());
    return value ? value.toLowerCase() === 'true' : !!defaultValue;
  }

  getString(key: string, defaultValue?: string): string {
    return this.get<string>(key, defaultValue) ?? '';
  }

  getRequired<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Required config key "${key}" is missing`);
    }
    return value;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return {
      url: this.getRequired<string>('DATABASE_URL'),
    };
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    return {
      host: this.getString('REDIS_HOST', 'localhost'),
      port: this.getNumber('REDIS_PORT', 6379),
      password: this.getString('REDIS_PASSWORD', ''),
    };
  }

  /**
   * Get storage configuration
   */
  getStorageConfig() {
    return {
      provider: this.getString('STORAGE_PROVIDER', 'fs'),
      path: this.getString('STORAGE_PATH', './storage'),
    };
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return {
      level: this.getString('LOG_LEVEL', 'info'),
    };
  }
}
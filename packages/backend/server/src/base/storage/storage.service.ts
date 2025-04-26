import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProviderFactory } from './providers/factory';
import { StorageProvider } from './providers/storage.provider';
import { Readable } from 'stream';
import { createHash } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private provider: StorageProvider;

  constructor(
    private configService: ConfigService,
    private providerFactory: StorageProviderFactory,
  ) {}

  async onModuleInit() {
    const providerType = this.configService.get<string>('STORAGE_PROVIDER', 'fs');
    this.provider = this.providerFactory.createProvider(providerType);
    await this.provider.init();
  }

  /**
   * Store a file with the given key
   */
  async storeFile(
    key: string,
    content: Buffer | Readable | string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    return this.provider.storeFile(key, content, metadata);
  }

  /**
   * Get a file by key
   */
  async getFile(key: string): Promise<Buffer> {
    return this.provider.getFile(key);
  }

  /**
   * Get a file stream by key
   */
  getFileStream(key: string): Readable {
    return this.provider.getFileStream(key);
  }

  /**
   * Delete a file by key
   */
  async deleteFile(key: string): Promise<void> {
    return this.provider.deleteFile(key);
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    return this.provider.fileExists(key);
  }

  /**
   * Get a file URL (if supported by the provider)
   */
  async getFileUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.provider.getFileUrl(key, expiresInSeconds);
  }

  /**
   * Generate a storage key from file content
   */
  generateStorageKey(content: Buffer | string, prefix?: string): string {
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
    const hash = createHash('sha256').update(contentBuffer).digest('hex');
    return prefix ? `${prefix}/${hash}` : hash;
  }
}
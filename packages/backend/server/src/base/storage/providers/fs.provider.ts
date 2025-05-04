import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './storage.provider';
import { promises as fs, createReadStream, createWriteStream, constants } from 'fs';
import { join, dirname } from 'path';
import { Readable } from 'stream';

@Injectable()
export class FileSystemStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get<string>('STORAGE_PATH', './storage');
  }

  async init(): Promise<void> {
    // Make sure the storage directory exists
    try {
      await fs.access(this.basePath);
    } catch (error) {
      await fs.mkdir(this.basePath, { recursive: true });
    }
  }

  async storeFile(
    key: string,
    content: Buffer | Readable | string,
    _metadata?: Record<string, string>,
  ): Promise<void> {
    const filePath = this.getFilePath(key);
    
    // Ensure the directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });
    
    if (Buffer.isBuffer(content)) {
      await fs.writeFile(filePath, content);
    } else if (typeof content === 'string') {
      await fs.writeFile(filePath, content, 'utf8');
    } else if (content instanceof Readable) {
      // Handle stream
      const writeStream = createWriteStream(filePath);
      return new Promise((resolve, reject) => {
        content.pipe(writeStream);
        writeStream.on('finish', resolve);
        content.on('error', reject);
        writeStream.on('error', reject);
      });
    }
  }

  async getFile(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    return fs.readFile(filePath);
  }

  getFileStream(key: string): Readable {
    const filePath = this.getFilePath(key);
    return createReadStream(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
      
      // Try to remove empty directories
      const directory = dirname(filePath);
      if (directory !== this.basePath) {
        try {
          const files = await fs.readdir(directory);
          if (files.length === 0) {
            await fs.rmdir(directory);
          }
        } catch (error) {
          // Ignore directory deletion errors
        }
      }
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath, constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    // File system storage doesn't support URLs
    // Return a file:// URL for local development
    if (await this.fileExists(key)) {
      const filePath = this.getFilePath(key);
      return `file://${filePath}`;
    }
    throw new Error(`File not found: ${key}`);
  }

  private getFilePath(key: string): string {
    // Normalize the key to prevent path traversal
    const normalizedKey = key
      .split('/')
      .filter(Boolean)
      .join('/');
    
    return join(this.basePath, normalizedKey);
  }
}
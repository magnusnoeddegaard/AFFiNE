import { Readable } from 'stream';

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /**
   * Initialize the storage provider
   */
  init(): Promise<void>;

  /**
   * Store a file with the given key
   */
  storeFile(
    key: string,
    content: Buffer | Readable | string,
    metadata?: Record<string, string>,
  ): Promise<void>;

  /**
   * Get a file by key
   */
  getFile(key: string): Promise<Buffer>;

  /**
   * Get a file stream by key
   */
  getFileStream(key: string): Readable;

  /**
   * Delete a file by key
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get a file URL (if supported by the provider)
   */
  getFileUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
import { Injectable } from '@nestjs/common';
import { FileSystemStorageProvider } from './fs.provider';
import { StorageProvider } from './storage.provider';

@Injectable()
export class StorageProviderFactory {
  constructor(private fsProvider: FileSystemStorageProvider) {}

  /**
   * Create a storage provider based on the provider type
   */
  createProvider(providerType: string): StorageProvider {
    switch (providerType.toLowerCase()) {
      case 'fs':
        return this.fsProvider;
      // Add other providers like S3, R2 in the future
      default:
        throw new Error(`Unsupported storage provider type: ${providerType}`);
    }
  }
}
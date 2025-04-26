import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageProviderFactory } from './providers/factory';
import { FileSystemStorageProvider } from './providers/fs.provider';

@Module({
  providers: [
    StorageService,
    StorageProviderFactory,
    FileSystemStorageProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}
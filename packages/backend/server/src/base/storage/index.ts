import { Module } from '@nestjs/common';

import { StorageProviderFactory } from './providers/factory';
import { FileSystemStorageProvider } from './providers/fs.provider';
import { StorageService } from './storage.service';

export { StorageService } from './storage.service';

@Module({
  providers: [
    StorageService,
    StorageProviderFactory,
    FileSystemStorageProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}

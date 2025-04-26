import { Module } from '@nestjs/common';
import { BlobModule } from './blob';

@Module({
  imports: [BlobModule],
  exports: [BlobModule],
})
export class StorageModule {}
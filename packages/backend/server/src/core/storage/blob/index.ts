import { Module } from '@nestjs/common';
import { BlobController } from './controller';
import { BlobResolver } from './resolver';
import { BlobService } from './service';

@Module({
  providers: [BlobService, BlobResolver],
  controllers: [BlobController],
  exports: [BlobService],
})
export class BlobModule {}
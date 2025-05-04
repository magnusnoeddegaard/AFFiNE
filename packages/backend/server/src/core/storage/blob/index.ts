import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // For ConfigService
import { PrismaModule } from '../../../base/prisma'; // For PrismaService
import { StorageModule } from '../../../base/storage'; // For StorageService

import { BlobController } from './controller';
import { BlobResolver } from './resolver';
import { BlobService } from './service';

export { BlobService } from './service';

@Module({
  imports: [PrismaModule, StorageModule, ConfigModule],
  providers: [BlobService, BlobResolver],
  controllers: [BlobController],
  exports: [BlobService],
})
export class BlobModule {}
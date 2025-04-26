import { Module } from '@nestjs/common';
import { ConfigModule } from '../config';
import { RedisModule } from '../redis';
import { MutexService } from './mutex.service';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [MutexService],
  exports: [MutexService],
})
export class MutexModule {}

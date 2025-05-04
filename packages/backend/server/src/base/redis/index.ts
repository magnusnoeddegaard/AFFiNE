import { Module } from '@nestjs/common';

import { RedisService } from './redis.service';

export { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

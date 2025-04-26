import { Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { GraphQLConfigModule } from './graphql';
import { LoggerModule } from './logger';
import { MetricsModule } from './metrics';
import { StorageModule } from './storage';
import { ErrorModule } from './error';
import { MutexModule } from './mutex';
import { SwaggerModule } from './swagger';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    GraphQLConfigModule,
    LoggerModule,
    MetricsModule,
    StorageModule,
    ErrorModule,
    MutexModule,
    SwaggerModule,
  ],
  exports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    GraphQLConfigModule,
    LoggerModule,
    MetricsModule,
    StorageModule,
    ErrorModule,
    MutexModule,
    SwaggerModule,
  ],
})
export class BaseModule {}
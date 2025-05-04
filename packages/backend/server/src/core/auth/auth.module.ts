import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConfigModule } from '../../base/config';
import { LoggerModule } from '../../base/logger';
import { PrismaModule } from '../../base/prisma';
import { RedisModule } from '../../base/redis';
import { AuthController } from './controller';
import { AuthResolver } from './resolver';
import { AuthService } from './service';
import { SessionService } from './session';

@Module({
  imports: [
    JwtModule.register({}), 
    ConfigModule, 
    PrismaModule, 
    RedisModule, 
    LoggerModule
  ],
  providers: [AuthService, AuthResolver, SessionService],
  controllers: [AuthController],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { ConfigModule } from '../../base/config';
import { LoggerModule } from '../../base/logger';
import { PrismaModule } from '../../base/prisma';
import { RedisModule } from '../../base/redis';
import { AuthController } from './controller';
import { AuthResolver } from './resolver';
import { AuthService } from './service';
import { SessionService } from './session';

export { AuthService } from './service';
export { SessionService } from './session';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
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
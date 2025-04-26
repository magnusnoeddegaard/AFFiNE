import { Module } from '@nestjs/common';
import { AuthService } from './service';
import { AuthController } from './controller';
import { AuthResolver } from './resolver';
import { SessionService } from './session';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, AuthResolver, SessionService],
  controllers: [AuthController],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
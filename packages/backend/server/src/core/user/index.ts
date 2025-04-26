import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { UserController } from './controller';
import { UserResolver } from './resolver';
import { UserService } from './service';

@Module({
  imports: [AuthModule],
  providers: [UserService, UserResolver],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { StorageModule } from '../../base/storage'; // Import StorageModule
import { UserController } from './controller';
import { UserResolver } from './resolver';
import { UserService } from './service';

export { UserService } from './service';

@Module({
  imports: [
    AuthModule, 
    StorageModule  // Add StorageModule to imports
  ],
  providers: [UserService, UserResolver],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
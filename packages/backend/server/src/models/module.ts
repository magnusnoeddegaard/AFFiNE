import { Module } from '@nestjs/common';

import { PrismaModule } from '../base/prisma';

/**
 * Models module that provides database models and repositories
 * This module wraps PrismaModule and can be imported by other modules
 * that need access to database models
 */
@Module({
  imports: [PrismaModule],
  exports: [PrismaModule],
})
export class ModelsModule {}

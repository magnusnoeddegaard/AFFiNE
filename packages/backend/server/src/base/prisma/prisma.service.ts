import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      log: 
        configService.get('NODE_ENV') === 'development' 
          ? ['query', 'info', 'warn', 'error'] 
          : ['warn', 'error'],
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    // Only allow in test environment
    if (this.configService.get('NODE_ENV') !== 'test') {
      throw new Error('Database cleaning is only available in test environment');
    }

    // Add cleanup logic here as needed
    // This is useful for tests to clean up the database between test runs
  }
}
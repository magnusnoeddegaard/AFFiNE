// In app.module.ts, replace the GraphQL configuration with:

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLConfigModule } from './base/graphql/graphql-config.module';
import { BaseModule } from './base';
import { CoreModule } from './core';
import { PluginsModule } from './plugins';

@Module({
  imports: [
    // Load and validate environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // GraphQL configuration - now using the dedicated module
    GraphQLConfigModule,
    
    // Import base module with core infrastructure
    BaseModule,
    
    // Import core domain modules
    CoreModule,
    
    // Import plugins including AI capabilities
    PluginsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
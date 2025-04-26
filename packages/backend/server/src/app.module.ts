import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
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
    
    // GraphQL configuration
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.GRAPHQL_PLAYGROUND === 'true',
      debug: process.env.GRAPHQL_DEBUG === 'true',
      context: ({ req }) => ({ req }),
    }),
    
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
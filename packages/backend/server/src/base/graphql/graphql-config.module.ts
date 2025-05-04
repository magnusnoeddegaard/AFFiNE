// src/base/graphql/graphql-config.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { LoggingPlugin } from './logging.plugin';
import { Request } from 'express';
import { GraphQLError, GraphQLFormattedError } from 'graphql';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: configService.get<boolean>('GRAPHQL_PLAYGROUND', true),
        debug: configService.get<boolean>('GRAPHQL_DEBUG', true),
        introspection: configService.get<boolean>('GRAPHQL_PLAYGROUND', true),
        plugins: [new LoggingPlugin()],
        context: ({ req }: { req: Request }) => ({ req }),
        formatError: (error: GraphQLError): GraphQLFormattedError => {
          const originalError = error.extensions?.originalError as any;
          
          if (!originalError) {
            return {
              message: error.message,
              locations: error.locations,
              path: error.path,
            };
          }
          
          return {
            message: error.message,
            locations: error.locations,
            path: error.path,
            extensions: {
              code: originalError.code || 'INTERNAL_SERVER_ERROR',
              details: originalError.details || null,
              ...error.extensions
            }
          };
        },
      }),
    }),
  ],
  exports: [GraphQLModule],
})
export class GraphQLConfigModule {}
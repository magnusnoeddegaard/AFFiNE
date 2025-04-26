import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { LoggingPlugin } from './logging.plugin';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: configService.get<boolean>('GRAPHQL_PLAYGROUND', true),
        debug: configService.get<boolean>('GRAPHQL_DEBUG', true),
        introspection: configService.get<boolean>('GRAPHQL_PLAYGROUND', true),
        context: ({ req }) => ({ req }),
        formatError: (error) => {
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
            code: originalError.code || 'INTERNAL_SERVER_ERROR',
            details: originalError.details || null,
            locations: error.locations,
            path: error.path,
          };
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LoggingPlugin],
  exports: [GraphQLModule],
})
export class GraphQLConfigModule {}
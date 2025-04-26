import { Plugin } from '@nestjs/apollo';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from 'apollo-server-plugin-base';
import { Logger } from '@nestjs/common';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger('GraphQL');

  async requestDidStart(
    requestContext: GraphQLRequestContext,
  ): Promise<GraphQLRequestListener> {
    const query = requestContext.request.query?.replace(/\s+/g, ' ').trim();
    const operationName = requestContext.request.operationName;
    const variables = requestContext.request.variables;

    this.logger.debug(
      `Request started: ${operationName || 'anonymous'} ${
        query ? `- ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}` : ''
      }`,
    );

    if (variables && Object.keys(variables).length > 0) {
      this.logger.debug(`Variables: ${JSON.stringify(variables)}`);
    }

    const start = Date.now();

    return {
      async willSendResponse(responseContext) {
        const time = Date.now() - start;
        
        if (responseContext.errors) {
          this.logger.warn(
            `Request ${operationName || 'anonymous'} completed with errors in ${time}ms`,
          );
          responseContext.errors.forEach((error) => {
            this.logger.warn(`Error: ${error.message}`);
            if (error.extensions?.exception?.stacktrace) {
              this.logger.debug(
                `Stack: ${error.extensions.exception.stacktrace.join('\n')}`,
              );
            }
          });
        } else {
          this.logger.debug(
            `Request ${operationName || 'anonymous'} completed successfully in ${time}ms`,
          );
        }
      },
    };
  }
}
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    
    // Handle GraphQL errors
    if (host.getType() === 'http' && host.getArgByIndex(0)?.req?.body?.operationName) {
      // This appears to be a GraphQL request
      // GraphQL has its own error handling, so we don't need to do anything here
      this.logError(exception);
      return;
    }

    // Handle REST errors
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logError(exception, request);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'object' ? message : { error: message },
    });
  }

  private logError(exception: unknown, request?: Request) {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Unknown error';
    
    const stack = exception instanceof Error ? exception.stack : 'No stack trace';
    
    if (status >= 500) {
      this.logger.error(
        `${request?.method || 'GraphQL'} ${request?.url || 'operation'} ${status} - ${JSON.stringify(message)}`,
        stack,
      );
    } else {
      this.logger.warn(
        `${request?.method || 'GraphQL'} ${request?.url || 'operation'} ${status} - ${JSON.stringify(message)}`,
      );
    }
  }
}
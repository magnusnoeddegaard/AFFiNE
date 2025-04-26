import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { MutexService } from './mutex.service';
import { MUTEX_KEY_METADATA, MUTEX_OPTIONS_METADATA, MutexOptions } from './mutex.decorator';

@Injectable()
export class MutexInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MutexInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly mutexService: MutexService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const keyMetadata = this.reflector.get<string | ((...args: any[]) => string)>(
      MUTEX_KEY_METADATA,
      context.getHandler(),
    );

    const options = this.reflector.get<MutexOptions>(
      MUTEX_OPTIONS_METADATA, 
      context.getHandler(),
    ) || {};

    if (!keyMetadata) {
      return next.handle();
    }

    // Get method arguments
    const args = context.getArgByIndex(1);
    
    // Determine lock key
    const lockKey = typeof keyMetadata === 'function'
      ? keyMetadata(...args)
      : keyMetadata;

    this.logger.debug(`Acquiring mutex lock for key: ${lockKey}`);
    
    // Execute the handler with mutex lock
    return await this.mutexService.withLock(
      lockKey, 
      () => next.handle().toPromise(), 
      options.ttl,
      options.retryDelay,
      options.maxRetries,
    );
  }
}

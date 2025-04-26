import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { MutexInterceptor } from './mutex.interceptor';

export const MUTEX_KEY_METADATA = 'mutex:key';
export const MUTEX_OPTIONS_METADATA = 'mutex:options';

export interface MutexOptions {
  ttl?: number;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Decorator to apply a mutex lock to a method
 * @param key The lock key or a function to generate the key from method arguments
 * @param options Optional mutex configuration
 */
export function WithMutex(
  key: string | ((...args: any[]) => string),
  options: MutexOptions = {},
) {
  return applyDecorators(
    SetMetadata(MUTEX_KEY_METADATA, key),
    SetMetadata(MUTEX_OPTIONS_METADATA, options),
    UseInterceptors(MutexInterceptor),
  );
}

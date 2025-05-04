import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Decorator to extract the current user from the request
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);

/**
 * Public route metadata key
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public decorator
 * Use this decorator to mark a route as public (no authentication required)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Internal route metadata key
 */
export const IS_INTERNAL_KEY = 'isInternal';

/**
 * Internal decorator
 * Use this decorator to mark a route as internal (only accessible from internal services)
 */
export const Internal = () => SetMetadata(IS_INTERNAL_KEY, true);
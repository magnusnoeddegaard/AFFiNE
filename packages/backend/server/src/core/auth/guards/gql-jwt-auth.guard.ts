import { ExecutionContext,Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { AuthGuard } from './auth.guard';

/**
 * JWT authentication guard for GraphQL requests
 * Extracts JWT from GraphQL context and validates it
 */
@Injectable()
export class GqlJwtAuthGuard extends AuthGuard {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

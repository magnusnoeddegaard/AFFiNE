import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application error class
 */
export class AppError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        message,
        code,
        details,
      },
      status,
    );
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    code: string = 'NOT_FOUND',
    details?: Record<string, any>,
  ) {
    super(message, HttpStatus.NOT_FOUND, code, details);
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(
    message: string = 'Bad request',
    code: string = 'BAD_REQUEST',
    details?: Record<string, any>,
  ) {
    super(message, HttpStatus.BAD_REQUEST, code, details);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Unauthorized',
    code: string = 'UNAUTHORIZED',
    details?: Record<string, any>,
  ) {
    super(message, HttpStatus.UNAUTHORIZED, code, details);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN',
    details?: Record<string, any>,
  ) {
    super(message, HttpStatus.FORBIDDEN, code, details);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Conflict',
    code: string = 'CONFLICT',
    details?: Record<string, any>,
  ) {
    super(message, HttpStatus.CONFLICT, code, details);
  }
}

/**
 * Internal server error
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>,
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, code, details);
  }
}
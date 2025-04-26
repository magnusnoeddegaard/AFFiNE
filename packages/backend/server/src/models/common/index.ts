/**
 * Common model utilities and types
 * Export all common types for models
 */
export * from './doc';
export * from './user';
export * from './workspace';
export * from './role';

/**
 * Common pagination options
 */
export interface PaginationOptions {
  skip?: number;
  take?: number;
}

/**
 * Common sort options
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Common response format with pagination metadata
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

/**
 * Helper function to create paginated responses
 * @param items The items to paginate
 * @param total The total count of items
 * @param page The current page
 * @param pageSize The page size
 * @returns A paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    hasMore: page * pageSize < total,
    page,
    pageSize,
  };
}

/**
 * Common timestamp fields for all models
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Common soft delete fields
 */
export interface SoftDelete {
  deleted: boolean;
  deletedAt: Date | null;
}
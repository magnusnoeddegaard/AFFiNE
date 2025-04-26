import { PrismaService } from '../base/prisma';
import { Injectable } from '@nestjs/common';

/**
 * Base model with common functionality for all models
 * Provides utility methods for CRUD operations and common queries
 */
@Injectable()
export abstract class BaseModel<T> {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get the Prisma model delegate for the current model
   * Must be implemented by each model class
   */
  protected abstract get model(): any;

  /**
   * Find a record by ID
   * @param id The record ID
   * @param options Query options (include, select, etc.)
   * @returns The found record or null
   */
  async findById(id: string, options: any = {}): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...options,
    });
  }

  /**
   * Find multiple records by criteria
   * @param where The where clause
   * @param options Query options (include, select, order, pagination, etc.)
   * @returns Array of matching records
   */
  async findMany(where: any = {}, options: any = {}): Promise<T[]> {
    return this.model.findMany({
      where,
      ...options,
    });
  }

  /**
   * Create a new record
   * @param data The record data
   * @param options Query options (include, select, etc.)
   * @returns The created record
   */
  async create(data: any, options: any = {}): Promise<T> {
    return this.model.create({
      data,
      ...options,
    });
  }

  /**
   * Update a record by ID
   * @param id The record ID
   * @param data The update data
   * @param options Query options (include, select, etc.)
   * @returns The updated record
   */
  async update(id: string, data: any, options: any = {}): Promise<T> {
    return this.model.update({
      where: { id },
      data,
      ...options,
    });
  }

  /**
   * Delete a record by ID
   * @param id The record ID
   * @param options Query options (include, select, etc.)
   * @returns The deleted record
   */
  async delete(id: string, options: any = {}): Promise<T> {
    return this.model.delete({
      where: { id },
      ...options,
    });
  }

  /**
   * Soft delete a record by ID (if supported by the model)
   * @param id The record ID
   * @returns The soft-deleted record
   */
  async softDelete(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Count records by criteria
   * @param where The where clause
   * @returns The count of matching records
   */
  async count(where: any = {}): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Check if a record exists
   * @param where The where clause
   * @returns Whether a matching record exists
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  /**
   * Execute a transaction within a Prisma transaction
   * @param fn Function to execute within the transaction
   * @returns The result of the function
   */
  async transaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      return fn(tx);
    });
  }
}
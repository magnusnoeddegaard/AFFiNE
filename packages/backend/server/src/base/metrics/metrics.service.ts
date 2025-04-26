import { Injectable } from '@nestjs/common';
import { metrics, Meter, Counter, Histogram } from '@opentelemetry/api';

@Injectable()
export class MetricsService {
  private meter: Meter;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  constructor() {
    this.meter = metrics.getMeter('affine-server');
  }

  /**
   * Get or create a counter
   */
  getCounter(name: string, description?: string): Counter {
    if (!this.counters.has(name)) {
      const counter = this.meter.createCounter(name, {
        description: description || `Counter for ${name}`,
      });
      this.counters.set(name, counter);
    }
    return this.counters.get(name)!;
  }

  /**
   * Increment a counter by a given value
   */
  incrementCounter(name: string, value: number = 1, attributes?: Record<string, string>): void {
    const counter = this.getCounter(name);
    counter.add(value, attributes);
  }

  /**
   * Get or create a histogram
   */
  getHistogram(name: string, description?: string): Histogram {
    if (!this.histograms.has(name)) {
      const histogram = this.meter.createHistogram(name, {
        description: description || `Histogram for ${name}`,
      });
      this.histograms.set(name, histogram);
    }
    return this.histograms.get(name)!;
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, attributes?: Record<string, string>): void {
    const histogram = this.getHistogram(name);
    histogram.record(value, attributes);
  }

  /**
   * Record the duration of a function execution
   */
  async recordDuration<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string>,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - startTime;
      this.recordHistogram(name, duration, attributes);
    }
  }

  /**
   * Record a specific metric for GraphQL operations
   */
  recordGraphQLOperation(
    operationName: string,
    operationType: 'query' | 'mutation' | 'subscription',
    durationMs: number,
    success: boolean,
  ): void {
    this.recordHistogram('graphql.operation.duration', durationMs, {
      operationName,
      operationType,
      success: success.toString(),
    });
    
    this.incrementCounter('graphql.operation.count', 1, {
      operationName,
      operationType,
      success: success.toString(),
    });
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(
    operation: string,
    model: string,
    durationMs: number,
    success: boolean,
  ): void {
    this.recordHistogram('database.operation.duration', durationMs, {
      operation,
      model,
      success: success.toString(),
    });
    
    this.incrementCounter('database.operation.count', 1, {
      operation,
      model,
      success: success.toString(),
    });
  }
}
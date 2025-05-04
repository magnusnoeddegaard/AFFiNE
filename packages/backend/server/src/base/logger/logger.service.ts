import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logLevel: LogLevel;

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get<LogLevel>('LOG_LEVEL', 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
    const configIndex = levels.indexOf(this.logLevel);
    const logIndex = levels.indexOf(level);

    return configIndex >= logIndex;
  }

  private defaultContext?: string;

  /**
   * Set a default context for all log messages from this logger instance
   * @param context The context string to use
   */
  setContext(context: string): void {
    this.defaultContext = context;
  }

  private formatMessage(message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr =
      context || this.defaultContext
        ? `[${context || this.defaultContext}] `
        : '';
    return `${timestamp} ${contextStr}${message}`;
  }

  log(message: any, ...optionalParams: any[]): void {
    if (!this.shouldLog('info')) return;

    const context =
      typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams[optionalParams.length - 1]
        : undefined;

    console.log(this.formatMessage(message, context));
  }

  error(message: any, ...optionalParams: any[]): void {
    if (!this.shouldLog('error')) return;

    const context =
      typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams[optionalParams.length - 1]
        : undefined;

    console.error(this.formatMessage(message, context));

    // Handle trace/additional data (can be either string or object)
    if (optionalParams.length > 0) {
      const traceOrData = optionalParams[0];
      if (traceOrData) {
        if (typeof traceOrData === 'string') {
          console.error(traceOrData);
        } else if (typeof traceOrData === 'object') {
          console.error('Additional data:', traceOrData);
        }
      }
    }
  }

  warn(message: any, ...optionalParams: any[]): void {
    if (!this.shouldLog('warn')) return;

    const context =
      typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams[optionalParams.length - 1]
        : undefined;

    console.warn(this.formatMessage(message, context));
  }

  debug(message: any, ...optionalParams: any[]): void {
    if (!this.shouldLog('debug')) return;

    const context =
      typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams[optionalParams.length - 1]
        : undefined;

    console.debug(this.formatMessage(message, context));
  }

  verbose(message: any, ...optionalParams: any[]): void {
    if (!this.shouldLog('verbose')) return;

    const context =
      typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams[optionalParams.length - 1]
        : undefined;

    console.log(this.formatMessage(`[VERBOSE] ${message}`, context));
  }
}

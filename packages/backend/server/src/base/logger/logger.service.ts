import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logLevel: LogLevel;

  constructor(private configService: ConfigService) {
    this.logLevel = this.configService.get<LogLevel>('LOG_LEVEL', 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
    const configIndex = levels.indexOf(this.logLevel);
    const logIndex = levels.indexOf(level);
    
    return configIndex >= logIndex;
  }

  private formatMessage(message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}] ` : '';
    return `${timestamp} ${contextStr}${message}`;
  }

  log(message: any, context?: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage(message, context));
    }
  }

  error(message: any, trace?: string, context?: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message, context));
      if (trace) {
        console.error(trace);
      }
    }
  }

  warn(message: any, context?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message, context));
    }
  }

  debug(message: any, context?: string): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(message, context));
    }
  }

  verbose(message: any, context?: string): void {
    if (this.shouldLog('verbose')) {
      console.log(this.formatMessage(`[VERBOSE] ${message}`, context));
    }
  }
}
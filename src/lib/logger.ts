/**
 * Structured Logging System
 * Provides consistent logging with proper levels and context
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogContext {
  timestamp: string;
  userId?: string;
  sessionId: string;
  componentName?: string;
  action?: string;
  payload?: Record<string, any>;
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface LogEntry extends LogContext {
  level: LogLevel;
  message: string;
}

class Logger {
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: Partial<LogContext> = {}
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      ...context
    };
  }

  private output(entry: LogEntry) {
    const { level, message, ...context } = entry;
    
    // Console output with styling
    const styles = {
      [LogLevel.DEBUG]: 'color: #6B7280',
      [LogLevel.INFO]: 'color: #3B82F6',
      [LogLevel.WARN]: 'color: #F59E0B',
      [LogLevel.ERROR]: 'color: #EF4444',
      [LogLevel.FATAL]: 'color: #DC2626; font-weight: bold'
    };

    console.log(
      `%c[${level.toUpperCase()}] ${message}`,
      styles[level],
      context
    );

    // In production, you would send to a logging service
    // this.sendToLoggingService(entry);
  }

  debug(message: string, context?: Partial<LogContext>) {
    this.output(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: Partial<LogContext>) {
    this.output(this.createLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Partial<LogContext>) {
    this.output(this.createLogEntry(LogLevel.WARN, message, context));
  }

  error(message: string, context?: Partial<LogContext>) {
    this.output(this.createLogEntry(LogLevel.ERROR, message, context));
  }

  fatal(message: string, context?: Partial<LogContext>) {
    this.output(this.createLogEntry(LogLevel.FATAL, message, context));
  }

  // Specific logging methods for common actions
  userAction(action: string, componentName: string, payload?: Record<string, any>) {
    this.info('User action performed', {
      componentName,
      action,
      payload
    });
  }

  performanceMetric(metricName: string, duration: number, componentName?: string) {
    this.info('Performance metric', {
      componentName,
      action: 'performance_metric',
      payload: { metricName, duration }
    });
  }

  apiCall(endpoint: string, method: string, duration?: number, status?: number) {
    this.info('API call completed', {
      action: 'api_call',
      payload: { endpoint, method, duration, status }
    });
  }
}

export const logger = new Logger();

// Error boundary logger
export const logError = (error: Error, componentName?: string, context?: Record<string, any>) => {
  logger.error('Unhandled error occurred', {
    componentName,
    errorDetails: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    },
    payload: context
  });
};
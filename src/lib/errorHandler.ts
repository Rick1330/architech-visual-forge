/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */

import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  componentName?: string;
  timestamp: string;
  userFriendlyMessage?: string;
}

class ErrorHandler {
  private errorQueue: AppError[] = [];
  private maxQueueSize = 100;

  createError(
    type: ErrorType,
    message: string,
    options: {
      code?: string;
      details?: Record<string, unknown>;
      componentName?: string;
      userFriendlyMessage?: string;
    } = {}
  ): AppError {
    return {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...options
    };
  }

  handleError(error: AppError | Error, componentName?: string) {
    let appError: AppError;

    if (error instanceof Error) {
      appError = this.createError(
        ErrorType.UNKNOWN,
        error.message,
        {
          componentName,
          details: { stack: error.stack },
          userFriendlyMessage: 'Something went wrong. Please try again.'
        }
      );
    } else {
      appError = error;
    }

    // Log the error
    logger.error('Error handled', {
      componentName: appError.componentName,
      errorDetails: {
        message: appError.message,
        code: appError.code
      },
      payload: appError.details
    });

    // Add to error queue
    this.addToQueue(appError);

    // Show user-friendly toast
    this.showErrorToast(appError);

    // In production, you might want to report to an error tracking service
    // this.reportToErrorService(appError);

    return appError;
  }

  private addToQueue(error: AppError) {
    this.errorQueue.push(error);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private showErrorToast(error: AppError) {
    const message = error.userFriendlyMessage || this.getDefaultUserMessage(error.type);
    
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive'
    });
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages = {
      [ErrorType.VALIDATION]: 'Please check your input and try again.',
      [ErrorType.NETWORK]: 'Network error. Please check your connection.',
      [ErrorType.AUTHENTICATION]: 'Please log in to continue.',
      [ErrorType.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorType.SERVER]: 'Server error. Please try again later.',
      [ErrorType.CLIENT]: 'Something went wrong. Please try again.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred.'
    };

    return messages[type];
  }

  // Validation helpers
  validateInput(value: unknown, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validator(value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Network error helpers
  handleNetworkError(error: Error & { response?: { status: number; data: unknown }; request?: unknown }, endpoint?: string): AppError {
    if (error.response) {
      // Server responded with error status
      return this.createError(
        ErrorType.SERVER,
        `Server error: ${error.response.status}`,
        {
          code: error.response.status.toString(),
          details: { endpoint, response: error.response.data },
          userFriendlyMessage: 'Server error. Please try again later.'
        }
      );
    } else if (error.request) {
      // Network error
      return this.createError(
        ErrorType.NETWORK,
        'Network request failed',
        {
          details: { endpoint },
          userFriendlyMessage: 'Network error. Please check your connection.'
        }
      );
    } else {
      // Other error
      return this.createError(
        ErrorType.CLIENT,
        error.message,
        {
          details: { endpoint },
          userFriendlyMessage: 'Something went wrong. Please try again.'
        }
      );
    }
  }

  getRecentErrors(limit = 10): AppError[] {
    return this.errorQueue.slice(-limit);
  }

  clearErrorQueue() {
    this.errorQueue = [];
  }
}

export interface ValidationRule {
  validator: (value: unknown) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const errorHandler = new ErrorHandler();

// React Error Boundary Helper
import React from 'react';

export const withErrorBoundary = (Component: React.ComponentType<Record<string, unknown>>) => {
  return class ErrorBoundary extends React.Component<Record<string, unknown>, { hasError: boolean }> {
    constructor(props: Record<string, unknown>) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorHandler.handleError(error, Component.name);
    }

    render() {
      if (this.state.hasError) {
        return React.createElement('div', {
          className: 'p-4 border border-destructive/20 rounded-lg bg-destructive/5'
        }, [
          React.createElement('h3', {
            key: 'title',
            className: 'font-medium text-destructive mb-2'
          }, 'Something went wrong'),
          React.createElement('p', {
            key: 'message',
            className: 'text-sm text-muted-foreground'
          }, 'This component encountered an error. Please refresh the page.')
        ]);
      }

      return React.createElement(Component, this.props);
    }
  };
};

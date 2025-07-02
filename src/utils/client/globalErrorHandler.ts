/**
 * Global error handler to catch and handle removeChild errors
 * This prevents white screens of death caused by DOM manipulation errors
 */
import React from 'react';

interface ErrorWithCode {
  code?: string;
  message: string;
  name?: string;
  stack?: string;
}

/**
 * Checks if an error is a removeChild error
 */
const isRemoveChildError = (error: ErrorWithCode): boolean => {
  return (
    error.name === 'NotFoundError' ||
    error.message.includes('removeChild') ||
    error.message.includes('The node to be removed is not a child of this node') ||
    error.code === 'UND_ERR_HEADERS_TIMEOUT'
  );
};

/**
 * Handles removeChild errors gracefully
 */
const handleRemoveChildError = (error: ErrorWithCode): void => {
  console.warn('Caught removeChild error, attempting to recover:', error);

  // Try to recover by forcing a re-render
  try {
    // Dispatch a custom event that components can listen to for recovery
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('removeChildError', { detail: error }));
    }
  } catch (recoveryError) {
    console.error('Failed to recover from removeChild error:', recoveryError);
  }
};

/**
 * Sets up global error handlers
 */
export const setupGlobalErrorHandlers = (): void => {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason as ErrorWithCode;

    if (isRemoveChildError(error)) {
      event.preventDefault();
      handleRemoveChildError(error);
    }
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    const error = event.error as ErrorWithCode;

    if (isRemoveChildError(error)) {
      event.preventDefault();
      handleRemoveChildError(error);
    }
  });

  // Override console.error to catch removeChild errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args.join(' ');

    if (errorMessage.includes('removeChild') || errorMessage.includes('NotFoundError')) {
      console.warn('Intercepted removeChild error in console.error:', errorMessage);
      // Don't prevent the original console.error from running
    }

    originalConsoleError.apply(console, args);
  };
};

/**
 * Creates a safe wrapper for DOM operations that might cause removeChild errors
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => R,
  fallback?: () => R,
): ((...args: T) => R | undefined) => {
  return (...args: T): R | undefined => {
    try {
      return fn(...args);
    } catch (error) {
      const errorWithCode = error as ErrorWithCode;

      if (isRemoveChildError(errorWithCode)) {
        console.warn('Caught removeChild error in wrapped function:', errorWithCode);
        handleRemoveChildError(errorWithCode);

        if (fallback) {
          return fallback();
        }

        return undefined;
      }

      // Re-throw non-removeChild errors
      throw error;
    }
  };
};

/**
 * Safe wrapper for React component rendering
 */
export const safeRender = <P extends object>(
  Component: React.ComponentType<P>,
  props: P,
): React.ReactElement | null => {
  try {
    return React.createElement(Component, props);
  } catch (error) {
    const errorWithCode = error as ErrorWithCode;

    if (isRemoveChildError(errorWithCode)) {
      console.warn('Caught removeChild error in component render:', errorWithCode);
      handleRemoveChildError(errorWithCode);
      return null;
    }

    throw error;
  }
};

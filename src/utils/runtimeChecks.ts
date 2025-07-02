/**
 * Runtime environment checks for DataSync
 */

/**
 * Check if the current environment is a browser
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if the current environment is a server
 */
export const isServer = typeof window === 'undefined';

/**
 * Assert that the current environment is a browser
 * @throws Error if called in a server environment
 */
export const assertBrowser = () => {
  if (isServer) {
    throw new Error('This function can only be called in a browser environment.');
  }
};

/**
 * Assert that the current environment is a server
 * @throws Error if called in a browser environment
 */
export const assertServer = () => {
  if (isBrowser) {
    throw new Error('This function can only be called in a server environment.');
  }
};

/**
 * Safely execute a function only in the browser
 * @param fn Function to execute
 * @param fallback Fallback value if not in browser
 */
export const safeBrowserExecute = <T>(fn: () => T, fallback?: T): T | undefined => {
  if (isBrowser) {
    try {
      return fn();
    } catch (error) {
      console.error('Browser execution failed:', error);
      return fallback;
    }
  }
  return fallback;
};

/**
 * Safely execute an async function only in the browser
 * @param fn Async function to execute
 * @param fallback Fallback value if not in browser
 */
export const safeBrowserExecuteAsync = async <T>(
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> => {
  if (isBrowser) {
    try {
      return await fn();
    } catch (error) {
      console.error('Browser async execution failed:', error);
      return fallback;
    }
  }
  return fallback;
};

/**
 * DataSync-specific runtime checks
 */
export const DataSyncChecks = {
  
  /**
   * Assert that DataSync can be used in the current environment
   */
assertAvailable: () => {
    if (!isBrowser) {
      throw new Error('DataSync can only be used in the browser environment.');
    }
  },

  
  /**
   * Check if DataSync is available in the current environment
   */
isAvailable: () => isBrowser,

  /**
   * Safely execute a DataSync operation
   */
  safeExecute: <T>(fn: () => T, fallback?: T): T | undefined => {
    return safeBrowserExecute(fn, fallback);
  },

  /**
   * Safely execute an async DataSync operation
   */
  safeExecuteAsync: async <T>(
    fn: () => Promise<T>,
    fallback?: T,
  ): Promise<T | undefined> => {
    return safeBrowserExecuteAsync(fn, fallback);
  },
}; 
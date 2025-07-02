// CLIENT-ONLY: DataSync wrapper that ensures browser-only execution
// This file should only be imported in client components or with dynamic imports

import { StartDataSyncParams } from '@/types/sync';
import { DataSyncChecks } from './runtimeChecks';

// Define proper types for DataSync instance
interface DataSyncInstance {
  disconnect: () => Promise<void>;
  getYMap: (tableKey: string) => unknown;
  startDataSync: (params: StartDataSyncParams) => Promise<void>;
  transact: (callback: () => void | Promise<void>) => void | Promise<void>;
}

// Lazy-loaded DataSync instance
let dataSyncInstance: DataSyncInstance | null = null;

/**
 * Get the DataSync instance, ensuring it only exists in the browser
 */
const getDataSync = async (): Promise<DataSyncInstance> => {
  DataSyncChecks.assertAvailable();

  if (!dataSyncInstance) {
    try {
      // Dynamic import to ensure this only loads in the browser
      const { getDataSync: getDataSyncFactory } = await import('@/database/_deprecated/core');
      dataSyncInstance = getDataSyncFactory() as unknown as DataSyncInstance;
    } catch (error) {
      console.error('Failed to load DataSync:', error);
      throw new Error('Failed to initialize DataSync in browser environment.');
    }
  }

  return dataSyncInstance;
};

/**
 * Client-only DataSync wrapper with runtime checks
 */
export const ClientDataSync = {
  
  /**
   * Disconnect data synchronization
   */
async disconnect(): Promise<void> {
    return DataSyncChecks.safeExecuteAsync(async () => {
      const dataSync = await getDataSync();
      await dataSync.disconnect();
    });
  },

  
  
/**
   * Get YMap for a table
   */
async getYMap(tableKey: string): Promise<unknown> {
    return DataSyncChecks.safeExecuteAsync(async () => {
      const dataSync = await getDataSync();
      return dataSync.getYMap(tableKey);
    }, null);
  },

  
  
/**
   * Check if DataSync is available in the current environment
   */
isAvailable(): boolean {
    return DataSyncChecks.isAvailable();
  },

  
  
/**
   * Start data synchronization
   */
async startDataSync(params: StartDataSyncParams): Promise<void> {
    return DataSyncChecks.safeExecuteAsync(async () => {
      const dataSync = await getDataSync();
      await dataSync.startDataSync(params);
    });
  },

  
  /**
   * Execute a transaction
   */
async transact(callback: () => void | Promise<void>): Promise<void> {
    return DataSyncChecks.safeExecuteAsync(async () => {
      const dataSync = await getDataSync();
      const result = dataSync.transact(callback);
      if (result instanceof Promise) {
        await result;
      }
    });
  },
};

// Export a singleton instance for backward compatibility
export const clientDataSync = {
  disconnect: ClientDataSync.disconnect,
  getYMap: ClientDataSync.getYMap,
  isAvailable: ClientDataSync.isAvailable,
  startDataSync: ClientDataSync.startDataSync,
  transact: ClientDataSync.transact,
}; 
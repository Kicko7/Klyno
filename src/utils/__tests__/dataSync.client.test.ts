import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ClientDataSync, clientDataSync } from '../dataSync.client';

// Mock the database module
vi.mock('@/database/_deprecated/core', () => ({
  getDataSync: vi.fn(),
}));

describe('ClientDataSync', () => {
  const mockDataSync = {
    startDataSync: vi.fn(),
    disconnect: vi.fn(),
    getYMap: vi.fn(),
    transact: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the dynamic import
    const { getDataSync } = require('@/database/_deprecated/core');
    getDataSync.mockReturnValue(mockDataSync);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Browser Environment', () => {
    beforeEach(() => {
      // Mock browser environment
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });
    });

    afterEach(() => {
      delete (global as any).window;
    });

    it('should start data sync in browser environment', async () => {
      const params = { channel: { name: 'test' }, user: { id: '123' } } as any;
      
      await ClientDataSync.startDataSync(params);
      
      expect(mockDataSync.startDataSync).toHaveBeenCalledWith(params);
    });

    it('should disconnect in browser environment', async () => {
      await ClientDataSync.disconnect();
      
      expect(mockDataSync.disconnect).toHaveBeenCalled();
    });

    it('should get YMap in browser environment', async () => {
      const mockYMap = { get: vi.fn(), set: vi.fn() };
      mockDataSync.getYMap.mockReturnValue(mockYMap);
      
      const result = await ClientDataSync.getYMap('testTable');
      
      expect(mockDataSync.getYMap).toHaveBeenCalledWith('testTable');
      expect(result).toBe(mockYMap);
    });

    it('should execute transaction in browser environment', async () => {
      const callback = vi.fn();
      
      await ClientDataSync.transact(callback);
      
      expect(mockDataSync.transact).toHaveBeenCalledWith(callback);
    });

    it('should return true for isAvailable in browser environment', () => {
      expect(ClientDataSync.isAvailable()).toBe(true);
    });

    it('should handle errors gracefully in browser environment', async () => {
      const error = new Error('Test error');
      mockDataSync.startDataSync.mockRejectedValue(error);
      
      const params = { channel: { name: 'test' }, user: { id: '123' } } as any;
      
      await ClientDataSync.startDataSync(params);
      
      // Should not throw, but log the error
      expect(mockDataSync.startDataSync).toHaveBeenCalled();
    });
  });

  describe('Server Environment', () => {
    beforeEach(() => {
      // Mock server environment
      delete (global as any).window;
    });

    it('should not start data sync in server environment', async () => {
      const params = { channel: { name: 'test' }, user: { id: '123' } } as any;
      
      await ClientDataSync.startDataSync(params);
      
      expect(mockDataSync.startDataSync).not.toHaveBeenCalled();
    });

    it('should not disconnect in server environment', async () => {
      await ClientDataSync.disconnect();
      
      expect(mockDataSync.disconnect).not.toHaveBeenCalled();
    });

    it('should return null for getYMap in server environment', async () => {
      const result = await ClientDataSync.getYMap('testTable');
      
      expect(mockDataSync.getYMap).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should not execute transaction in server environment', async () => {
      const callback = vi.fn();
      
      await ClientDataSync.transact(callback);
      
      expect(mockDataSync.transact).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false for isAvailable in server environment', () => {
      expect(ClientDataSync.isAvailable()).toBe(false);
    });
  });

  describe('clientDataSync singleton', () => {
    beforeEach(() => {
      // Mock browser environment
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });
    });

    afterEach(() => {
      delete (global as any).window;
    });

    it('should provide the same interface as ClientDataSync class', async () => {
      const params = { channel: { name: 'test' }, user: { id: '123' } } as any;
      
      await clientDataSync.startDataSync(params);
      expect(mockDataSync.startDataSync).toHaveBeenCalledWith(params);
      
      await clientDataSync.disconnect();
      expect(mockDataSync.disconnect).toHaveBeenCalled();
      
      expect(clientDataSync.isAvailable()).toBe(true);
    });
  });
}); 
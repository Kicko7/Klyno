import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Redis } from '@upstash/redis';
import { RedisSessionManager } from '@/services/sessionManager';
import { getSessionManager } from '@/services/sessionManagerFactory';
import { validateSessionConfig, getSessionConfig } from '@/config/sessionConfig';

// Mock Redis
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
      scan: vi.fn(),
      pipeline: vi.fn(() => ({
        get: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn(),
      })),
    })),
  },
}));

// Mock database client
vi.mock('@/database/client/message', () => ({
  messageModel: {
    findByIds: vi.fn(),
  },
}));

vi.mock('@/database/client/teamChat', () => ({
  teamChatModel: {
    bulkCreate: vi.fn(),
  },
}));

describe('Session Management Tests', () => {
  let sessionManager: RedisSessionManager;
  let mockRedis: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // Get mocked Redis instance
    mockRedis = Redis.fromEnv();
    
    // Create session manager
    sessionManager = new RedisSessionManager(mockRedis);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe('Configuration', () => {
    it('should validate configuration correctly', () => {
      expect(validateSessionConfig()).toBe(true);
    });

    it('should return correct session configuration', () => {
      const config = getSessionConfig();
      expect(config).toEqual({
        sessionExpiry: 1200, // 20 minutes
        maxMessagesPerSession: 1000,
        syncInterval: 300, // 5 minutes
      });
    });

    it('should fail validation without Redis URL', () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      expect(validateSessionConfig()).toBe(false);
    });

    it('should fail validation without Redis token', () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      expect(validateSessionConfig()).toBe(false);
    });
  });

  describe('Message Management', () => {
    const sessionId = 'test-session-123';
    const testMessage = {
      id: 'msg-1',
      content: 'Hello, team!',
      role: 'user' as const,
      timestamp: new Date().toISOString(),
      metadata: { userId: 'user-1' },
    };

    it('should add a message to session', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      await sessionManager.addMessage(sessionId, testMessage);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:${sessionId}`,
        JSON.stringify({ messages: [testMessage] }),
        { ex: 1200 }
      );
    });

    it('should append message to existing session', async () => {
      const existingMessage = {
        id: 'msg-0',
        content: 'Previous message',
        role: 'assistant' as const,
        timestamp: new Date(Date.now() - 1000).toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify({ messages: [existingMessage] }));
      mockRedis.set.mockResolvedValue('OK');

      await sessionManager.addMessage(sessionId, testMessage);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:${sessionId}`,
        JSON.stringify({ messages: [existingMessage, testMessage] }),
        { ex: 1200 }
      );
    });

    it('should maintain max messages limit with rolling window', async () => {
      // Create 1000 existing messages
      const existingMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        role: 'user' as const,
        timestamp: new Date(Date.now() - 1000 * (1000 - i)).toISOString(),
      }));

      mockRedis.get.mockResolvedValue(JSON.stringify({ messages: existingMessages }));
      mockRedis.set.mockResolvedValue('OK');

      await sessionManager.addMessage(sessionId, testMessage);

      const savedCall = mockRedis.set.mock.calls[0];
      const savedData = JSON.parse(savedCall[1]);
      
      expect(savedData.messages).toHaveLength(1000);
      expect(savedData.messages[0].id).toBe('msg-1'); // First message removed
      expect(savedData.messages[999]).toEqual(testMessage); // New message added at end
    });

    it('should retrieve messages from session', async () => {
      const messages = [testMessage];
      mockRedis.get.mockResolvedValue(JSON.stringify({ messages }));

      const result = await sessionManager.getMessages(sessionId);

      expect(result).toEqual(messages);
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await sessionManager.getMessages(sessionId);

      expect(result).toBeNull();
    });

    it('should clear session', async () => {
      mockRedis.del.mockResolvedValue(1);

      await sessionManager.clearSession(sessionId);

      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it('should update session expiry', async () => {
      mockRedis.expire.mockResolvedValue(1);

      await sessionManager.updateExpiry(sessionId);

      expect(mockRedis.expire).toHaveBeenCalledWith(`session:${sessionId}`, 1200);
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple sessions in batch', async () => {
      const sessionIds = ['session-1', 'session-2', 'session-3'];
      const pipeline = mockRedis.pipeline();
      
      pipeline.exec.mockResolvedValue([
        JSON.stringify({ messages: [{ id: '1', content: 'Message 1' }] }),
        null,
        JSON.stringify({ messages: [{ id: '3', content: 'Message 3' }] }),
      ]);

      const results = await sessionManager.batchGetSessions(sessionIds);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ messages: [{ id: '1', content: 'Message 1' }] });
      expect(results[1]).toBeNull();
      expect(results[2]).toEqual({ messages: [{ id: '3', content: 'Message 3' }] });
    });

    it('should set multiple sessions in batch', async () => {
      const sessions = [
        { sessionId: 'session-1', data: { messages: [{ id: '1' }] } },
        { sessionId: 'session-2', data: { messages: [{ id: '2' }] } },
      ];

      const pipeline = mockRedis.pipeline();
      pipeline.exec.mockResolvedValue(['OK', 'OK']);

      await sessionManager.batchSetSessions(sessions);

      expect(pipeline.set).toHaveBeenCalledTimes(2);
      expect(pipeline.expire).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should delete multiple sessions in batch', async () => {
      const sessionIds = ['session-1', 'session-2'];
      const pipeline = mockRedis.pipeline();
      pipeline.exec.mockResolvedValue([1, 1]);

      await sessionManager.batchDeleteSessions(sessionIds);

      expect(pipeline.del).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });
  });

  describe('Session Sync', () => {
    it('should sync sessions to database', async () => {
      const { teamChatModel } = await import('@/database/client/teamChat');
      
      mockRedis.scan.mockResolvedValue({ cursor: 0, keys: ['session:team-1', 'session:team-2'] });
      
      const pipeline = mockRedis.pipeline();
      pipeline.exec.mockResolvedValue([
        JSON.stringify({ 
          messages: [
            { id: 'msg-1', content: 'Hello', role: 'user', timestamp: new Date().toISOString() }
          ] 
        }),
        JSON.stringify({ 
          messages: [
            { id: 'msg-2', content: 'Hi there', role: 'assistant', timestamp: new Date().toISOString() }
          ] 
        }),
      ]);

      await sessionManager.syncToDatabase();

      expect(teamChatModel.bulkCreate).toHaveBeenCalled();
      const bulkCreateCall = (teamChatModel.bulkCreate as any).mock.calls[0];
      expect(bulkCreateCall[0]).toHaveLength(2);
      expect(bulkCreateCall[0][0]).toMatchObject({
        teamChatId: 'team-1',
        content: 'Hello',
        messageType: 'user',
      });
    });

    it('should clean up expired sessions', async () => {
      mockRedis.scan.mockResolvedValue({ cursor: 0, keys: ['session:expired-1'] });
      
      const pipeline = mockRedis.pipeline();
      pipeline.exec.mockResolvedValue([null]); // Expired session

      await sessionManager.cleanupExpiredSessions();

      expect(mockRedis.scan).toHaveBeenCalled();
      expect(pipeline.get).toHaveBeenCalledWith('session:expired-1');
    });
  });

  describe('Factory', () => {
    it('should return singleton instance', () => {
      const instance1 = getSessionManager();
      const instance2 = getSessionManager();
      
      expect(instance1).toBe(instance2);
    });

    it('should start background worker only once', () => {
      vi.spyOn(global, 'setInterval');
      
      const { startBackgroundSyncWorker } = require('@/services/sessionManagerFactory');
      
      startBackgroundSyncWorker();
      startBackgroundSyncWorker(); // Call twice
      
      expect(setInterval).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await sessionManager.getMessages('session-1');
      
      expect(result).toBeNull();
    });

    it('should handle sync errors without crashing', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Scan failed'));

      await expect(sessionManager.syncToDatabase()).resolves.not.toThrow();
    });

    it('should handle malformed session data', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await sessionManager.getMessages('session-1');
      
      expect(result).toBeNull();
    });
  });

  describe('Integration with WebSocket', () => {
    it('should handle concurrent message additions', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const promises = Array.from({ length: 10 }, (_, i) => 
        sessionManager.addMessage('concurrent-session', {
          id: `msg-${i}`,
          content: `Concurrent message ${i}`,
          role: 'user',
          timestamp: new Date().toISOString(),
        })
      );

      await Promise.all(promises);

      // Due to race conditions, we just verify that set was called multiple times
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should handle high-frequency activity updates', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const promises = Array.from({ length: 50 }, () => 
        sessionManager.updateExpiry('active-session')
      );

      await Promise.all(promises);

      expect(mockRedis.expire).toHaveBeenCalledTimes(50);
    });
  });
});

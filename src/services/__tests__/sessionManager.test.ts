import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ChatSession, MessageData, SessionManager } from '../sessionManager';
import { OptimizedRedisService } from '../optimized-redis-service';
import { SyncService } from '../syncService';

// Mock dependencies
vi.mock('../optimized-redis-service');
vi.mock('../syncService');
vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    teamChat: {
      getMessages: {
        query: vi.fn(),
      },
    },
  },
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockRedisService: any;
  let mockSyncService: any;

  beforeEach(() => {
    // Create mock instances
    mockRedisService = {
      setSession: vi.fn(),
      getSession: vi.fn(),
      appendMessage: vi.fn(),
      getAllActiveSessions: vi.fn(),
      deleteSession: vi.fn(),
      refreshExpiry: vi.fn(),
    };

    mockSyncService = {
      syncSingleMessage: vi.fn(),
      batchSyncMessages: vi.fn(),
      syncSessionToDb: vi.fn(),
    };

    sessionManager = new SessionManager(mockRedisService, mockSyncService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session with correct structure', async () => {
      const teamChatId = 'team_123';
      const participants = ['user_1', 'user_2'];

      const session = await sessionManager.createSession(teamChatId, participants);

      expect(session).toMatchObject({
        teamChatId,
        participants,
        messages: [],
        status: 'active',
      });
      expect(session.sessionId).toContain(`session_${teamChatId}_`);
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivityAt).toBeDefined();
      expect(session.expiresAt).toBeGreaterThan(Date.now());

      expect(mockRedisService.setSession).toHaveBeenCalledWith(session);
    });

    it('should create session with empty participants if not provided', async () => {
      const teamChatId = 'team_456';

      const session = await sessionManager.createSession(teamChatId);

      expect(session.participants).toEqual([]);
    });
  });

  describe('getSession', () => {
    it('should return active session from Redis', async () => {
      const mockSession: ChatSession = {
        sessionId: 'session_123',
        teamChatId: 'team_123',
        participants: ['user_1'],
        messages: [],
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + 1200000,
        status: 'active',
      };

      mockRedisService.getSession.mockResolvedValue(mockSession);

      const session = await sessionManager.getSession('team_123');

      expect(session).toEqual(mockSession);
      expect(mockRedisService.getSession).toHaveBeenCalledWith('team_123');
    });

    it('should return null for non-active session', async () => {
      const mockSession: ChatSession = {
        sessionId: 'session_123',
        teamChatId: 'team_123',
        participants: ['user_1'],
        messages: [],
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + 1200000,
        status: 'syncing',
      };

      mockRedisService.getSession.mockResolvedValue(mockSession);

      const session = await sessionManager.getSession('team_123');

      expect(session).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.getSession.mockRejectedValue(new Error('Redis error'));

      const session = await sessionManager.getSession('team_123');

      expect(session).toBeNull();
    });
  });

  describe('appendMessage', () => {
    it('should add message to existing session', async () => {
      const teamChatId = 'team_123';
      const existingSession: ChatSession = {
        sessionId: 'session_123',
        teamChatId,
        participants: ['user_1'],
        messages: [],
        createdAt: Date.now(),
        lastActivityAt: Date.now() - 60000,
        expiresAt: Date.now() + 1140000,
        status: 'active',
      };

      const newMessage: MessageData = {
        id: 'msg_1',
        content: 'Hello AI',
        userId: 'user_1',
        timestamp: Date.now(),
        type: 'user',
        metadata: {},
      };

      mockRedisService.getSession.mockResolvedValue(existingSession);

      await sessionManager.appendMessage(teamChatId, newMessage);

      // Verify session was updated
      expect(mockRedisService.setSession).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [expect.objectContaining({ ...newMessage, syncedToDb: false })],
          lastActivityAt: expect.any(Number),
          expiresAt: expect.any(Number),
        })
      );

      expect(mockRedisService.appendMessage).toHaveBeenCalledWith(teamChatId, newMessage);
    });

    it('should create new session if none exists', async () => {
      const teamChatId = 'team_456';
      const newMessage: MessageData = {
        id: 'msg_1',
        content: 'Hello AI',
        userId: 'user_2',
        timestamp: Date.now(),
        type: 'user',
        metadata: {},
      };

      mockRedisService.getSession.mockResolvedValue(null);

      await sessionManager.appendMessage(teamChatId, newMessage);

      expect(mockRedisService.setSession).toHaveBeenCalledTimes(2); // Once for create, once for update
    });

    it('should handle message limit by removing oldest message', async () => {
      const teamChatId = 'team_123';
      const messages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg_${i}`,
        content: `Message ${i}`,
        userId: 'user_1',
        timestamp: Date.now() - (1000 - i) * 1000,
        type: 'user' as const,
        metadata: {},
        syncedToDb: false,
      }));

      const existingSession: ChatSession = {
        sessionId: 'session_123',
        teamChatId,
        participants: ['user_1'],
        messages,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + 1200000,
        status: 'active',
      };

      const newMessage: MessageData = {
        id: 'msg_1001',
        content: 'New message',
        userId: 'user_1',
        timestamp: Date.now(),
        type: 'user',
        metadata: {},
      };

      mockRedisService.getSession.mockResolvedValue(existingSession);

      await sessionManager.appendMessage(teamChatId, newMessage);

      // Verify oldest message was synced
      expect(mockSyncService.syncSingleMessage).toHaveBeenCalledWith(
        teamChatId,
        messages[0]
      );
    });
  });

  describe('getExpiringSessions', () => {
    it('should return sessions expiring within next minute', async () => {
      const now = Date.now();
      const sessions: ChatSession[] = [
        {
          sessionId: 'session_1',
          teamChatId: 'team_1',
          participants: ['user_1'],
          messages: [{ id: '1', content: 'Test', userId: 'user_1', timestamp: now, type: 'user', syncedToDb: false }],
          createdAt: now - 1000000,
          lastActivityAt: now - 1000000,
          expiresAt: now + 30000, // Expires in 30 seconds
          status: 'active',
        },
        {
          sessionId: 'session_2',
          teamChatId: 'team_2',
          participants: ['user_2'],
          messages: [],
          createdAt: now - 500000,
          lastActivityAt: now - 500000,
          expiresAt: now + 120000, // Expires in 2 minutes
          status: 'active',
        },
      ];

      mockRedisService.getAllActiveSessions.mockResolvedValue(sessions);

      const expiringSessions = await sessionManager.getExpiringSessions();

      expect(expiringSessions).toHaveLength(1);
      expect(expiringSessions[0].sessionId).toBe('session_1');
    });

    it('should not return sessions with all messages synced', async () => {
      const now = Date.now();
      const session: ChatSession = {
        sessionId: 'session_1',
        teamChatId: 'team_1',
        participants: ['user_1'],
        messages: [{ id: '1', content: 'Test', userId: 'user_1', timestamp: now, type: 'user', syncedToDb: true }],
        createdAt: now - 1000000,
        lastActivityAt: now - 1000000,
        expiresAt: now + 30000,
        status: 'active',
      };

      mockRedisService.getAllActiveSessions.mockResolvedValue([session]);

      const expiringSessions = await sessionManager.getExpiringSessions();

      expect(expiringSessions).toHaveLength(0);
    });
  });

  describe('performBackgroundSync', () => {
    it('should sync half of messages when at threshold', async () => {
      const teamChatId = 'team_123';
      const messages = Array.from({ length: 800 }, (_, i) => ({
        id: `msg_${i}`,
        content: `Message ${i}`,
        userId: 'user_1',
        timestamp: Date.now() - (800 - i) * 1000,
        type: 'user' as const,
        metadata: {},
        syncedToDb: false,
      }));

      const session: ChatSession = {
        sessionId: 'session_123',
        teamChatId,
        participants: ['user_1'],
        messages,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + 1200000,
        status: 'active',
      };

      mockRedisService.getSession.mockResolvedValue(session);

      await sessionManager.performBackgroundSync(teamChatId);

      // Should sync first 400 messages
      expect(mockSyncService.batchSyncMessages).toHaveBeenCalledWith(
        teamChatId,
        expect.arrayContaining([expect.objectContaining({ id: 'msg_0' })])
      );
      
      const syncedMessages = mockSyncService.batchSyncMessages.mock.calls[0][1];
      expect(syncedMessages).toHaveLength(400);
    });
  });

  describe('expireSession', () => {
    it('should sync unsynced messages before expiring', async () => {
      const teamChatId = 'team_123';
      const unsyncedMessages = [
        { id: 'msg_1', content: 'Unsynced 1', userId: 'user_1', timestamp: Date.now(), type: 'user' as const, syncedToDb: false },
        { id: 'msg_2', content: 'Unsynced 2', userId: 'user_1', timestamp: Date.now(), type: 'user' as const, syncedToDb: false },
      ];

      const session: ChatSession = {
        sessionId: 'session_123',
        teamChatId,
        participants: ['user_1'],
        messages: unsyncedMessages,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        expiresAt: Date.now(),
        status: 'active',
      };

      mockRedisService.getSession.mockResolvedValue(session);

      await sessionManager.expireSession(teamChatId);

      expect(mockSyncService.syncSessionToDb).toHaveBeenCalledWith(session);
      expect(mockRedisService.deleteSession).toHaveBeenCalledWith(teamChatId);
    });
  });
});

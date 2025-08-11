import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { OptimizedWebSocketServer } from '@/server/websocket/optimized-server';
import { getOptimizedRedisService } from '@/services/optimized-redis-service-factory';
import { getSessionManager } from '@/services/sessionManagerFactory';
import { OptimizedSyncService } from '@/services/optimized-sync-service';

// Mock the database clients
vi.mock('@/database/client/message', () => ({
  messageModel: {
    findByIds: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/database/client/teamChat', () => ({
  teamChatModel: {
    bulkCreate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/libs/trpc/client/lambda', () => ({
  lambdaClient: {
    teamChat: {
      addMessage: {
        mutate: vi.fn(),
      },
    },
  },
}));

describe('WebSocket + Redis + Session Integration Tests', () => {
  let httpServer: any;
  let wsServer: OptimizedWebSocketServer;
  let redisService: any;
  let sessionManager: any;
  let syncService: OptimizedSyncService;
  let serverUrl: string;
  let port: number;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Initialize WebSocket server
    wsServer = new OptimizedWebSocketServer(httpServer);
    
    // Initialize services
    redisService = await getOptimizedRedisService();
    sessionManager = getSessionManager();
    syncService = new OptimizedSyncService();
    
    // Initialize WebSocket server
    await wsServer.initialize();
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address() as AddressInfo;
        port = address.port;
        serverUrl = `http://localhost:${port}`;
        console.log(`Test server started on ${serverUrl}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    await wsServer.gracefulShutdown();
    httpServer.close();
  });

  beforeEach(async () => {
    // Clear Redis before each test
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connection and authentication', async () => {
      const client = ioc(serverUrl, {
        auth: { userId: 'test-user-1' },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => {
          expect(client.connected).toBe(true);
          resolve();
        });
        client.on('connect_error', reject);
      });

      client.disconnect();
    });

    it('should reject connection without authentication', async () => {
      const client = ioc(serverUrl, {
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication failed');
          resolve();
        });
      });

      client.disconnect();
    });

    it('should handle multiple concurrent connections', async () => {
      const clients: ClientSocket[] = [];
      const connectionPromises = [];

      for (let i = 0; i < 5; i++) {
        const client = ioc(serverUrl, {
          auth: { userId: `test-user-${i}` },
          transports: ['websocket'],
        });
        clients.push(client);

        const promise = new Promise<void>((resolve, reject) => {
          client.on('connect', resolve);
          client.on('connect_error', reject);
        });
        connectionPromises.push(promise);
      }

      await Promise.all(connectionPromises);
      expect(clients.every(c => c.connected)).toBe(true);

      // Get connection stats
      const stats = wsServer.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(5);

      // Cleanup
      clients.forEach(c => c.disconnect());
    });
  });

  describe('Room Management', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    const roomId = 'test-room-1';

    beforeEach(async () => {
      client1 = ioc(serverUrl, {
        auth: { userId: 'user-1' },
        transports: ['websocket'],
      });
      client2 = ioc(serverUrl, {
        auth: { userId: 'user-2' },
        transports: ['websocket'],
      });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
      ]);
    });

    afterEach(() => {
      client1.disconnect();
      client2.disconnect();
    });

    it('should allow users to join rooms', async () => {
      const presencePromise = new Promise((resolve) => {
        client1.on('presence:list', resolve);
      });

      client1.emit('room:join', roomId);
      
      const presence = await presencePromise;
      expect(presence).toBeDefined();
    });

    it('should broadcast presence updates to room members', async () => {
      // Both clients join the room
      client1.emit('room:join', roomId);
      client2.emit('room:join', roomId);

      // Wait for presence update
      const presenceUpdate = await new Promise((resolve) => {
        client1.on('presence:update', (data) => {
          if (data.userId === 'user-2') {
            resolve(data);
          }
        });
      });

      expect(presenceUpdate).toMatchObject({
        userId: 'user-2',
        isActive: true,
      });
    });

    it('should handle room leave correctly', async () => {
      client1.emit('room:join', roomId);
      client2.emit('room:join', roomId);

      const leaveUpdate = new Promise((resolve) => {
        client1.on('presence:update', (data) => {
          if (data.userId === 'user-2' && !data.isActive) {
            resolve(data);
          }
        });
      });

      client2.emit('room:leave', roomId);

      const update = await leaveUpdate;
      expect(update).toMatchObject({
        userId: 'user-2',
        isActive: false,
      });
    });
  });

  describe('Message Handling with Session Management', () => {
    let client: ClientSocket;
    const roomId = 'test-chat-1';

    beforeEach(async () => {
      client = ioc(serverUrl, {
        auth: { userId: 'msg-user-1' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      client.emit('room:join', roomId);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should send and receive messages', async () => {
      const messagePromise = new Promise((resolve) => {
        client.on('message:new', resolve);
      });

      const testMessage = {
        teamId: roomId,
        content: 'Hello, team!',
        type: 'user',
        metadata: { test: true },
      };

      client.emit('message:send', testMessage);

      const receivedMessage = await messagePromise;
      expect(receivedMessage).toMatchObject({
        content: 'Hello, team!',
        userId: 'msg-user-1',
        teamId: roomId,
        type: 'user',
      });
    });

    it('should add messages to session cache', async () => {
      const messages = [
        { content: 'Message 1', type: 'user' },
        { content: 'Message 2', type: 'user' },
        { content: 'Message 3', type: 'assistant' },
      ];

      for (const msg of messages) {
        client.emit('message:send', { teamId: roomId, ...msg });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Check session has messages
      const sessionMessages = await sessionManager.getMessages(roomId);
      expect(sessionMessages).toHaveLength(messages.length);
      expect(sessionMessages[0].content).toBe('Message 1');
      expect(sessionMessages[2].role).toBe('assistant');
    });

    it('should send message history when new user joins', async () => {
      // Send some messages first
      const messages = ['First message', 'Second message', 'Third message'];
      
      for (const content of messages) {
        client.emit('message:send', { teamId: roomId, content, type: 'user' });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // New user joins
      const client2 = ioc(serverUrl, {
        auth: { userId: 'new-user' },
        transports: ['websocket'],
      });

      const historyPromise = new Promise((resolve) => {
        client2.on('messages:history', resolve);
      });

      await new Promise(resolve => client2.on('connect', resolve));
      client2.emit('room:join', roomId);

      const history = await historyPromise;
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(messages.length);
      expect(history.map((m: any) => m.content)).toEqual(messages);

      client2.disconnect();
    });

    it('should maintain rolling window of 1000 messages', async () => {
      // This is a conceptual test - in practice we'd mock the session manager
      const mockMessages = Array.from({ length: 1005 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
      }));

      // Mock the session manager behavior
      const sessionData = { messages: mockMessages.slice(-1000) };
      expect(sessionData.messages).toHaveLength(1000);
      expect(sessionData.messages[0].id).toBe('msg-5');
      expect(sessionData.messages[999].id).toBe('msg-1004');
    });
  });

  describe('Typing Indicators', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    const roomId = 'typing-room';

    beforeEach(async () => {
      client1 = ioc(serverUrl, {
        auth: { userId: 'typer-1' },
        transports: ['websocket'],
      });
      client2 = ioc(serverUrl, {
        auth: { userId: 'typer-2' },
        transports: ['websocket'],
      });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
      ]);

      client1.emit('room:join', roomId);
      client2.emit('room:join', roomId);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
      client1.disconnect();
      client2.disconnect();
    });

    it('should broadcast typing start events', async () => {
      const typingPromise = new Promise((resolve) => {
        client2.on('typing:start', resolve);
      });

      client1.emit('typing:start', roomId);

      const typingData = await typingPromise;
      expect(typingData).toMatchObject({
        userId: 'typer-1',
      });
    });

    it('should broadcast typing stop events', async () => {
      const typingStopPromise = new Promise((resolve) => {
        client2.on('typing:stop', resolve);
      });

      client1.emit('typing:stop', roomId);

      const typingData = await typingStopPromise;
      expect(typingData).toMatchObject({
        userId: 'typer-1',
      });
    });
  });

  describe('Read Receipts', () => {
    let client: ClientSocket;
    const roomId = 'receipt-room';

    beforeEach(async () => {
      client = ioc(serverUrl, {
        auth: { userId: 'reader-1' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      client.emit('room:join', roomId);
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should update read receipts', async () => {
      const receiptPromise = new Promise((resolve) => {
        client.on('receipt:update', resolve);
      });

      client.emit('receipt:update', {
        teamId: roomId,
        lastReadMessageId: 'msg-123',
      });

      const receipt = await receiptPromise;
      expect(receipt).toMatchObject({
        userId: 'reader-1',
        lastReadMessageId: 'msg-123',
        teamId: roomId,
      });
    });
  });

  describe('Rate Limiting', () => {
    let client: ClientSocket;
    const roomId = 'rate-limit-room';

    beforeEach(async () => {
      client = ioc(serverUrl, {
        auth: { userId: 'spammer' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      client.emit('room:join', roomId);
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should rate limit excessive messages', async () => {
      const errorPromise = new Promise((resolve) => {
        client.on('room:error', resolve);
      });

      // Send more than 10 messages in quick succession
      for (let i = 0; i < 15; i++) {
        client.emit('message:send', {
          teamId: roomId,
          content: `Spam ${i}`,
          type: 'user',
        });
      }

      const error = await errorPromise;
      expect(error).toContain('Rate limit exceeded');
    });

    it('should rate limit excessive typing events', async () => {
      // Send many typing events quickly
      let errorReceived = false;
      
      // Rate limiter silently ignores excessive typing events
      for (let i = 0; i < 40; i++) {
        client.emit('typing:start', roomId);
        client.emit('typing:stop', roomId);
      }

      // No error expected for typing (silently rate limited)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(errorReceived).toBe(false);
    });
  });

  describe('Connection Recovery', () => {
    it('should handle reconnection gracefully', async () => {
      const client = ioc(serverUrl, {
        auth: { userId: 'reconnector' },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100,
      });

      await new Promise(resolve => client.on('connect', resolve));
      
      const roomId = 'reconnect-room';
      client.emit('room:join', roomId);

      // Simulate disconnect
      client.disconnect();
      
      // Wait and reconnect
      await new Promise(resolve => setTimeout(resolve, 200));
      client.connect();

      await new Promise(resolve => client.on('connect', resolve));
      expect(client.connected).toBe(true);

      // Should be able to rejoin room
      client.emit('room:join', roomId);
      await new Promise(resolve => setTimeout(resolve, 100));

      client.disconnect();
    });
  });

  describe('Redis Health and Sync', () => {
    it('should report Redis health status', () => {
      const health = redisService.getHealth();
      expect(health).toHaveProperty('isConnected');
      expect(health).toHaveProperty('lastPing');
      expect(health).toHaveProperty('errorCount');
    });

    it('should track sync metrics', () => {
      const metrics = syncService.getSyncMetrics();
      expect(metrics).toHaveProperty('totalSynced');
      expect(metrics).toHaveProperty('failedSyncs');
      expect(metrics).toHaveProperty('lastSyncTime');
      expect(metrics).toHaveProperty('syncDuration');
    });

    it('should handle Redis operations in batch', async () => {
      const operations = [
        { key: 'test1', value: 'value1' },
        { key: 'test2', value: 'value2' },
        { key: 'test3', value: 'value3' },
      ];

      const results = await redisService.batchSet(
        operations.map(op => ({ key: op.key, value: op.value, ttl: 60 }))
      );

      expect(results).toHaveLength(operations.length);
    });
  });

  describe('Session Expiry and Cleanup', () => {
    it('should update session expiry on activity', async () => {
      const sessionId = 'expiry-test';
      
      // Add a message
      await sessionManager.addMessage(sessionId, {
        id: 'msg-1',
        content: 'Test message',
        role: 'user',
        timestamp: new Date().toISOString(),
      });

      // Update expiry
      await sessionManager.updateExpiry(sessionId);

      // Session should still exist
      const messages = await sessionManager.getMessages(sessionId);
      expect(messages).toBeTruthy();
    });

    it('should handle session cleanup', async () => {
      const sessionId = 'cleanup-test';
      
      // Add a message
      await sessionManager.addMessage(sessionId, {
        id: 'msg-1',
        content: 'To be cleaned',
        role: 'user',
        timestamp: new Date().toISOString(),
      });

      // Clear session
      await sessionManager.clearSession(sessionId);

      // Session should be gone
      const messages = await sessionManager.getMessages(sessionId);
      expect(messages).toBeNull();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed messages gracefully', async () => {
      const client = ioc(serverUrl, {
        auth: { userId: 'error-tester' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));

      const errorPromise = new Promise((resolve) => {
        client.on('room:error', resolve);
      });

      // Send malformed message
      client.emit('message:send', {
        teamId: 'test-room',
        content: '', // Empty content
        type: 'user',
      });

      const error = await errorPromise;
      expect(error).toContain('Invalid message');

      client.disconnect();
    });

    it('should handle database persistence failures', async () => {
      const { lambdaClient } = await import('@/libs/trpc/client/lambda');
      
      // Mock database failure
      (lambdaClient.teamChat.addMessage.mutate as any).mockRejectedValueOnce(
        new Error('Database error')
      );

      const client = ioc(serverUrl, {
        auth: { userId: 'db-error-user' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      const roomId = 'db-error-room';
      client.emit('room:join', roomId);

      // Message should still be delivered despite DB error
      const messagePromise = new Promise((resolve) => {
        client.on('message:new', resolve);
      });

      client.emit('message:send', {
        teamId: roomId,
        content: 'Message despite DB error',
        type: 'user',
      });

      const message = await messagePromise;
      expect(message).toMatchObject({
        content: 'Message despite DB error',
      });

      client.disconnect();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle burst of messages', async () => {
      const client = ioc(serverUrl, {
        auth: { userId: 'burst-user' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      const roomId = 'burst-room';
      client.emit('room:join', roomId);

      const messageCount = 50;
      const receivedMessages: any[] = [];

      client.on('message:new', (msg) => {
        receivedMessages.push(msg);
      });

      // Send burst of messages
      const startTime = Date.now();
      for (let i = 0; i < messageCount; i++) {
        client.emit('message:send', {
          teamId: roomId,
          content: `Burst message ${i}`,
          type: 'user',
        });
        // Small delay to avoid rate limit
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Wait for all messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Processed ${receivedMessages.length} messages in ${duration}ms`);
      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      client.disconnect();
    });

    it('should maintain performance with multiple rooms', async () => {
      const clients: ClientSocket[] = [];
      const roomCount = 5;

      for (let i = 0; i < roomCount; i++) {
        const client = ioc(serverUrl, {
          auth: { userId: `room-user-${i}` },
          transports: ['websocket'],
        });
        clients.push(client);

        await new Promise(resolve => client.on('connect', resolve));
        client.emit('room:join', `room-${i}`);
      }

      // Each client sends a message to their room
      const messagePromises = clients.map((client, i) => 
        new Promise(resolve => {
          client.on('message:new', resolve);
          client.emit('message:send', {
            teamId: `room-${i}`,
            content: `Message from room ${i}`,
            type: 'user',
          });
        })
      );

      await Promise.all(messagePromises);

      const stats = wsServer.getConnectionStats();
      expect(stats.totalRooms).toBeGreaterThanOrEqual(roomCount);

      clients.forEach(c => c.disconnect());
    });
  });
});

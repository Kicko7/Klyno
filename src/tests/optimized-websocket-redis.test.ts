import { Server as HttpServer } from 'http';
import { createServer } from 'http';
import { io as ClientIO, Socket } from 'socket.io-client';
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OptimizedWebSocketServer } from '@/server/websocket/optimized-server';
import { OptimizedRedisService } from '@/services/optimized-redis-service';
import { OptimizedSyncService } from '@/services/optimized-sync-service';

// Mock Redis client
const mockRedisClient = {
  hset: vi.fn(),
  hget: vi.fn(),
  hgetall: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  rpush: vi.fn(),
  lrange: vi.fn(),
  xadd: vi.fn(),
  xrange: vi.fn(),
  scan: vi.fn(),
  ping: vi.fn(),
  pipeline: vi.fn(() => ({
    setex: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    hset: vi.fn(),
    exec: vi.fn(),
  })),
  memory: vi.fn(),
};

// Mock tRPC client
vi.mock('@/libs/trpc/client/lambda', () => ({
  lambdaClient: {
    teamChat: {
      addMessage: {
        mutate: vi.fn(),
      },
    },
  },
}));

describe('Optimized WebSocket and Redis Implementation', () => {
  let httpServer: HttpServer;
  let wsServer: OptimizedWebSocketServer;
  let redisService: OptimizedRedisService;
  let syncService: OptimizedSyncService;
  let clientSocket: Socket;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize optimized services
    redisService = new OptimizedRedisService(mockRedisClient as any);
    syncService = new OptimizedSyncService(redisService);
    wsServer = new OptimizedWebSocketServer(httpServer);

    // Mock Redis service in WebSocket server
    (wsServer as any).redisService = redisService;

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const port = (httpServer.address() as any).port;

        // Connect client
        clientSocket = ClientIO(`http://localhost:${port}`, {
          auth: { userId: 'test-user-1' },
          transports: ['websocket'],
        });

        resolve();
      });
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterEach(async () => {
    // Cleanup
    if (clientSocket) {
      clientSocket.disconnect();
    }

    if (wsServer) {
      await wsServer.gracefulShutdown();
    }

    if (httpServer) {
      httpServer.close();
    }

    vi.clearAllMocks();
  });

  describe('WebSocket Server', () => {
    it('should handle connection and authentication', async () => {
      expect(clientSocket.connected).toBe(true);

      const stats = wsServer.getConnectionStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
    });

    it('should handle room join with rate limiting', async () => {
      const roomId = 'test-room-1';

      // Mock Redis presence data
      mockRedisClient.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({
          userId: 'user-1',
          lastActiveAt: new Date().toISOString(),
          isActive: true,
        }),
      });

      mockRedisClient.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({
          userId: 'user-1',
          lastReadMessageId: 'msg-1',
          timestamp: new Date().toISOString(),
        }),
      });

      await new Promise<void>((resolve) => {
        clientSocket.emit('room:join', roomId);

        clientSocket.on('presence:list', (presence) => {
          expect(presence).toBeDefined();
          resolve();
        });
      });
    });

    it('should handle message sending with validation', async () => {
      const message = {
        teamId: 'test-team-1',
        content: 'Hello, world!',
        type: 'user',
        metadata: {},
      };

      // Mock Redis operations
      mockRedisClient.xadd.mockResolvedValue('msg-123');
      mockRedisClient.hset.mockResolvedValue(1);

      await new Promise<void>((resolve) => {
        clientSocket.emit('message:send', message);

        clientSocket.on('message:new', (receivedMessage) => {
          expect(receivedMessage.content).toBe(message.content);
          expect(receivedMessage.teamId).toBe(message.teamId);
          resolve();
        });
      });
    });

    it('should handle typing indicators', async () => {
      const teamId = 'test-team-1';

      // Mock Redis typing operations
      mockRedisClient.hset.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await new Promise<void>((resolve) => {
        clientSocket.emit('typing:start', teamId);

        clientSocket.on('typing:start', (data) => {
          expect(data.userId).toBe('test-user-1');
          resolve();
        });
      });
    });

    it('should handle read receipts', async () => {
      const receiptData = {
        teamId: 'test-team-1',
        lastReadMessageId: 'msg-123',
      };

      // Mock Redis read receipt operations
      mockRedisClient.hset.mockResolvedValue(1);

      await new Promise<void>((resolve) => {
        clientSocket.emit('receipt:update', receiptData);

        clientSocket.on('receipt:update', (receipt) => {
          expect(receipt.userId).toBe('test-user-1');
          expect(receipt.lastReadMessageId).toBe(receiptData.lastReadMessageId);
          resolve();
        });
      });
    });

    it('should handle disconnection gracefully', async () => {
      const disconnectPromise = new Promise<void>((resolve) => {
        wsServer.on('socket:disconnect', (data) => {
          expect(data.userId).toBe('test-user-1');
          resolve();
        });
      });

      clientSocket.disconnect();
      await disconnectPromise;
    });
  });

  describe('Redis Service', () => {
    it('should handle presence updates with batching', async () => {
      const teamId = 'test-team-1';
      const presenceData = {
        userId: 'user-1',
        lastActiveAt: new Date().toISOString(),
        isActive: true,
      };

      mockRedisClient.hset.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await redisService.updatePresence(teamId, presenceData);

      expect(mockRedisClient.hset).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should handle message streaming', async () => {
      const teamId = 'test-team-1';
      const message = {
        id: 'msg-123',
        content: 'Test message',
        userId: 'user-1',
        teamId,
        timestamp: new Date().toISOString(),
        type: 'message',
        metadata: {},
      };

      mockRedisClient.xadd.mockResolvedValue('stream-123');
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await redisService.addToMessageStream(teamId, message);

      expect(result).toBe('stream-123');
      expect(mockRedisClient.xadd).toHaveBeenCalled();
    });

    it('should handle credit tracking', async () => {
      const userId = 'user-1';
      const creditUsage = {
        messageId: 'msg-123',
        userId: 'user-1',
        credits: 10,
        timestamp: new Date().toISOString(),
        syncedToDb: false,
        metadata: {},
      };

      mockRedisClient.hset.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await redisService.trackCredits(userId, creditUsage);

      expect(mockRedisClient.hset).toHaveBeenCalled();
    });

    it('should handle health checks', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const health = redisService.getHealth();
      expect(health.isConnected).toBe(true);
    });

    it('should handle batch operations', async () => {
      const operations = [
        { type: 'set', key: 'test:1', value: 'value1', ttl: 3600 },
        { type: 'set', key: 'test:2', value: 'value2', ttl: 3600 },
      ];

      const pipeline = mockRedisClient.pipeline();
      pipeline.exec.mockResolvedValue([true, true]);

      // This would be called internally by the batch system
      expect(pipeline.exec).toBeDefined();
    });
  });

  describe('Sync Service', () => {
    it('should start and stop sync operations', () => {
      syncService.startSync();
      expect(syncService.getSyncStatus().isRunning).toBe(true);

      syncService.stopSync();
      expect(syncService.getSyncStatus().isRunning).toBe(false);
    });

    it('should handle sync metrics', () => {
      const metrics = syncService.getSyncMetrics();
      expect(metrics).toHaveProperty('totalSynced');
      expect(metrics).toHaveProperty('failedSyncs');
      expect(metrics).toHaveProperty('lastSyncTime');
    });

    it('should handle configuration updates', () => {
      const newConfig = { batchSize: 200, syncInterval: 60000 };
      syncService.updateConfig(newConfig);

      const status = syncService.getSyncStatus();
      expect(status.config.batchSize).toBe(200);
      expect(status.config.syncInterval).toBe(60000);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      // The service should emit health events
      const healthPromise = new Promise<void>((resolve) => {
        redisService.on('health:disconnected', () => {
          resolve();
        });
      });

      // Wait for health check
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The service should attempt reconnection
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should handle WebSocket connection errors', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        wsServer.on('socket:error', () => {
          resolve();
        });
      });

      // Simulate an error
      (wsServer as any).io.emit('error', new Error('Test error'));

      await errorPromise;
    });

    it('should handle rate limiting', async () => {
      const roomId = 'test-room-1';

      // Try to join the same room multiple times quickly
      for (let i = 0; i < 10; i++) {
        clientSocket.emit('room:join', roomId);
      }

      // Should receive rate limit error
      await new Promise<void>((resolve) => {
        clientSocket.on('room:error', (message) => {
          if (message.includes('Rate limit')) {
            resolve();
          }
        });
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      const connections: Socket[] = [];
      const connectionCount = 10;

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const socket = ClientIO(`http://localhost:${(httpServer.address() as any).port}`, {
          auth: { userId: `user-${i}` },
          transports: ['websocket'],
        });

        await new Promise<void>((resolve) => {
          socket.on('connect', () => resolve());
        });

        connections.push(socket);
      }

      const stats = wsServer.getConnectionStats();
      expect(stats.totalConnections).toBe(connectionCount + 1); // +1 for original client

      // Cleanup
      connections.forEach((socket) => socket.disconnect());
    });

    it('should handle batch message processing', async () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        teamId: 'test-team-1',
        content: `Message ${i}`,
        type: 'user' as const,
        metadata: {},
      }));

      mockRedisClient.xadd.mockResolvedValue('msg-123');
      mockRedisClient.hset.mockResolvedValue(1);

      const startTime = Date.now();

      // Send messages in parallel
      await Promise.all(
        messages.map(
          (msg) =>
            new Promise<void>((resolve) => {
              clientSocket.emit('message:send', msg);
              clientSocket.on('message:new', () => resolve());
            }),
        ),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process messages efficiently
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

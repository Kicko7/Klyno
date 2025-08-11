import { EventEmitter } from 'events';
import { Server as HttpServer } from 'http';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Server, Socket } from 'socket.io';

import { OptimizedRedisService } from '@/services/optimized-redis-service';
import { getOptimizedRedisService } from '@/services/optimized-redis-service-factory';
import { getSessionManager } from '@/services/sessionManagerFactory';
import { SessionManager } from '@/services/sessionManager';
import { MessageStreamData } from '@/types/redis';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@/types/socket';

// Rate limiting configuration
const RATE_LIMITS = {
  MESSAGE_SEND: { points: 10, duration: 60 }, // 10 messages per minute
  TYPING_EVENTS: { points: 30, duration: 60 }, // 30 typing events per minute
  ROOM_JOIN: { points: 5, duration: 60 }, // 5 room joins per minute
  PRESENCE_UPDATE: { points: 20, duration: 60 }, // 20 presence updates per minute
} as const;

// Connection management configuration
const CONNECTION_CONFIG = {
  MAX_ROOMS_PER_USER: 10,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 60000, // 60 seconds
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
} as const;

interface ConnectionMetrics {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  activeRooms: Set<string>;
  messageCount: number;
  isActive: boolean;
}

export class OptimizedWebSocketServer extends EventEmitter {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private redisService!: OptimizedRedisService;
  private sessionManager!: SessionManager;
  private rateLimiters: Map<string, RateLimiterMemory> = new Map();
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(httpServer: HttpServer) {
    super();

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      maxHttpBufferSize: CONNECTION_CONFIG.MAX_MESSAGE_SIZE,
      pingTimeout: CONNECTION_CONFIG.CONNECTION_TIMEOUT,
      pingInterval: CONNECTION_CONFIG.HEARTBEAT_INTERVAL,
      upgradeTimeout: 10000,
      allowUpgrades: true,
      perMessageDeflate: {
        threshold: 1024,
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        zlibDeflateOptions: {
          level: 6,
        },
      },
    });

    // Initialize rate limiters
    this.initializeRateLimiters();

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60000); // Clean up every minute
  }

  public async initialize() {
    try {
      this.redisService = await getOptimizedRedisService();
      this.sessionManager = getSessionManager();
      this.setupMiddleware();
      this.setupEventHandlers();
      this.setupErrorHandling();

      console.log('✅ Optimized WebSocket server initialized with Redis');
      console.log('🔌 WebSocket server listening on port:', process.env.PORT || '3001');
      console.log('🌐 CORS origin:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      console.log('⚡ Rate limiting enabled');
      console.log('📊 Connection metrics tracking enabled');
      console.log('📝 Session management enabled with 20-minute expiry');
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  private initializeRateLimiters() {
    Object.entries(RATE_LIMITS).forEach(([key, config]) => {
      this.rateLimiters.set(
        key,
        new RateLimiterMemory({
          points: config.points,
          duration: config.duration,
          blockDuration: config.duration * 2, // Block for 2x duration when limit exceeded
        }),
      );
    });
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const userId = socket.handshake.auth.userId;
        if (!userId) {
          return next(new Error('Authentication failed: Missing userId'));
        }

        // Rate limiting for connection attempts
        const limiter = this.rateLimiters.get('ROOM_JOIN');
        if (limiter) {
          try {
            await limiter.consume(userId);
          } catch (rejRes) {
            return next(new Error(`Rate limit exceeded: Too many connection attempts`));
          }
        }

        socket.data.userId = userId;
        socket.data.activeRooms = new Set();
        socket.data.connectedAt = new Date();

        next();
      } catch (error) {
        console.error('Authentication middleware error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection metrics middleware
    this.io.use((socket, next) => {
      const metrics: ConnectionMetrics = {
        userId: socket.data.userId,
        socketId: socket.id,
        connectedAt: socket.data.connectedAt,
        lastActivity: new Date(),
        activeRooms: socket.data.activeRooms,
        messageCount: 0,
        isActive: true,
      };

      this.connectionMetrics.set(socket.id, metrics);
      this.startHeartbeat(socket);

      next();
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);

      // Room Events with enhanced error handling
      socket.on('room:join', async (roomId) => {
        await this.handleRoomJoin(socket, roomId);
      });

      socket.on('room:leave', async (roomId) => {
        await this.handleRoomLeave(socket, roomId);
      });

      // Message Events with rate limiting and validation
      socket.on('message:send', async (message) => {
        await this.handleMessageSend(socket, message);
      });

      socket.on('message:edit', async (messageId, content) => {
        await this.handleMessageEdit(socket, messageId, content);
      });

      socket.on('message:delete', async (messageId) => {
        await this.handleMessageDelete(socket, messageId);
      });

      // Typing Events with rate limiting
      socket.on('typing:start', async (teamId) => {
        await this.handleTypingStart(socket, teamId);
      });

      socket.on('typing:stop', async (teamId) => {
        await this.handleTypingStop(socket, teamId);
      });

      // Read Receipt Events
      socket.on('receipt:update', async (data) => {
        await this.handleReadReceiptUpdate(socket, data);
      });

      // Heartbeat
      socket.on('heartbeat', () => {
        this.updateActivity(socket);
      });

      // Disconnect handling
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, reason);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        this.emit('socket:error', { socketId: socket.id, userId: socket.data.userId, error });
      });
    });
  }

  private setupErrorHandling() {
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket.IO connection error:', err);
      this.emit('connection:error', err);
    });

    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  private async handleRoomJoin(socket: Socket, roomId: string) {
    try {
      // Validate room ID
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('room:error', 'Invalid room ID');
        return;
      }

      // Check room limit
      if (socket.data.activeRooms.size >= CONNECTION_CONFIG.MAX_ROOMS_PER_USER) {
        socket.emit('room:error', 'Maximum number of rooms reached');
        return;
      }

      // Rate limiting
      const limiter = this.rateLimiters.get('ROOM_JOIN');
      if (limiter) {
        try {
          await limiter.consume(socket.data.userId);
        } catch (rejRes) {
          socket.emit('room:error', 'Rate limit exceeded: Too many room joins');
          return;
        }
      }

      await socket.join(roomId);
      socket.data.activeRooms.add(roomId);

      // Update metrics
      const metrics = this.connectionMetrics.get(socket.id);
      if (metrics) {
        metrics.activeRooms.add(roomId);
        metrics.lastActivity = new Date();
      }

      // Load session data from session manager
      const sessionMessages = await this.sessionManager.getMessages(roomId);
      if (sessionMessages && sessionMessages.length > 0) {
        // Send cached messages to the joining user
        socket.emit('messages:history', sessionMessages);
        console.log(`📨 Sent ${sessionMessages.length} cached messages to user ${socket.data.userId}`);
      }

      // Send current presence list
      const presence = await this.redisService.getPresence(roomId);
      socket.emit('presence:list', presence);

      // Send current read receipts
      const receipts = await this.redisService.getReadReceipts(roomId);
      socket.emit('receipt:list', receipts);

      // Update user presence
      await this.redisService.updatePresence(roomId, {
        userId: socket.data.userId,
        lastActiveAt: new Date().toISOString(),
        isActive: true,
      });

      // Broadcast presence update
      this.io.to(roomId).emit('presence:update', {
        userId: socket.data.userId,
        lastActiveAt: new Date().toISOString(),
        isActive: true,
      });

      console.log(`User ${socket.data.userId} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room:error', 'Failed to join room');
      this.emit('room:join:error', { socketId: socket.id, roomId, error });
    }
  }

  private async handleRoomLeave(socket: Socket, roomId: string) {
    try {
      await socket.leave(roomId);
      socket.data.activeRooms.delete(roomId);

      // Update metrics
      const metrics = this.connectionMetrics.get(socket.id);
      if (metrics) {
        metrics.activeRooms.delete(roomId);
        metrics.lastActivity = new Date();
      }

      // Update user presence
      await this.redisService.updatePresence(roomId, {
        userId: socket.data.userId,
        lastActiveAt: new Date().toISOString(),
        isActive: false,
      });

      // Broadcast presence update
      this.io.to(roomId).emit('presence:update', {
        userId: socket.data.userId,
        lastActiveAt: new Date().toISOString(),
        isActive: false,
      });

      console.log(`User ${socket.data.userId} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
      this.emit('room:leave:error', { socketId: socket.id, roomId, error });
    }
  }

  private async handleMessageSend(
    socket: Socket,
    message: { teamId: string; content: string; type?: string; metadata?: any },
  ) {
    try {
      // Validate message
      if (!message.content || message.content.length > CONNECTION_CONFIG.MAX_MESSAGE_SIZE) {
        socket.emit('room:error', 'Invalid message content or size');
        return;
      }

      // Rate limiting
      const limiter = this.rateLimiters.get('MESSAGE_SEND');
      if (limiter) {
        try {
          await limiter.consume(socket.data.userId);
        } catch (rejRes) {
          socket.emit('room:error', 'Rate limit exceeded: Too many messages');
          return;
        }
      }

      const timestamp = new Date().toISOString();
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const streamMessage: MessageStreamData = {
        id: messageId,
        content: message.content,
        userId: socket.data.userId,
        teamId: message.teamId,
        timestamp,
        type: message.type || 'message',
        metadata: message.metadata || {},
      };

      // Add message to Redis stream for real-time delivery
      await this.redisService.addToMessageStream(message.teamId, streamMessage);

      // Add message to session manager cache
      await this.sessionManager.addMessage(message.teamId, {
        id: messageId,
        content: message.content,
        role: (message.type as 'user' | 'assistant' | 'system') || 'user',
        timestamp,
        metadata: message.metadata || {},
        userId: socket.data.userId,
      });

      // Persist message to database with retry logic
      await this.persistMessageToDatabase(message, messageId);

      // Broadcast to all users in the room
      this.io.to(message.teamId).emit('message:new', streamMessage);

      // Update metrics
      const metrics = this.connectionMetrics.get(socket.id);
      if (metrics) {
        metrics.messageCount++;
        metrics.lastActivity = new Date();
      }

      console.log(`Message sent to room ${message.teamId} by user ${socket.data.userId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('room:error', 'Failed to send message');
      this.emit('message:send:error', { socketId: socket.id, message, error });
    }
  }

  private async persistMessageToDatabase(message: any, messageId: string, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { lambdaClient } = await import('@/libs/trpc/client/lambda');
        await lambdaClient.teamChat.addMessage.mutate({
          teamChatId: message.teamId,
          content: message.content,
          messageType: (message.type as 'user' | 'assistant' | 'system') || 'user',
          metadata: {
            ...(message.metadata || {}),
            socketMessageId: messageId,
            sentViaWebSocket: true,
          },
        });
        console.log(`✅ Message persisted to database: ${messageId}`);
        return;
      } catch (dbError) {
        console.error(
          `❌ Failed to persist message to database (attempt ${attempt}/${retries}):`,
          dbError,
        );
        if (attempt === retries) {
          // Continue with real-time delivery even if DB persistence fails
          console.warn('⚠️ Message will be delivered in real-time but not persisted');
        } else {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  private async handleMessageEdit(socket: Socket, messageId: string, content: string) {
    try {
      // Validate content
      if (!content || content.length > CONNECTION_CONFIG.MAX_MESSAGE_SIZE) {
        socket.emit('room:error', 'Invalid message content or size');
        return;
      }

      // Update message in database
      const { lambdaClient } = await import('@/libs/trpc/client/lambda');
      // Note: You'll need to add an editMessage mutation to the tRPC router
      // await lambdaClient.teamChat.editMessage.mutate({ messageId, content });

      // Broadcast edit to room
      this.io.to(socket.data.activeRooms).emit('message:update', { id: messageId, content });

      console.log(`Message ${messageId} edited by user ${socket.data.userId}`);
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('room:error', 'Failed to edit message');
    }
  }

  private async handleMessageDelete(socket: Socket, messageId: string) {
    try {
      // Delete message from database
      const { lambdaClient } = await import('@/libs/trpc/client/lambda');
      // Note: You'll need to add a deleteMessage mutation to the tRPC router
      // await lambdaClient.teamChat.deleteMessage.mutate({ messageId });

      // Broadcast deletion to room
      this.io.to(socket.data.activeRooms).emit('message:delete', messageId);

      console.log(`Message ${messageId} deleted by user ${socket.data.userId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('room:error', 'Failed to delete message');
    }
  }

  private async handleTypingStart(socket: Socket, teamId: string) {
    try {
      // Rate limiting
      const limiter = this.rateLimiters.get('TYPING_EVENTS');
      if (limiter) {
        try {
          await limiter.consume(socket.data.userId);
        } catch (rejRes) {
          return; // Silently ignore typing events when rate limited
        }
      }

      const data = {
        userId: socket.data.userId,
        timestamp: new Date().toISOString(),
      };
      await this.redisService.setTyping(teamId, data);
      this.io.to(teamId).emit('typing:start', data);
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  private async handleTypingStop(socket: Socket, teamId: string) {
    try {
      const data = {
        userId: socket.data.userId,
        timestamp: new Date().toISOString(),
      };
      this.io.to(teamId).emit('typing:stop', data);
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  private async handleReadReceiptUpdate(
    socket: Socket,
    data: { teamId: string; lastReadMessageId: string },
  ) {
    try {
      const receipt = {
        userId: socket.data.userId,
        timestamp: new Date().toISOString(),
        lastReadMessageId: data.lastReadMessageId,
      };
      await this.redisService.updateReadReceipt(data.teamId, receipt);
      this.io.to(data.teamId).emit('receipt:update', { ...receipt, teamId: data.teamId });
    } catch (error) {
      console.error('Error updating read receipt:', error);
    }
  }

  private async handleDisconnect(socket: Socket, reason: string) {
    console.log(
      `Socket disconnected: ${socket.id} (User: ${socket.data.userId}, Reason: ${reason})`,
    );

    // Clean up heartbeat
    this.stopHeartbeat(socket);

    // Update presence for all active rooms
    for (const roomId of socket.data.activeRooms) {
      try {
        await this.redisService.updatePresence(roomId, {
          userId: socket.data.userId,
          lastActiveAt: new Date().toISOString(),
          isActive: false,
        });

        this.io.to(roomId).emit('presence:update', {
          userId: socket.data.userId,
          lastActiveAt: new Date().toISOString(),
          isActive: false,
        });
      } catch (error) {
        console.error(`Error updating presence for room ${roomId}:`, error);
      }
    }

    // Clean up metrics
    this.connectionMetrics.delete(socket.id);

    this.emit('socket:disconnect', { socketId: socket.id, userId: socket.data.userId, reason });
  }

  private startHeartbeat(socket: Socket) {
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      } else {
        this.stopHeartbeat(socket);
      }
    }, CONNECTION_CONFIG.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(socket.id, interval);
  }

  private stopHeartbeat(socket: Socket) {
    const interval = this.heartbeatIntervals.get(socket.id);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(socket.id);
    }
  }

  private updateActivity(socket: Socket) {
    const metrics = this.connectionMetrics.get(socket.id);
    if (metrics) {
      metrics.lastActivity = new Date();
    }
  }

  private cleanupInactiveConnections() {
    const now = new Date();
    const inactiveThreshold = new Date(now.getTime() - CONNECTION_CONFIG.CONNECTION_TIMEOUT * 2);

    for (const [socketId, metrics] of this.connectionMetrics.entries()) {
      if (metrics.lastActivity < inactiveThreshold) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          console.log(`Disconnecting inactive socket: ${socketId}`);
          socket.disconnect(true);
        }
        this.connectionMetrics.delete(socketId);
        this.stopHeartbeat(socket);
      }
    }
  }

  public getConnectionStats() {
    const stats = {
      totalConnections: this.connectionMetrics.size,
      activeConnections: Array.from(this.connectionMetrics.values()).filter((m) => m.isActive)
        .length,
      totalRooms: new Set(
        Array.from(this.connectionMetrics.values()).flatMap((m) => Array.from(m.activeRooms)),
      ).size,
      totalMessages: Array.from(this.connectionMetrics.values()).reduce(
        (sum, m) => sum + m.messageCount,
        0,
      ),
      uptime: process.uptime(),
    };

    return stats;
  }

  public async gracefulShutdown() {
    console.log('🔄 Starting graceful shutdown...');

    // Stop accepting new connections
    this.io.close();

    // Clear intervals
    clearInterval(this.cleanupInterval);
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));

    // Disconnect all clients
    this.io.sockets.sockets.forEach((socket) => {
      socket.disconnect(true);
    });

    console.log('✅ WebSocket server shutdown complete');
    process.exit(0);
  }

  public destroy() {
    this.gracefulShutdown();
  }
}

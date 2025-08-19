import { Server as HttpServer } from 'http';
import { nanoid } from 'nanoid';
import { Server } from 'socket.io';

import { RedisService } from '@/services/redisService';
import { getRedisService } from '@/services/redisServiceFactory';
import { MessageData, SessionManager } from '@/services/sessionManager';
import { getSessionManager } from '@/services/sessionManagerFactory';
import { MessageStreamData } from '@/types/redis';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@/types/socket';

export class WebSocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private redisService!: RedisService;
  private sessionManager!: SessionManager;
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalDisconnections: 0,
    pingTimeouts: 0,
  };

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        // Allow the frontend origin, not the socket server URL
        origin: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      allowEIO3: true,
      pingTimeout: 60000,  // 60 seconds - time to wait for pong (reduced)
      pingInterval: 25000, // 25 seconds - ping interval (reduced)
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6,
      connectTimeout: 45000,
      // Add connection state validation
      allowRequest: (req, callback) => {
        // Allow all requests but log them for debugging
        callback(null, true);
      },
    });
  }

  public async initialize() {
    this.redisService = await getRedisService();
    this.sessionManager = await getSessionManager();
    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('✅ WebSocket server initialized with Redis and SessionManager');
    console.log('🔌 WebSocket server listening on port:', process.env.PORT || '3001');
    console.log('🌐 CORS origin:', process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000');
  }

  private setupMiddleware() {
    // Authenticate socket connection
    this.io.use(async (socket, next) => {
      const userId = socket.handshake.auth.userId;
      if (!userId) {
        return next(new Error('Authentication failed'));
      }

      socket.data.userId = userId;
      socket.data.activeRooms = new Set();
      next();
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Track connection time for debugging
      (socket.data as any).connectTime = Date.now();
      
      // Update connection statistics
      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;
      
      console.log(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);
      console.log(`📊 Connection stats: Total: ${this.connectionStats.totalConnections}, Active: ${this.connectionStats.activeConnections}`);

      // Room Events
      socket.on('room:join', async (roomId) => {
        try {
          console.log(`🚪 User ${socket.data.userId} attempting to join room: ${roomId}`);

          await socket.join(roomId);
          socket.data.activeRooms.add(roomId);
          console.log(`✅ User ${socket.data.userId} successfully joined room: ${roomId}`);

          // Check if session exists in Redis or load from DB
          let session = await this.sessionManager.getSession(roomId);
          if (!session) {
            console.log(`📥 Loading session from DB for room: ${roomId}`);
            session = await this.sessionManager.loadSessionFromDb(roomId);
            if (!session) {
              // Create new session if none exists
              session = await this.sessionManager.createSession(roomId, [socket.data.userId]);
              console.log(`🆕 Created new session for room: ${roomId}`);
            }
          }

          // Send session data to the joining user
          socket.emit('session:loaded', {
            sessionId: session.sessionId,
            messages: session.messages,
            participants: session.participants,
            status: session.status,
          });
          console.log(`📤 Sent session data to user ${socket.data.userId} for room ${roomId}:`, {
            messageCount: session.messages.length,
            participantCount: session.participants.length,
          });

          // Send current presence list
          const presence = await this.redisService.getPresence(roomId);
          socket.emit('presence:list', presence);
          console.log(
            `📊 Sent presence list to user ${socket.data.userId} for room ${roomId}:`,
            presence,
          );

          // Send current read receipts
          const receipts = await this.redisService.getReadReceipts(roomId);
          socket.emit('receipt:list', receipts);
          console.log(
            `📖 Sent read receipts to user ${socket.data.userId} for room ${roomId}:`,
            receipts,
          );

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

          // Get room information for debugging
          const room = this.io.sockets.adapter.rooms.get(roomId);
          const roomSize = room ? room.size : 0;
          console.log(
            `✅ User ${socket.data.userId} joined room ${roomId} with session ${session.sessionId}. Room size: ${roomSize}`,
          );
        } catch (error) {
          console.error(`❌ Error joining room ${roomId}:`, error);
          socket.emit('room:error', 'Failed to join room');
        }
      });

      socket.on('room:leave', async (roomId) => {
        try {
          await socket.leave(roomId);
          socket.data.activeRooms.delete(roomId);

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
        } catch (error) {
          console.error('Error leaving room:', error);
        }
      });

      // Message Events
      socket.on(
        'message:send',
        async (message: { teamId: string; content: string; type?: string; metadata?: any }) => {
          try {
            const timestamp = new Date().toISOString();

            // Use client-provided message ID if available, otherwise generate a new one
            const messageId =
              message.metadata?.clientMessageId || `msg_${Date.now()}_${nanoid(10)}`;

            console.log(
              `📨 Processing message: ${messageId} (client provided: ${!!message.metadata?.clientMessageId})`,
            );

            // Create message data for session
            const messageData: MessageData = {
              id: messageId,
              content: message.content,
              userId: message.type === 'assistant' ? 'assistant' : socket.data.userId,
              timestamp: Date.now(),
              type: (message.type as 'user' | 'assistant' | 'system') || 'user',
              metadata: message.metadata || {},
              syncedToDb: false,
            };

            // Add message to session in Redis with retry and backoff
            let retryCount = 0;
            const maxRetries = 3;
            // simple exponential backoff: 1s, 2s, 3s
            while (true) {
              try {
                await this.sessionManager.appendMessage(message.teamId, messageData);
                break;
              } catch (err) {
                retryCount += 1;
                if (retryCount >= maxRetries) throw err;
                await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
              }
            }

            // For AI messages, ensure immediate database persistence
            // if (message.type === 'assistant') {
            //   try {
            //     // Use the lambda client to persist AI messages immediately
            //     const { lambdaClient } = await import('@/libs/trpc/client/lambda');
            //     await lambdaClient.teamChat.addMessage.mutate({
            //       teamChatId: message.teamId,
            //       content: message.content,
            //       messageType: 'assistant',
            //       metadata: {
            //         ...message.metadata,
            //         redisMessageId: messageId,
            //         syncedFromWebSocket: true,
            //       },
            //     });
            //     console.log(`✅ AI message immediately persisted to database: ${messageId}`);
            //   } catch (persistError) {
            //     console.error(
            //       `❌ Failed to persist AI message to database: ${messageId}`,
            //       persistError,
            //     );
            //     // Don't fail the WebSocket flow, but log the error
            //   }
            // }

            // Check if we need background sync (approaching 1000 message limit)
            if (await this.sessionManager.needsBackgroundSync(message.teamId)) {
              console.log(`🔄 Triggering background sync for ${message.teamId}`);
              // Don't await - let it run in background
              this.sessionManager.performBackgroundSync(message.teamId).catch((error) => {
                console.error('Background sync failed:', error);
              });
            }

            // Create stream message for broadcasting
            const streamMessage: MessageStreamData = {
              id: messageId,
              content: message.content,
              userId: message.type === 'assistant' ? 'assistant' : socket.data.userId,
              teamId: message.teamId,
              timestamp,
              type: 'message', // Keep as 'message' for Redis compatibility, but userId will indicate AI
              metadata: message.metadata || {},
            };

            // Add message to Redis stream for real-time delivery (non-blocking best-effort)
            try {
              await this.redisService.addToMessageStream(message.teamId, streamMessage);
            } catch (streamErr) {
              // Log but don't fail the send path; socket broadcast still proceeds
              console.error('Failed to add to message stream:', streamErr);
            }

            // Get room information for debugging
            const room = this.io.sockets.adapter.rooms.get(message.teamId);
            const roomSize = room ? room.size : 0;
            console.log(
              `📡 Broadcasting message ${messageId} to room ${message.teamId} (${roomSize} users)`,
            );

            // Broadcast to all users in the room EXCEPT the sender (to prevent duplication)
            socket.broadcast.to(message.teamId).emit('message:new', streamMessage);

            // Log broadcast details for debugging
            console.log(`✅ Message ${messageId} broadcasted to room ${message.teamId}`, {
              type: message.type,
              userId: message.type === 'assistant' ? 'assistant' : socket.data.userId,
              contentLength: message.content.length,
              roomSize,
              timestamp,
              metadata: message.metadata,
            });

            // Get session stats for monitoring
            const stats = await this.sessionManager.getSessionStats(message.teamId);
            if (stats) {
              console.log(
                `📊 Session ${message.teamId}: ${stats.messageCount} messages, ${stats.unsyncedCount} unsynced`,
              );
            }

            // Refresh presence TTL for sender to keep them active
            try {
              await this.redisService.updatePresence(message.teamId, {
                userId: socket.data.userId,
                lastActiveAt: new Date().toISOString(),
                isActive: true,
              });
              this.io.to(message.teamId).emit('presence:update', {
                userId: socket.data.userId,
                lastActiveAt: new Date().toISOString(),
                isActive: true,
              });
            } catch (e) {
              console.warn('Failed to refresh presence after message send:', e);
            }

            // Note: Database persistence will happen during sync (either background sync or session expiry)
            console.log(`📡 Message ${messageId} added to session and broadcasted`);
          } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('room:error', 'Failed to send message. Please try again.');
            // also notify the room for potential UI feedback (optional)
            try {
              this.io.to(message.teamId).emit('message:error', {
                teamId: message.teamId,
                userId: socket.data.userId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              });
            } catch {}
          }
        },
      );

      socket.on('message:edit', async (messageId, content) => {
        try {
          // Update message in database
          const { lambdaClient } = await import('@/libs/trpc/client/lambda');
          // Note: You'll need to add an editMessage mutation to the tRPC router
          // await lambdaClient.teamChat.editMessage.mutate({ messageId, content });

          // Broadcast edit to all rooms the user is in
          for (const roomId of socket.data.activeRooms) {
            this.io.to(roomId).emit('message:update', { id: messageId, content });
          }
        } catch (error) {
          console.error('Error editing message:', error);
        }
      });

      socket.on('message:delete', async (messageId) => {
        try {
          // Delete message from database
          const { lambdaClient } = await import('@/libs/trpc/client/lambda');
          // Note: You'll need to add a deleteMessage mutation to the tRPC router
          // await lambdaClient.teamChat.deleteMessage.mutate({ messageId });

          // Broadcast deletion to all rooms the user is in
          for (const roomId of socket.data.activeRooms) {
            this.io.to(roomId).emit('message:delete', messageId);
          }
        } catch (error) {
          console.error('Error deleting message:', error);
        }
      });

      // Typing Events
      socket.on('typing:start', async (teamId) => {
        try {
          const data = {
            userId: socket.data.userId,
            timestamp: new Date().toISOString(),
          };
          await this.redisService.setTyping(teamId, data);
          this.io.to(teamId).emit('typing:start', data);
        } catch (error) {
          console.error('Error handling typing start:', error);
        }
      });

      socket.on('typing:stop', async (teamId) => {
        try {
          const data = {
            userId: socket.data.userId,
            timestamp: new Date().toISOString(),
          };
          this.io.to(teamId).emit('typing:stop', data);
        } catch (error) {
          console.error('Error handling typing stop:', error);
        }
      });

      // Read Receipt Events
      socket.on('receipt:update', async (data: { teamId: string; lastReadMessageId: string }) => {
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
      });

      // Presence heartbeat to keep users active while viewing
      socket.on('presence:heartbeat', async (teamId: string) => {
        try {
          await this.redisService.updatePresence(teamId, {
            userId: socket.data.userId,
            lastActiveAt: new Date().toISOString(),
            isActive: true,
          });
          this.io.to(teamId).emit('presence:update', {
            userId: socket.data.userId,
            lastActiveAt: new Date().toISOString(),
            isActive: true,
          });
        } catch (error) {
          console.error('Error handling presence heartbeat:', error);
        }
      });

      // Custom ping/pong handler to prevent timeout issues
 

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id} (User: ${socket.data.userId}):`, error);
      });

      socket.on('disconnect', async (reason) => {
        const duration = Date.now() - ((socket.data as any).connectTime || Date.now());
        
        // Update connection statistics
        this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1);
        this.connectionStats.totalDisconnections++;
        
        console.log(`Socket disconnected: ${socket.id} (User: ${socket.data.userId}) - Reason: ${reason} - Duration: ${duration}ms`);
        console.log(`📊 Connection stats: Total: ${this.connectionStats.totalConnections}, Active: ${this.connectionStats.activeConnections}, Disconnections: ${this.connectionStats.totalDisconnections}`);

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
      });
    });
  }

  public getIO() {
    return this.io;
  }

  public getConnectionStats() {
    return {
      ...this.connectionStats,
      currentTime: new Date().toISOString(),
    };
  }
}

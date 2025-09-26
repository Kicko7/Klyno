import { Server as HttpServer } from 'http';
import { nanoid } from 'nanoid';
import { Server } from 'socket.io';

import { ApiService } from './services/fetchService';
import { RedisService } from './services/redisService';
import { getRedisService } from './services/redisServiceFactory';
import { MessageData, SessionManager } from './services/sessionManager';
import { getSessionManager } from './services/sessionManagerFactory';
import { MessageStreamData } from './types/redis';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/socket';

export class WebSocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private redisService!: RedisService;
  private sessionManager!: SessionManager;
  private apiService!: ApiService;
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
        origin: process.env.APP_URL,
        // origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io',
      transports: ['websocket'],
      allowEIO3: false,
      pingTimeout: 60000, // 60 seconds - time to wait for pong (reduced)
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
    this.apiService = new ApiService();
    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('✅ WebSocket server initialized with Redis and SessionManager');
    console.log('🔌 WebSocket server listening on port:', process.env.PORT || '3001');
    console.log('🌐 CORS origin:', process.env.APP_URL);
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
    this.io.on('connection', async (socket) => {
      console.log('🔌 Socket connected:', socket.id);
      // Track connection time for debugging
      (socket.data as any).connectTime = Date.now();

      // Update connection statistics
      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;

      // Room Events
      socket.on('room:join', async (roomId) => {
        try {
          await socket.join(roomId);
          socket.data.activeRooms.add(roomId);

          // Check if session exists in Redis or load from DB
          let session = await this.sessionManager.getSession(roomId);
          if (!session) {
            console.log(`📥 Loading session from DB for room: ${roomId}`);
            session = await this.sessionManager.loadSessionFromDb(roomId);
            if (!session) {
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
            queue: session.queue,
          });
          console.log(`📤 Sent session data to user ${socket.data.userId} for room ${roomId}:`, {
            messageCount: session.messages.length,
            participantCount: session.participants.length,
          });

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

          // Get room information for debugging
          const room = this.io.sockets.adapter.rooms.get(roomId);
        } catch (error) {
          console.error(`❌ Error joining room ${roomId}:`, error);
          socket.emit('room:error', 'Failed to join room');
        }
      });

      socket.on('room:leave', async (roomId) => {
        try {
          const userId = socket.data.userId; // Get the user ID who is leaving
          console.log(`👋 User ${userId} leaving room ${roomId}`);

          await socket.leave(roomId);
          socket.data.activeRooms.delete(roomId);

          // If room is now empty, persist messages to DB and expire session
          try {
            const session = await this.sessionManager.getSession(roomId);
            if (session && session.queue && session.queue.length > 0) {
              session.queue = session.queue.filter((p: any) => p.userId !== userId);
              console.log(`👋 User ${userId} leaving room ${roomId} with queue`, session.queue);
              await this.sessionManager.updateSession(roomId, session.messages, session.queue);
              console.log(session.queue);
            }
            
            // Broadcast user leave to the specific room they're leaving
            socket.broadcast.to(roomId).emit('user:leave', userId);
            const room = this.io.sockets.adapter.rooms.get(roomId);
            const roomSize = room ? room.size : 0;
            if (roomSize === 0) {
              await this.sessionManager.expireSession(roomId);
              console.log(`💾 Room ${roomId} empty after user ${userId} left → session expired & synced`);
            }
          } catch (checkErr) {
            console.error(`Error checking room empty state for ${roomId}:`, checkErr);
          }
        } catch (error) {
          console.error('Error leaving room:', error);
        }
      });

      // Message Events

      socket.on(
        'message:send',
        async (message: { teamId: string; content: string; type?: string; metadata?: any, timestamp?: any }) => {
          try {
            console.log(message.metadata);
            const timestamp = new Date().toISOString();

            if (!message.timestamp) {
              message.timestamp = timestamp;
            }
            const messageId =
              message.metadata?.clientMessageId || `msg_${Date.now()}_${nanoid(10)}`;

            if (messageId.includes('assistant')) {
              const assistantMessage = await this.sessionManager.getMessageById(messageId);
              if (assistantMessage) {
                // Update existing message instead of creating new one
                await this.sessionManager.updateMessage(message.teamId, messageId, {
                  ...message
                });

                socket.broadcast.to(message.teamId).emit('message:update', {
                  id: messageId,
                  content: message.content,
                  metadata: {
                    ...message.metadata,
                  },
                });

                return; // Exit early since we updated the existing message
              }
            }

            // Create message data for session
            const messageData: MessageData = {
              id: messageId,
              content: message.content,
              userId: message.type === 'assistant' ? 'assistant' : socket.data.userId,
              timestamp: message.timestamp,
              type: (message.type as 'user' | 'assistant' | 'system') || 'user',
              metadata: message.metadata || {},
              syncedToDb: false,
              sendTime: message.timestamp,
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

            // Check if we need background sync (approaching 1000 message limit)
            if (await this.sessionManager.needsBackgroundSync(message.teamId)) {
              this.sessionManager.performBackgroundSync(message.teamId).catch((error: any) => {
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
              console.error('Failed to add to message stream:', streamErr);
            }

            socket.broadcast.to(message.teamId).emit('message:new', streamMessage);

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
            } catch { }
          }
        },
      );

      socket.on('message:edit', async (messageId, content) => {
        try {
          console.log(`✏️ Message edit request: ${messageId} by user ${socket.data.userId}`);

          // First, check if message exists in Redis session
          const session = await this.sessionManager.getSessionByMessageId(messageId);

          if (session) {
            // Message is in Redis session - update it there
            await this.sessionManager.updateMessage(session.sessionId, messageId, {
              content,
              updatedAt: new Date(),
            });

            // Broadcast only to the specific room where the message belongs
            for (const roomId of socket.data.activeRooms) {
              socket.broadcast.to(roomId).emit('message:update', {
                id: messageId,
                content,
              });
            }

            // await this.apiService.updateMessage(messageId, {
            //   content,
            //   updatedAt: new Date(),
            //   updatedBy: socket.data.userId,
            // });        

          } else {
            try {
              await this.apiService.updateMessage(messageId, {
                content,
                updatedAt: new Date(),
                updatedBy: socket.data.userId,
              });

              for (const roomId of socket.data.activeRooms) {
                socket.broadcast.to(roomId).emit('message:update', {
                  id: messageId,
                  content,
                });
              }
            } catch (dbError) {
              console.error('❌ Failed to update message in database:', dbError);
            }
          }

        } catch (error) {
          console.error('❌ Error editing message:', error);
        }
      });

      socket.on('message:delete', async (messageId) => {
        try {
          console.log(`🗑️ Message delete request: ${messageId} by user ${socket.data.userId}`);

          // First, check if message exists in Redis session
          const session = await this.sessionManager.getSessionByMessageId(messageId);

          if (session) {
            // Message is in Redis session - delete it there
            await this.sessionManager.deleteMessage(session.sessionId, messageId);

            // Broadcast deletion only to the specific room where the message belongs
            this.io.to(session.sessionId).emit('message:delete', messageId);

            await this.apiService.deleteMessage(messageId);

            console.log(`✅ Message ${messageId} deleted from Redis session ${session.sessionId}`);
          } else {
            try {
              await this.apiService.deleteMessage(messageId);

              // If message is not in Redis, we need to find which room it belongs to
              // For now, we'll broadcast to all active rooms as fallback
              // TODO: Implement a way to find the room for database messages
              for (const roomId of socket.data.activeRooms) {
                this.io.to(roomId).emit('message:delete', messageId);
              }

              console.log(`✅ Message ${messageId} deleted from database`);
            } catch (error) {
              console.error('❌ Error deleting message:', error);
            }
          }
        } catch (error) {
          console.error('❌ Error deleting message:', error);
        }
      });


      socket.on('message:queue-send', async (data: { teamId: string; content: string; type?: any; metadata?: any, timestamp: any, messageId: string }) => {
        try {
          await this.sessionManager.appendQueueMessage(data.teamId, data);
          console.log('message:queue-send', data);
          for (const roomId of socket.data.activeRooms) {
            socket.broadcast.to(roomId).emit('message:queue', data);
          }
        } catch (error) {
          console.error('Error adding message to message stream:', error);
        }
      });

      socket.on('message:queue:remove', async (teamChatId: string, messageId: string) => {
        try {
          console.log('message:queue:remove', teamChatId, messageId);
          await this.sessionManager.removeQueueMessage(teamChatId, messageId);

          // Broadcast to all connected clients, not just current socket's rooms
          this.io.emit('message:queue:delete', teamChatId, messageId);
          console.log('Broadcasted message:queue:delete to all clients', teamChatId, messageId);
        } catch (error) {
          console.error('Error removing message from queue:', error);
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
          await this.redisService.updateReadReceipt(data.teamId, {
            userId: socket.data.userId,
            lastReadMessageId: data.lastReadMessageId,
            timestamp: new Date().toISOString(),
          });

          // Broadcast to all users in the room
          this.io.to(data.teamId).emit('receipt:update', {
            userId: socket.data.userId,
            lastReadMessageId: data.lastReadMessageId,
            timestamp: new Date().toISOString(),
            teamId: data.teamId,
          });
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
        this.connectionStats.activeConnections = Math.max(
          0,
          this.connectionStats.activeConnections - 1,
        );
        this.connectionStats.totalDisconnections++;

        console.log(
          `Socket disconnected: ${socket.id} (User: ${socket.data.userId}) - Reason: ${reason} - Duration: ${duration}ms`,
        );
        console.log(
          `📊 Connection stats: Total: ${this.connectionStats.totalConnections}, Active: ${this.connectionStats.activeConnections}, Disconnections: ${this.connectionStats.totalDisconnections}`,
        );

        // Update presence for all active rooms
        for (const roomId of socket.data.activeRooms) {
          try {            // Broadcast user leave to all rooms they were in

            // If this disconnect leaves the room empty, sync and expire the session
            try {
              const session = await this.sessionManager.getSession(roomId);
              if (session && session.queue && session.queue.length > 0) {
                session.queue = session.queue.filter((p: any) => p.userId !== socket.data.userId);
                await this.sessionManager.updateSession(roomId, session.messages, session.queue);
                this.io.to(roomId).emit('user:leave', socket.data.userId);
              }
              const room = this.io.sockets.adapter.rooms.get(roomId);
              const roomSize = room ? room.size : 0;
              if (roomSize === 0) {
                await this.sessionManager.expireSession(roomId);
                console.log(`💾 Room ${roomId} empty after disconnect → session expired & synced`);
              }
            } catch (checkErr) {
              console.error(`Error checking room empty state for ${roomId}:`, checkErr);
            }
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

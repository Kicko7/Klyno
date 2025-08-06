import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

import { RedisService } from '@/services/redisService';
import { getRedisService } from '@/services/redisServiceFactory';
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

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });
  }

  public async initialize() {
    this.redisService = await getRedisService();
    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('✅ WebSocket server initialized with Redis');
    console.log('🔌 WebSocket server listening on port:', process.env.PORT || '3001');
    console.log('🌐 CORS origin:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
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
      console.log(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);

      // Room Events
      socket.on('room:join', async (roomId) => {
        try {
          await socket.join(roomId);
          socket.data.activeRooms.add(roomId);

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
        } catch (error) {
          console.error('Error joining room:', error);
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

            // Persist message to database
            try {
              // Import the tRPC client to call the addMessage mutation
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
              console.log('✅ Message persisted to database:', messageId);
            } catch (dbError) {
              console.error('❌ Failed to persist message to database:', dbError);
              // Continue with real-time delivery even if DB persistence fails
            }

            // Broadcast to all users in the room
            this.io.to(message.teamId).emit('message:new', streamMessage);
            console.log('📡 Message broadcasted to room:', message.teamId);
          } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('room:error', 'Failed to send message');
          }
        },
      );

      socket.on('message:edit', async (messageId, content) => {
        try {
          // Update message in database
          const { lambdaClient } = await import('@/libs/trpc/client/lambda');
          // Note: You'll need to add an editMessage mutation to the tRPC router
          // await lambdaClient.teamChat.editMessage.mutate({ messageId, content });

          // Broadcast edit to room
          this.io.to(socket.data.activeRooms).emit('message:update', { id: messageId, content });
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

          // Broadcast deletion to room
          this.io.to(socket.data.activeRooms).emit('message:delete', messageId);
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

      // Disconnect handling
      socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id} (User: ${socket.data.userId})`);

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
}

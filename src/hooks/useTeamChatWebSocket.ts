import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Socket, io } from 'socket.io-client';

import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { MessageStreamData, PresenceData, ReadReceiptData, TypingData } from '@/types/redis';

interface UseTeamChatWebSocketProps {
  teamChatId: string;
  enabled?: boolean;
}

export const useTeamChatWebSocket = ({ teamChatId, enabled = true }: UseTeamChatWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanupRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(Date.now());

  const currentUser = useUserStore(userProfileSelectors.userProfile);

  // Store functions (stable refs)
  const {
    subscribeToChat,
    unsubscribeFromChat,
    removeMessage,
    updatePresence,
    updateTypingStatus,
    updateReadReceipts,
    batchUpdateMessages,
  } = useTeamChatStore();

  // Optimized socket config
  const socketConfig = useMemo(
    () => ({
      auth: { userId: currentUser?.id },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5, // Limit attempts instead of Infinity
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 45000, // Reduced from 120000
      autoConnect: false, // Manual connection control
      forceNew: false,
      closeOnBeforeunload: false,
      // Add ping/pong settings
      pingTimeout: 60000, // Match server or slightly less
      pingInterval: 25000, // Shorter than server's 60s
    }),
    [currentUser?.id],
  );

  const convertMessage = useCallback((m: any, teamChatId: string) => {
    try {
      const timestamp = typeof m.timestamp === 'number' ? m.timestamp : Date.parse(m.timestamp);
      const createdAt = new Date(timestamp);

      return {
        id: m.id,
        content: m.content || '',
        messageType: (m.type as 'user' | 'assistant' | 'system') ?? 'user',
        teamChatId,
        userId: m.userId,
        metadata: m.metadata || {},
        createdAt,
        updatedAt: createdAt,
        accessedAt: new Date(),
      };
    } catch (error) {
      console.error('Error converting message:', error, m);
      return null;
    }
  }, []);

  const isDuplicateMessage = useCallback((message: MessageStreamData, existingMessages: any[]) => {
    if (existingMessages.some((existing) => existing.id === message.id)) return true;
    if (message.metadata?.clientMessageId) {
      return existingMessages.some(
        (existing) => existing.metadata?.clientMessageId === message?.metadata?.clientMessageId,
      );
    }
    if (message.userId === 'assistant') {
      const messageTime = new Date(message.timestamp).getTime();
      return existingMessages.some((existing) => {
        if (existing.userId !== 'assistant') return false;
        const existingTime = existing.createdAt.getTime();
        return Math.abs(messageTime - existingTime) < 1000 && existing.content === message.content;
      });
    }
    return false;
  }, []);

  // Enhanced cleanup with better error handling
  const cleanup = useCallback(() => {
    if (isCleanupRef.current) return;
    isCleanupRef.current = true;

    // Clear all timers
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up socket
    if (socketRef.current) {
      try {
        socketRef.current.emit('room:leave', teamChatId);
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.error('Error during socket cleanup:', error);
      }
      socketRef.current = null;
    }

    if (currentUser?.id) {
      unsubscribeFromChat(teamChatId, currentUser.id);
    }
  }, [teamChatId, currentUser?.id, unsubscribeFromChat]);

  // Enhanced heartbeat with ping/pong monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      const socket = socketRef.current;
      if (!socket?.connected || isCleanupRef.current) return;

      // Check if we've received a recent pong
      const timeSinceLastPong = Date.now() - lastPongRef.current;
      if (timeSinceLastPong > 90000) { // 90 seconds without pong
        console.warn('⚠️ No pong received for 90s, forcing reconnection');
        socket.disconnect();
        return;
      }

      // Send heartbeat
      socket.emit('presence:heartbeat', teamChatId);
      
      // Send ping to test connection
      socket.volatile.emit('ping', Date.now());
    }, 30000); // 30 second intervals
  }, [teamChatId]);

  useEffect(() => {
    isCleanupRef.current = false;

    if (!enabled || !teamChatId || !currentUser?.id) {
      cleanup();
      return;
    }

    if (socketRef.current?.connected) {
      console.log('🔌 Reusing existing socket');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    console.log('🔌 Connecting socket to:', socketUrl);

    const socket = io(socketUrl, socketConfig);
    socketRef.current = socket;

    // --- Enhanced Event listeners ---
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      lastPongRef.current = Date.now(); // Reset pong timer
      
      socket.emit('room:join', teamChatId);
      subscribeToChat(teamChatId, currentUser.id);
      
      // Start heartbeat only after connection
      startHeartbeat();
    });

    socket.on('disconnect', (reason) => {
      console.warn('❌ Socket disconnected:', reason);
      
      // Clear heartbeat on disconnect
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // Handle different disconnect reasons
      if (reason === 'ping timeout') {
        console.warn('💔 Ping timeout detected - connection will auto-reconnect');
      } else if (reason === 'transport close' || reason === 'transport error') {
        console.warn('🔌 Transport issue - connection will auto-reconnect');
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      
      // Implement exponential backoff for connection errors
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isCleanupRef.current && !socket.connected) {
          console.log('🔄 Attempting manual reconnection...');
          socket.connect();
        }
      }, 5000);
    });

    socket.on('reconnect', (attempt) => {
      console.log('🔄 Socket reconnected after', attempt, 'attempts');
      lastPongRef.current = Date.now(); // Reset pong timer
      socket.emit('room:join', teamChatId);
    });

    // Add pong handler to track connection health
    socket.on('pong', (timestamp) => {
      lastPongRef.current = Date.now();
      const latency = Date.now() - timestamp;
      if (latency > 5000) { // Log high latency
        console.warn(`⚠️ High latency detected: ${latency}ms`);
      }
    });

    // --- Chat events (unchanged) ---
    socket.on('session:loaded', (data) => {
      if (!data.messages?.length) return;
      console.log('Session loaded', data.messages);
      const converted = data.messages
        .map((m: any) => convertMessage(m, teamChatId))
        .filter(Boolean)
        .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
      if (converted.length) {
        batchUpdateMessages(teamChatId, converted);
      }
    });

    socket.on('presence:list', (presence: Record<string, PresenceData>) => {
      updatePresence(teamChatId, presence);
    });

    socket.on('presence:update', (data: PresenceData) => {
      updatePresence(teamChatId, { [data.userId]: data });
    });

    socket.on('typing:start', (data: TypingData) => {
      updateTypingStatus(teamChatId, data.userId, true);
    });

    socket.on('typing:stop', (data: TypingData) => {
      updateTypingStatus(teamChatId, data.userId, false);
    });

    socket.on('receipt:list', (receipts: Record<string, ReadReceiptData>) => {
      updateReadReceipts(teamChatId, receipts);
    });

    socket.on('receipt:update', (data: ReadReceiptData & { teamId: string }) => {
      updateReadReceipts(teamChatId, { [data.userId]: data });
    });

    socket.on('message:new', (message: MessageStreamData) => {
      if (!message.id || message.teamId !== teamChatId) return;
      const existingMessages = useTeamChatStore.getState().messages[message.teamId] || [];
      if (isDuplicateMessage(message, existingMessages)) return;

      const msg = {
        id: message.id,
        content: message.content,
        messageType:
          message.userId === 'assistant'
            ? 'assistant'
            : message.type === 'message'
            ? 'user'
            : (message.type as 'user' | 'assistant' | 'system'),
        teamChatId: message.teamId,
        userId: message.userId,
        metadata: message.metadata || {},
        createdAt: new Date(message.timestamp),
        updatedAt: new Date(),
        accessedAt: new Date(),
      };
      batchUpdateMessages(message.teamId, [msg as any]);
    });

    socket.on('message:update', (data: { id: string; content: string }) => {
      const state = useTeamChatStore.getState();
      const existing = state.messages[teamChatId] || [];
      const idx = existing.findIndex((m) => m.id === data.id);
      if (idx !== -1) {
        const updated = { ...existing[idx], content: data.content, updatedAt: new Date() };
        batchUpdateMessages(teamChatId, [updated as any]);
      }
    });

    socket.on('message:delete', (id: string) => {
      removeMessage(teamChatId, id);
    });

    // Manual connection start
    socket.connect();

    return cleanup;
  }, [teamChatId, enabled, currentUser?.id, socketConfig, cleanup, startHeartbeat]);

  // --- API methods (enhanced) ---
  const api = useMemo(
    () => ({
      sendMessage: (
        content: string,
        type: 'user' | 'assistant' | 'system' = 'user',
        metadata?: any,
        messageId?: string,
      ) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          console.warn('Socket not connected, cannot send message');
          return false;
        }
        
        console.log('Sending message to WebSocket', content, type, metadata, messageId);
        socket.emit('message:send', {
          teamId: teamChatId,
          content,
          type,
          metadata: { ...metadata, ...(messageId && { clientMessageId: messageId }) },
        });
        return true;
      },

      startTyping: () => {
        const socket = socketRef.current;
        if (socket?.connected) {
          socket.emit('typing:start', teamChatId);
        }
      },
      
      stopTyping: () => {
        const socket = socketRef.current;
        if (socket?.connected) {
          socket.emit('typing:stop', teamChatId);
        }
      },

      updateReadReceipt: (lastReadMessageId: string) => {
        const socket = socketRef.current;
        if (socket?.connected) {
          socket.emit('receipt:update', { teamId: teamChatId, lastReadMessageId });
        }
      },

      isConnected: () => socketRef.current?.connected || false,

      forceReconnect: () => {
        const socket = socketRef.current;
        if (socket) {
          socket.disconnect();
          setTimeout(() => socket.connect(), 1000);
        }
      },

      getConnectionState: () => {
        const socket = socketRef.current;
        return {
          connected: socket?.connected || false,
          id: socket?.id,
          transport: socket?.io?.engine?.transport?.name,
          lastPong: new Date(lastPongRef.current).toISOString(),
          timeSinceLastPong: Date.now() - lastPongRef.current,
        };
      },
    }),
    [teamChatId],
  );

  return api;
};
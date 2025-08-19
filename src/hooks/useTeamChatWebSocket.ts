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

  // socket config (changes only if userId changes)
  const socketConfig = useMemo(
    () => ({
      auth: { userId: currentUser?.id },
      transports: ['polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 120000,
      autoConnect: true,
      forceNew:true,
      closeOnBeforeunload:true,
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

  const cleanup = useCallback(() => {
    if (isCleanupRef.current) return;
    isCleanupRef.current = true;

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

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
    // console.log('🔌 Connecting socket to:', socketUrl);

    const socket = io(socketUrl, socketConfig);
    socketRef.current = socket;

    // --- Event listeners ---
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      socket.emit('room:join', teamChatId);
      subscribeToChat(teamChatId, currentUser.id);

      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (socket.connected && !isCleanupRef.current) {
          socket.emit('presence:heartbeat', teamChatId);
        }
      }, 30000);
    });

    socket.on('disconnect', (reason) => {
      console.warn('❌ Socket disconnected:', reason);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    socket.on('reconnect', (attempt) => {
      console.log('🔄 Socket reconnected after', attempt, 'attempts');
      socket.emit('room:join', teamChatId);
    });

    // --- Chat events ---
    socket.on('session:loaded', (data) => {
      if (!data.messages?.length) return;
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

    socket.connect();


    // heartbeatRef.current = setInterval(() => {
    //   if (socket.connected && !isCleanupRef.current) {
    //     // Remove: socket.emit('ping');
    //     socket.emit('presence:heartbeat', teamChatId);
    //   }
    // }, 20000);
    return cleanup;
  }, [teamChatId, enabled, currentUser?.id, socketConfig, cleanup]);

  // --- API methods ---
  const api = useMemo(
    () => ({
      sendMessage: (
        content: string,
        type: 'user' | 'assistant' | 'system' = 'user',
        metadata?: any,
        messageId?: string,
      ) => {
        if (!socketRef.current?.connected) return false;
        socketRef.current.emit('message:send', {
          teamId: teamChatId,
          content,
          type,
          metadata: { ...metadata, ...(messageId && { clientMessageId: messageId }) },
        });
        return true;
      },

      startTyping: () => socketRef.current?.emit('typing:start', teamChatId),
      stopTyping: () => socketRef.current?.emit('typing:stop', teamChatId),

      updateReadReceipt: (lastReadMessageId: string) =>
        socketRef.current?.emit('receipt:update', { teamId: teamChatId, lastReadMessageId }),

      isConnected: () => socketRef.current?.connected || false,

      forceReconnect: () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          setTimeout(() => socketRef.current?.connect(), 1000);
        }
      },

      getConnectionState: () => ({
        connected: socketRef.current?.connected || false,
        id: socketRef.current?.id,
        transport: socketRef.current?.io?.engine?.transport?.name,
      }),
    }),
    [teamChatId],
  );

  return api;
};
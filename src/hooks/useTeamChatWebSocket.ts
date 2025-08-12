import { useEffect, useRef } from 'react';
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
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const {
    subscribeToChat,
    unsubscribeFromChat,
    upsertMessages,
    removeMessage,
    updatePresence,
    updateTypingStatus,
    updateReadReceipts,
  } = useTeamChatStore();

  useEffect(() => {
    if (!enabled || !teamChatId || !currentUser?.id) {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    console.log('🔌 Attempting WebSocket connection to:', socketUrl);

    // Initialize socket connection
    const socket = io(socketUrl, {
      auth: {
        userId: currentUser.id,
      },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      // prefer a single reconnectionAttempts value
      reconnectionDelay: 1000,
      timeout: 20000, // Connection timeout
      autoConnect: true, // Automatically connect on creation
      reconnectionAttempts: 10, // Increase max reconnection attempts
      reconnectionDelayMax: 10000, // Maximum delay between reconnection attempts
    });

    socketRef.current = socket;

    // Join the team chat room
    socket.emit('room:join', teamChatId);

    // Subscribe to chat updates
    subscribeToChat(teamChatId, currentUser.id);

    // Handle initial session load (hydration from Redis/DB)
    socket.on(
      'session:loaded',
      (data: { sessionId: string; messages: any[]; participants: string[]; status: string }) => {
        try {
          const converted = (data.messages || [])
            .map((m: any) => ({
              id: m.id,
              content: m.content,
              messageType: (m.type as 'user' | 'assistant' | 'system') ?? 'user',
              teamChatId,
              userId: m.userId,
              metadata: m.metadata || {},
              createdAt: new Date(
                typeof m.timestamp === 'number' ? m.timestamp : Date.parse(m.timestamp),
              ),
              updatedAt: new Date(
                typeof m.timestamp === 'number' ? m.timestamp : Date.parse(m.timestamp),
              ),
            }))
            .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
          if (converted.length) upsertMessages(teamChatId, converted);
        } catch (e) {
          console.error('Failed to process session:loaded payload', e);
        }
      },
    );

    // Handle presence updates
    socket.on('presence:list', (presence: Record<string, PresenceData>) => {
      console.log('📊 Received presence list:', presence);
      updatePresence(teamChatId, presence);
    });

    socket.on('presence:update', (data: PresenceData) => {
      console.log('👤 Presence update:', data);
      updatePresence(teamChatId, { [data.userId]: data });
    });

    // Handle typing indicators
    socket.on('typing:start', (data: TypingData) => {
      console.log('⌨️ Typing started:', data);
      updateTypingStatus(teamChatId, data.userId, true);
    });

    socket.on('typing:stop', (data: TypingData) => {
      console.log('⌨️ Typing stopped:', data);
      updateTypingStatus(teamChatId, data.userId, false);
    });

    // Handle read receipts
    socket.on('receipt:list', (receipts: Record<string, ReadReceiptData>) => {
      console.log('📖 Received read receipts:', receipts);
      updateReadReceipts(teamChatId, receipts);
    });

    socket.on('receipt:update', (data: ReadReceiptData & { teamId: string }) => {
      console.log('📖 Read receipt update:', data);
      updateReadReceipts(teamChatId, { [data.userId]: data });
    });

    // Handle new messages
    socket.on('message:new', (message: MessageStreamData) => {
      console.log('💬 New message received:', message);
      // Convert MessageStreamData to TeamChatMessageItem format
      const teamChatMessage = {
        id: message.id,
        content: message.content,
        messageType:
          message.type === 'message' ? 'user' : (message.type as 'user' | 'assistant' | 'system'),
        teamChatId: message.teamId,
        userId: message.userId,
        metadata: message.metadata || {},
        createdAt: new Date(message.timestamp),
        updatedAt: new Date(message.timestamp),
      };
      // Reconcile with any temp message by clientTempId
      const clientTempId = (message.metadata as any)?.clientTempId;
      if (clientTempId) {
        const state = useTeamChatStore.getState();
        const existing = state.messages[teamChatId] || [];
        const tempIndex = existing.findIndex((m: any) => m.id === clientTempId);
        if (tempIndex >= 0) {
          // Replace the temp message with server message id
          const replaced = [...existing];
          replaced[tempIndex] = {
            ...replaced[tempIndex],
            ...teamChatMessage,
            id: message.id,
          } as any;
          upsertMessages(teamChatId, replaced as any);
          return;
        }
      }
      upsertMessages(teamChatId, [teamChatMessage]);
    });

    // Handle message updates
    socket.on('message:update', (data: { id: string; content: string }) => {
      console.log('✏️ Message updated:', data);
      // Update the message in the store
      upsertMessages(teamChatId, [
        { id: data.id, content: data.content, updatedAt: new Date() } as any,
      ]);
    });

    // Handle message deletions
    socket.on('message:delete', (messageId: string) => {
      console.log('🗑️ Message deleted:', messageId);
      // Remove the message from the store
      removeMessage(teamChatId, messageId);
    });

    // Handle room errors
    socket.on('room:error', (error: string) => {
      console.error('❌ Room error:', error);
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected for team chat:', teamChatId);
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected from team chat:', teamChatId);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('Connection details:', {
        url: socketUrl,
        path: (socket.io as any)?.opts?.path,
        transports: (socket.io as any)?.opts?.transports,
        userId: currentUser.id,
        teamChatId,
        message: (error as any)?.message,
        name: (error as any)?.name,
      });

      // Check if this is a timeout error and provide helpful guidance
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ WebSocket server may not be running. Please ensure you have started the WebSocket server with: npm run dev:server',
        );
      }

      // Don't manually reconnect - let Socket.IO handle it with its built-in reconnection
      // The manual reconnection was causing issues with the connection state
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      // Rejoin the room after reconnection
      socket.emit('room:join', teamChatId);
    });

    // Periodic heartbeat to keep presence active while user is viewing the chat
    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('presence:heartbeat', teamChatId);
    }, 30000);

    socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
    });

    return () => {
      clearInterval(heartbeat);
      // Leave the room
      socket.emit('room:leave', teamChatId);

      // Unsubscribe from chat updates
      unsubscribeFromChat(teamChatId, currentUser.id);

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    teamChatId,
    enabled,
    currentUser?.id,
    // Removed store functions from dependencies as they are stable references
    // subscribeToChat,
    // unsubscribeFromChat,
    // updateMessages,
    // updatePresence,
    // updateTypingStatus,
    // updateReadReceipts,
  ]);

  // Return functions for sending messages and managing state
  return {
    sendMessage: (
      content: string,
      messageType: 'user' | 'assistant' | 'system' = 'user',
      metadata?: any,
    ) => {
      if (socketRef.current) {
        console.log('📤 Sending message via WebSocket:', { content, messageType, metadata });
        socketRef.current.emit('message:send', {
          teamId: teamChatId,
          content,
          type: messageType,
          metadata,
        });
      }
    },
    startTyping: () => {
      if (socketRef.current) {
        socketRef.current.emit('typing:start', teamChatId);
      }
    },
    stopTyping: () => {
      if (socketRef.current) {
        socketRef.current.emit('typing:stop', teamChatId);
      }
    },
    updateReadReceipt: (lastReadMessageId: string) => {
      if (socketRef.current) {
        socketRef.current.emit('receipt:update', {
          teamId: teamChatId,
          lastReadMessageId,
        });
      }
    },
    isConnected: () => socketRef.current?.connected || false,
  };
};

import { useCallback, useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';

import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

interface UseOptimizedTeamChatWebSocketProps {
  teamChatId: string;
  enabled?: boolean;
}

export const useOptimizedTeamChatWebSocket = ({
  teamChatId,
  enabled = true,
}: UseOptimizedTeamChatWebSocketProps) => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const {
    subscribeToChat,
    unsubscribeFromChat,
    updateMessages,
    updatePresence,
    updateTypingStatus,
    updateReadReceipts,
  } = useTeamChatStore();

  // Connection management
  const connect = useCallback(() => {
    if (!enabled || !teamChatId || !currentUser?.id) {
      return;
    }

    if (socketRef.current?.connected) {
      console.log('🔄 WebSocket already connected');
      return;
    }

    console.log(
      '🔌 Attempting WebSocket connection to:',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
    );

    // Initialize socket connection with optimized settings
    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001', {
      auth: {
        userId: currentUser.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      pingTimeout: 10000,
      pingInterval: 15000,
      upgradeTimeout: 30000,
      autoConnect: true,
      forceNew: false,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');

      // Join the team chat room
      socket.emit('room:join', teamChatId);

      // Subscribe to chat updates
      subscribeToChat(teamChatId, currentUser.id);

      // Start heartbeat
      startHeartbeat();
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      stopHeartbeat();

      // Handle reconnection for specific reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        setTimeout(() => {
          socket.connect();
        }, 1000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);

      // Check if this is a timeout error and provide helpful guidance
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ WebSocket server may not be running. Please ensure you have started the optimized WebSocket server.',
        );
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');

      // Rejoin the room after reconnection
      socket.emit('room:join', teamChatId);
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed after all attempts');
    });

    // Room event handlers
    socket.on('room:error', (message) => {
      console.error('❌ Room error:', message);
    });

    // Presence event handlers
    socket.on('presence:list', (presence: Record<string, any>) => {
      console.log('📊 Received presence list:', presence);
      updatePresence(teamChatId, presence);
    });

    socket.on('presence:update', (presence: any) => {
      console.log('👤 Presence update:', presence);
      updatePresence(teamChatId, { [presence.userId]: presence });
    });

    // Typing event handlers
    socket.on('typing:start', (data: any) => {
      console.log('⌨️ Typing started:', data);
      updateTypingStatus(teamChatId, data.userId, true);
    });

    socket.on('typing:stop', (data: any) => {
      console.log('⌨️ Typing stopped:', data);
      updateTypingStatus(teamChatId, data.userId, false);
    });

    // Read receipt event handlers
    socket.on('receipt:list', (receipts: Record<string, any>) => {
      console.log('📖 Received read receipts:', receipts);
      updateReadReceipts(teamChatId, receipts);
    });

    socket.on('receipt:update', (receipt: any) => {
      console.log('📖 Read receipt update:', receipt);
      updateReadReceipts(teamChatId, { [receipt.userId]: receipt });
    });

    // Message event handlers
    socket.on('message:new', (message: any) => {
      console.log('💬 New message received:', message);
      updateMessages(teamChatId, [message]);
    });

    // Heartbeat handler
    socket.on('heartbeat', () => {
      // Respond to heartbeat to keep connection alive
      socket.emit('heartbeat');
    });
  }, [
    teamChatId,
    enabled,
    currentUser?.id,
    subscribeToChat,
    updateMessages,
    updatePresence,
    updateTypingStatus,
    updateReadReceipts,
  ]);

  // Heartbeat management
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Disconnect management
  const disconnect = useCallback(() => {
    stopHeartbeat();

    if (socketRef.current) {
      // Leave the room
      socketRef.current.emit('room:leave', teamChatId);

      // Unsubscribe from chat updates
      unsubscribeFromChat(teamChatId, currentUser?.id || '');

      // Disconnect socket
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [teamChatId, currentUser?.id, unsubscribeFromChat, stopHeartbeat]);

  // Message sending
  const sendMessage = useCallback(
    (content: string, type = 'user', metadata = {}) => {
      if (!socketRef.current?.connected) {
        console.error('❌ Cannot send message: WebSocket not connected');
        return false;
      }

      try {
        socketRef.current.emit('message:send', {
          teamId: teamChatId,
          content,
          type,
          metadata,
        });
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }
    },
    [teamChatId],
  );

  // Typing indicators
  const startTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', teamChatId);
    }
  }, [teamChatId]);

  const stopTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:stop', teamChatId);
    }
  }, [teamChatId]);

  // Read receipts
  const updateReadReceipt = useCallback(
    (lastReadMessageId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('receipt:update', {
          teamId: teamChatId,
          lastReadMessageId,
        });
      }
    },
    [teamChatId],
  );

  // Connection status
  const isConnected = socketRef.current?.connected || false;

  // Setup and cleanup
  useEffect(() => {
    connect();

    return () => {
      disconnect();

      // Clear any pending timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    updateReadReceipt,
    connect,
    disconnect,
  };
};

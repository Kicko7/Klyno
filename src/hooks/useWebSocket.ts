import { useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';

import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

export const useWebSocket = (userId: string) => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || '', {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId]);

  return socketRef.current;
};

// Helper hook for room management
export const useWebSocketRoom = (socket: Socket | undefined, roomId: string) => {
  useEffect(() => {
    if (!socket || !roomId) return;

    // Join room
    socket.emit('room:join', roomId);

    // Cleanup
    return () => {
      socket.emit('room:leave', roomId);
    };
  }, [socket, roomId]);
};

// Helper hook for typing indicators
export const useWebSocketTyping = (socket: Socket | undefined, roomId: string) => {
  const startTyping = () => {
    if (!socket || !roomId) return;
    socket.emit('typing:start', roomId);
  };

  const stopTyping = () => {
    if (!socket || !roomId) return;
    socket.emit('typing:stop', roomId);
  };

  return { startTyping, stopTyping };
};

// Helper hook for read receipts
export const useWebSocketReadReceipts = (socket: Socket | undefined, roomId: string) => {
  const updateReadReceipt = (messageId: string) => {
    if (!socket || !roomId) return;
    socket.emit('receipt:update', {
      teamId: roomId,
      lastReadMessageId: messageId,
    });
  };

  return { updateReadReceipt };
};

// Helper hook for message events
export const useWebSocketMessages = (
  socket: Socket | undefined,
  roomId: string,
  onNewMessage?: (message: any) => void,
  onMessageUpdate?: (message: any) => void,
  onMessageDelete?: (messageId: string) => void,
) => {
  useEffect(() => {
    if (!socket || !roomId) return;

    if (onNewMessage) {
      socket.on('message:new', onNewMessage);
    }
    if (onMessageUpdate) {
      socket.on('message:update', onMessageUpdate);
    }
    if (onMessageDelete) {
      socket.on('message:delete', onMessageDelete);
    }

    return () => {
      if (onNewMessage) {
        socket.off('message:new', onNewMessage);
      }
      if (onMessageUpdate) {
        socket.off('message:update', onMessageUpdate);
      }
      if (onMessageDelete) {
        socket.off('message:delete', onMessageDelete);
      }
    };
  }, [socket, roomId, onNewMessage, onMessageUpdate, onMessageDelete]);

  const sendMessage = (content: string, type = 'message', metadata = {}) => {
    if (!socket || !roomId) return;
    socket.emit('message:send', {
      teamId: roomId,
      content,
      type,
      metadata,
    });
  };

  const editMessage = (messageId: string, content: string) => {
    if (!socket || !roomId) return;
    socket.emit('message:edit', messageId, content);
  };

  const deleteMessage = (messageId: string) => {
    if (!socket || !roomId) return;
    socket.emit('message:delete', messageId);
  };

  return { sendMessage, editMessage, deleteMessage };
};

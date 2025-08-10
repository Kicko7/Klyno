import { useCallback, useEffect, useRef, useState } from 'react';

import { Socket } from '@/types/socket';

const TYPING_TIMEOUT = 3000; // 3 seconds

export const useTypingIndicator = (socket: Socket | undefined, teamId: string) => {
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Handle typing events
  useEffect(() => {
    if (!socket || !teamId) return;

    const handleTypingStart = (data: { userId: string }) => {
      setTypingUsers((prev) => ({ ...prev, [data.userId]: true }));

      // Clear existing timeout
      if (typingTimeoutRef.current[data.userId]) {
        clearTimeout(typingTimeoutRef.current[data.userId]);
      }

      // Set new timeout
      typingTimeoutRef.current[data.userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const { [data.userId]: _, ...rest } = prev;
          return rest;
        });
        delete typingTimeoutRef.current[data.userId];
      }, TYPING_TIMEOUT);
    };

    const handleTypingStop = (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const { [data.userId]: _, ...rest } = prev;
        return rest;
      });

      // Clear timeout
      if (typingTimeoutRef.current[data.userId]) {
        clearTimeout(typingTimeoutRef.current[data.userId]);
        delete typingTimeoutRef.current[data.userId];
      }
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);

      // Clear all timeouts
      Object.values(typingTimeoutRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
      typingTimeoutRef.current = {};
    };
  }, [socket, teamId]);

  // Debounced typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef2 = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!socket || !teamId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', teamId);
    }

    // Clear existing timeout
    if (typingTimeoutRef2.current) {
      clearTimeout(typingTimeoutRef2.current);
    }

    // Set new timeout
    typingTimeoutRef2.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', teamId);
    }, TYPING_TIMEOUT);
  }, [socket, teamId, isTyping]);

  const stopTyping = useCallback(() => {
    if (!socket || !teamId || !isTyping) return;

    setIsTyping(false);
    socket.emit('typing:stop', teamId);

    if (typingTimeoutRef2.current) {
      clearTimeout(typingTimeoutRef2.current);
    }
  }, [socket, teamId, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef2.current) {
        clearTimeout(typingTimeoutRef2.current);
      }
    };
  }, []);

  return {
    typingUsers: Object.keys(typingUsers),
    isTyping,
    startTyping,
    stopTyping,
  };
};

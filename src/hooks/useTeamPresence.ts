import { useEffect } from 'react';
import { Socket } from 'socket.io-client';

import { useTeamPresenceStore } from '@/store/teamChat/presence';
import { PresenceData } from '@/types/redis';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

export const useTeamPresence = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined,
  teamId: string,
) => {
  const {
    setPresenceList,
    updatePresence,
    removePresence,
    setTyping,
    clearTyping,
    clearTeamPresence,
  } = useTeamPresenceStore();

  useEffect(() => {
    if (!socket || !teamId) return;

    // Handle presence list updates
    const handlePresenceList = (data: Record<string, PresenceData>) => {
      setPresenceList(teamId, data);
    };

    // Handle individual presence updates
    const handlePresenceUpdate = (data: PresenceData) => {
      if (data.isActive) {
        updatePresence(teamId, data);
      } else {
        removePresence(teamId, data.userId);
      }
    };

    // Handle typing indicators
    const handleTypingStart = (data: { userId: string }) => {
      setTyping(teamId, data.userId, true);
    };

    const handleTypingStop = (data: { userId: string }) => {
      setTyping(teamId, data.userId, false);
    };

    // Subscribe to events
    socket.on('presence:list', handlePresenceList);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    // Cleanup
    return () => {
      socket.off('presence:list', handlePresenceList);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      clearTeamPresence(teamId);
    };
  }, [socket, teamId]);

  return {
    clearTyping: () => clearTyping(teamId),
  };
};

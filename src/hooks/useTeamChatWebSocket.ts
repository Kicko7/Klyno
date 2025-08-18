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
    removeMessage,
    updatePresence,
    updateTypingStatus,
    updateReadReceipts,
    batchUpdateMessages,
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
    console.log(`🚪 Joining WebSocket room: ${teamChatId}`);

    // Subscribe to chat updates
    subscribeToChat(teamChatId, currentUser.id);
    console.log(`📡 Subscribed to chat updates for: ${teamChatId}`);

    // Handle initial session load (hydration from Redis/DB)
    socket.on(
      'session:loaded',
      (data: { sessionId: string; messages: any[]; participants: string[]; status: string }) => {
        try {
          // console.log(`📥 Session loaded for room ${teamChatId}:`, {
          //   sessionId: data.sessionId,
          //   messageCount: data.messages?.length || 0,
          //   participants: data.participants?.length || 0,
          //   status: data.status,
          // });

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
              accessedAt: new Date(), // Add missing required field
            }))
            .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

          if (converted.length) {
            console.log(`🔄 Processing ${converted.length} messages from session load`);
            batchUpdateMessages(teamChatId, converted);
          }
        } catch (e) {
          console.error('Failed to process session:loaded payload', e);
        }
      },
    );

    // Handle presence updates
    socket.on('presence:list', (presence: Record<string, PresenceData>) => {
      // console.log('📊 Received presence list:', presence);
      updatePresence(teamChatId, presence);
    });

    socket.on('presence:update', (data: PresenceData) => {
      // console.log('👤 Presence update:', data);
      updatePresence(teamChatId, { [data.userId]: data });
    });

    // Handle typing indicators
    socket.on('typing:start', (data: TypingData) => {
      // console.log('⌨️ Typing started:', data);
      updateTypingStatus(teamChatId, data.userId, true);
    });

    socket.on('typing:stop', (data: TypingData) => {
      // console.log('⌨️ Typing stopped:', data);
      updateTypingStatus(teamChatId, data.userId, false);
    });

    // Handle read receipts
    socket.on('receipt:list', (receipts: Record<string, ReadReceiptData>) => {
      // console.log('📖 Received read receipts:', receipts);
      updateReadReceipts(teamChatId, receipts);
    });

    socket.on('receipt:update', (data: ReadReceiptData & { teamId: string }) => {
      // console.log('📖 Read receipt update:', data);
      updateReadReceipts(teamChatId, { [data.userId]: data });
    });

    // Handle new messages
    socket.on('message:new', (message: MessageStreamData) => {
      // console.log('💬 New message received:', {
      //   id: message.id,
      //   type: message.type,
      //   userId: message.userId,
      //   teamId: message.teamId,
      //   contentLength: message.content.length,
      //   timestamp: message.timestamp,
      //   metadata: message.metadata,
      //   isAIMessage: message.userId === 'assistant',
      //   hasClientMessageId: !!message.metadata?.clientMessageId,
      // });

      // Convert MessageStreamData to TeamChatMessageItem format
      const teamChatMessage = {
        id: message.id,
        content: message.content,
        messageType: (() => {
          // Determine message type based on userId and metadata
          if (message.userId === 'assistant') {
            return 'assistant';
          }
          if (message.type === 'message') {
            return 'user';
          }
          return message.type as 'user' | 'assistant' | 'system';
        })(),
        teamChatId: message.teamId,
        userId: message.userId,
        metadata: message.metadata || {},
        createdAt: new Date(message.timestamp),
        updatedAt: new Date(),
        accessedAt: new Date(), // Add missing required field
      };

      // console.log(`🔄 Converting message to TeamChatMessageItem:`, {
      //   originalId: message.id,
      //   convertedId: teamChatMessage.id,
      //   messageType: teamChatMessage.messageType,
      //   userId: teamChatMessage.userId,
      //   isAIMessage: message.userId === 'assistant',
      //   clientMessageId: message.metadata?.clientMessageId,
      // });

      // Enhanced deduplication: Check for messages with similar content and metadata
      const existingMessages = useTeamChatStore.getState().messages[message.teamId] || [];
      console.log(
        `🔍 Checking for duplicates. Existing messages: ${existingMessages.length}, New message ID: ${message.id}, User: ${message.userId}`,
      );

      const isDuplicate = existingMessages.some((existing) => {
        // First priority: Check for exact ID match (most reliable)
        if (existing.id === message.id) {
          console.log(`🔄 Detected duplicate by exact ID: ${message.id}`);
          return true;
        }

        // Second priority: Check if we have a message with the same clientMessageId in metadata
        if (message.metadata?.clientMessageId && existing.metadata?.clientMessageId) {
          if (message.metadata.clientMessageId === existing.metadata.clientMessageId) {
            console.log(
              `🔄 Detected duplicate by clientMessageId: ${message.metadata.clientMessageId}`,
            );
            return true;
          }
        }

        // Third priority: For AI messages, check if we have a message with the same ID pattern
        if (message.userId === 'assistant' && existing.userId === 'assistant') {
          // Check if the message ID follows the same pattern (assistant_timestamp_nanoid)
          const messageIdPattern = message.id.match(/^assistant_(\d+)_(.+)$/);
          const existingIdPattern = existing.id.match(/^assistant_(\d+)_(.+)$/);

          if (messageIdPattern && existingIdPattern) {
            const messageTimestamp = parseInt(messageIdPattern[1]);
            const existingTimestamp = parseInt(existingIdPattern[1]);
            const messageNanoid = messageIdPattern[2];
            const existingNanoid = existingIdPattern[2];

            // If timestamps are very close (within 1 second) and content is similar, it's likely a duplicate
            if (
              Math.abs(messageTimestamp - existingTimestamp) < 1000 &&
              (existing.content.includes(message.content) ||
                message.content.includes(existing.content))
            ) {
              console.log(
                `🔄 Detected duplicate AI message by timestamp pattern: ${message.id} vs ${existing.id}`,
              );
              console.log(`   Timestamp diff: ${Math.abs(messageTimestamp - existingTimestamp)}ms`);
              console.log(
                `   Content similarity check: existing="${existing.content.substring(0, 50)}..." vs new="${message.content.substring(0, 50)}..."`,
              );
              return true;
            }
          }
        }

        // Fourth priority: Check if this is likely a duplicate based on content and metadata
        const contentMatch = existing.content === message.content;
        const metadataMatch =
          JSON.stringify(existing.metadata) === JSON.stringify(message.metadata);
        const timeMatch =
          Math.abs(existing.createdAt.getTime() - new Date(message.timestamp).getTime()) < 5000; // Within 5 seconds

        // If content, metadata, and time are very similar, it's likely a duplicate
        if (contentMatch && metadataMatch && timeMatch) {
          console.log(
            `🔄 Detected duplicate message: ${message.id} matches existing ${existing.id}`,
          );
          return true;
        }

        // Fifth priority: For AI messages, check if content is identical and timestamps are very close
        if (message.userId === 'assistant' && existing.userId === 'assistant') {
          const contentIdentical = existing.content === message.content;
          const timeVeryClose =
            Math.abs(existing.createdAt.getTime() - new Date(message.timestamp).getTime()) < 2000; // Within 2 seconds

          if (contentIdentical && timeVeryClose) {
            console.log(
              `🔄 Detected duplicate AI message by content and time: ${message.id} vs ${existing.id}`,
            );
            return true;
          }
        }

        return false;
      });

      if (isDuplicate) {
        console.log(`🚫 Skipping duplicate message: ${message.id}`);
        return;
      }

      console.log(`✅ Processing new message: ${message.id} for team chat: ${message.teamId}`);
      console.log(
        `   Message type: ${teamChatMessage.messageType}, User: ${teamChatMessage.userId}`,
      );
      console.log(`   Content preview: "${teamChatMessage.content.substring(0, 100)}..."`);

      // Use the centralized batch update method to handle message reconciliation
      // This will automatically handle duplicates and maintain proper ordering
      batchUpdateMessages(message.teamId, [teamChatMessage as any]);

      console.log(`✅ Message ${message.id} successfully processed and added to store`);
    });

    // Handle message updates
    socket.on('message:update', (data: { id: string; content: string }) => {
      console.log('✏️ Message updated:', data);
      // Update the message in the store using centralized method
      const state = useTeamChatStore.getState();
      const existing = state.messages[teamChatId] || [];
      const messageIndex = existing.findIndex((m) => m.id === data.id);

      if (messageIndex !== -1) {
        const updatedMessage = {
          ...existing[messageIndex],
          content: data.content,
          updatedAt: new Date(),
        };
        batchUpdateMessages(teamChatId, [updatedMessage as any]);
      }
    });

    // Handle message deletions
    socket.on('message:delete', (messageId: string) => {
      console.log('🗑️ Message deleted:', messageId);
      // Remove the message from the store using centralized method
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
      messageId?: string,
    ) => {
      if (socketRef.current) {
        const messageMetadata = {
          ...metadata,
          ...(messageId && { clientMessageId: messageId }),
        };
        console.log('📤 Sending message via WebSocket:', {
          content,
          messageType,
          messageMetadata,
          messageId,
        });
        socketRef.current.emit('message:send', {
          teamId: teamChatId,
          content,
          type: messageType,
          metadata: messageMetadata,
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

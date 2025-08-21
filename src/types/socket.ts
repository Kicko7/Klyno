import { Server } from 'socket.io';

import { MessageStreamData, PresenceData, ReadReceiptData, TypingData } from './redis';

export interface ServerToClientEvents {
  'presence:list': (data: Record<string, PresenceData>) => void;
  'presence:update': (data: PresenceData) => void;
  'typing:start': (data: TypingData) => void;
  'typing:stop': (data: TypingData) => void;
  'receipt:list': (data: Record<string, ReadReceiptData>) => void;
  'receipt:update': (data: ReadReceiptData & { teamId: string }) => void;
  'message:new': (data: MessageStreamData) => void;
  'room:error': (message: string) => void;
  'session:loaded': (data: {
    sessionId: string;
    messages: any[];
    participants: string[];
    status: string;
  }) => void;
  'message:update': (data: { id: string; content: string }) => void;
  'message:delete': (messageId: string) => void;
  'message:error': (data: {
    teamId: string;
    userId: string;
    error: string;
    timestamp: string;
  }) => void;
  'user:credits': (data: { userId: string; credits: number; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'message:send': (data: {
    teamId: string;
    content: string;
    type?: 'user' | 'assistant' | 'system';
    metadata?: Record<string, unknown>;
  }) => void;
  'message:edit': (messageId: string, content: string) => void;
  'message:delete': (messageId: string) => void;
  'typing:start': (teamId: string) => void;
  'typing:stop': (teamId: string) => void;
  'receipt:update': (data: { teamId: string; lastReadMessageId: string }) => void;
  'presence:heartbeat': (teamId: string) => void;
  'user:credits:request': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  activeRooms: Set<string>;
}

export type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

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
}

export interface ClientToServerEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'message:send': (data: { teamId: string; content: string }) => void;
  'message:edit': (messageId: string, content: string) => void;
  'message:delete': (messageId: string) => void;
  'typing:start': (teamId: string) => void;
  'typing:stop': (teamId: string) => void;
  'receipt:update': (data: { teamId: string; lastReadMessageId: string }) => void;
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

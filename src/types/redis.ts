import { z } from 'zod';

// Presence Schema
export const PresenceSchema = z.object({
  userId: z.string(),
  lastActiveAt: z.string(),
  isActive: z.boolean(),
  lastSeenMessageId: z.string().optional(),
});

export type PresenceData = z.infer<typeof PresenceSchema>;

// Typing Indicator Schema
export const TypingSchema = z.object({
  userId: z.string(),
  timestamp: z.string(),
});

export type TypingData = z.infer<typeof TypingSchema>;

// Read Receipt Schema
export const ReadReceiptSchema = z.object({
  userId: z.string(),
  lastReadMessageId: z.string(),
  timestamp: z.string(),
  teamId: z.string().optional(), // Make teamId optional in the schema
});

export type ReadReceiptData = z.infer<typeof ReadReceiptSchema>;

// Credit Usage Schema
export const CreditUsageSchema = z.object({
  userId: z.string(),
  messageId: z.string(),
  credits: z.number(),
  timestamp: z.string(),
  syncedToDb: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreditUsage = z.infer<typeof CreditUsageSchema>;

// Message Stream Schema
export const MessageStreamSchema = z.object({
  id: z.string(),
  content: z.string(),
  userId: z.string(),
  teamId: z.string(),
  timestamp: z.string(),
  type: z.enum(['message', 'presence', 'typing', 'read_receipt']).default('message'),
  metadata: z.record(z.unknown()).optional(),
});

export type MessageStreamData = z.infer<typeof MessageStreamSchema>;

// Redis Key Types
export enum RedisKeyType {
  PRESENCE = 'presence',
  TYPING = 'typing',
  READ_RECEIPTS = 'read_receipts',
  CREDITS = 'credits',
  ACTIVE_MESSAGES = 'active_messages',
  MESSAGE_STREAM = 'message_stream',
}

// Redis Key TTL (in seconds)
export const RedisTTL: Record<RedisKeyType, number> = {
  [RedisKeyType.PRESENCE]: 120, // 2 minutes
  [RedisKeyType.TYPING]: 30, // 30 seconds
  [RedisKeyType.READ_RECEIPTS]: 86400, // 24 hours
  [RedisKeyType.CREDITS]: 3600, // 1 hour
  [RedisKeyType.ACTIVE_MESSAGES]: 3600, // 1 hour
  [RedisKeyType.MESSAGE_STREAM]: 86400, // 24 hours
};

// Redis Key Builder
export const RedisKeyBuilder: Record<RedisKeyType, (id: string) => string> = {
  [RedisKeyType.PRESENCE]: (teamId) => `team:${teamId}:presence`,
  [RedisKeyType.TYPING]: (teamId) => `team:${teamId}:typing`,
  [RedisKeyType.READ_RECEIPTS]: (teamId) => `team:${teamId}:read_receipts`,
  [RedisKeyType.CREDITS]: (userId) => `user:${userId}:credits`,
  [RedisKeyType.ACTIVE_MESSAGES]: (teamId) => `team:${teamId}:active_messages`,
  [RedisKeyType.MESSAGE_STREAM]: (teamId) => `team:${teamId}:message_stream`,
};

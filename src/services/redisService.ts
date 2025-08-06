import { Redis, ScanCommandOptions } from '@upstash/redis';

import {
  CreditUsage,
  CreditUsageSchema,
  MessageStreamData,
  MessageStreamSchema,
  PresenceData,
  PresenceSchema,
  ReadReceiptData,
  ReadReceiptSchema,
  RedisKeyBuilder,
  RedisKeyType,
  RedisTTL,
  TypingData,
  TypingSchema,
} from '@/types/redis';

export class RedisService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Presence Management
  async updatePresence(teamId: string, data: PresenceData): Promise<void> {
    const validatedData = PresenceSchema.parse(data);
    const key = RedisKeyBuilder[RedisKeyType.PRESENCE](teamId);
    await this.redis.hset(key, { [validatedData.userId]: JSON.stringify(validatedData) });
    await this.redis.expire(key, RedisTTL[RedisKeyType.PRESENCE]);
  }

  async getPresence(teamId: string): Promise<Record<string, PresenceData>> {
    const key = RedisKeyBuilder[RedisKeyType.PRESENCE](teamId);
    const data = await this.redis.hgetall<Record<string, string>>(key);
    return Object.entries(data || {}).reduce(
      (acc, [userId, value]) => {
        if (typeof value === 'string') {
          acc[userId] = PresenceSchema.parse(JSON.parse(value));
        }
        return acc;
      },
      {} as Record<string, PresenceData>,
    );
  }

  // Typing Indicators
  async setTyping(teamId: string, data: TypingData): Promise<void> {
    const validatedData = TypingSchema.parse(data);
    const key = RedisKeyBuilder[RedisKeyType.TYPING](teamId);
    await this.redis.hset(key, { [validatedData.userId]: JSON.stringify(validatedData) });
    await this.redis.expire(key, RedisTTL[RedisKeyType.TYPING]);
  }

  async getTyping(teamId: string): Promise<Record<string, TypingData>> {
    const key = RedisKeyBuilder[RedisKeyType.TYPING](teamId);
    const data = await this.redis.hgetall<Record<string, string>>(key);
    return Object.entries(data || {}).reduce(
      (acc, [userId, value]) => {
        if (typeof value === 'string') {
          acc[userId] = TypingSchema.parse(JSON.parse(value));
        }
        return acc;
      },
      {} as Record<string, TypingData>,
    );
  }

  // Read Receipts
  async updateReadReceipt(teamId: string, data: ReadReceiptData): Promise<void> {
    const validatedData = ReadReceiptSchema.parse(data);
    const key = RedisKeyBuilder[RedisKeyType.READ_RECEIPTS](teamId);
    await this.redis.hset(key, { [validatedData.userId]: JSON.stringify(validatedData) });
  }

  async getReadReceipts(teamId: string): Promise<Record<string, ReadReceiptData>> {
    const key = RedisKeyBuilder[RedisKeyType.READ_RECEIPTS](teamId);
    const data = await this.redis.hgetall<Record<string, string>>(key);
    return Object.entries(data || {}).reduce(
      (acc, [userId, value]) => {
        if (typeof value === 'string') {
          acc[userId] = ReadReceiptSchema.parse(JSON.parse(value));
        }
        return acc;
      },
      {} as Record<string, ReadReceiptData>,
    );
  }

  // Credit Management
  async trackCredits(userId: string, usage: CreditUsage): Promise<void> {
    const validatedUsage = CreditUsageSchema.parse(usage);
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);
    await this.redis.hset(key, { [validatedUsage.messageId]: JSON.stringify(validatedUsage) });
    await this.redis.expire(key, RedisTTL[RedisKeyType.CREDITS]);
  }

  async getUnsyncedCredits(userId: string): Promise<CreditUsage[]> {
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);
    const data = await this.redis.hgetall<Record<string, string>>(key);
    return Object.values(data || {})
      .map((value) => CreditUsageSchema.parse(JSON.parse(value)) as CreditUsage)
      .filter((usage) => !usage.syncedToDb);
  }

  async markCreditsSynced(userId: string, messageIds: string[]): Promise<void> {
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);
    for (const messageId of messageIds) {
      const usage = await this.redis.hget<string>(key, messageId);
      if (usage) {
        const data = CreditUsageSchema.parse(JSON.parse(usage));
        data.syncedToDb = true;
        await this.redis.hset(key, { [messageId]: JSON.stringify(data) });
      }
    }
  }

  // Active Messages Cache
  async cacheActiveMessages(teamId: string, messages: MessageStreamData[]): Promise<void> {
    const validatedMessages = messages.map((m) => MessageStreamSchema.parse(m));
    const key = RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId);
    await this.redis.del(key);
    await this.redis.rpush(key, ...validatedMessages.map((m) => JSON.stringify(m)));
    await this.redis.expire(key, RedisTTL[RedisKeyType.ACTIVE_MESSAGES]);
  }

  async getActiveMessages(teamId: string): Promise<MessageStreamData[]> {
    const key = RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId);
    const messages = await this.redis.lrange(key, 0, -1);
    return messages.map((m: string) => MessageStreamSchema.parse(JSON.parse(m)));
  }

  // Message Streaming
  async addToMessageStream(teamId: string, message: MessageStreamData): Promise<string> {
    const validatedMessage = MessageStreamSchema.parse(message);
    const key = RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId);
    const id = await this.redis.xadd(key, '*', { message: JSON.stringify(validatedMessage) });
    await this.redis.expire(key, RedisTTL[RedisKeyType.MESSAGE_STREAM]);
    return id;
  }

  async getMessageStream(
    teamId: string,
    lastId = '0-0',
    count = 50,
  ): Promise<[string, MessageStreamData][]> {
    const key = RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId);
    const messages = await this.redis.xrange(key, lastId, '+');
    return (messages as unknown as [string, { message: string }][])
      .slice(0, count)
      .map(([id, data]) => [id, MessageStreamSchema.parse(JSON.parse(data.message))]);
  }

  // Key Management
  async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const options: ScanCommandOptions = { match: pattern, count: 100 };
      const [nextCursor, matchedKeys] = await this.redis.scan(cursor, options);
      cursor = nextCursor;
      keys.push(...(matchedKeys as string[]));
    } while (cursor !== '0');
    return keys;
  }

  // Cleanup
  async cleanup(teamId: string): Promise<void> {
    const keys = [
      RedisKeyBuilder[RedisKeyType.PRESENCE](teamId),
      RedisKeyBuilder[RedisKeyType.TYPING](teamId),
      RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId),
      RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId),
    ];
    await this.redis.del(...keys);
  }
}

import { Redis, ScanCommandOptions } from '@upstash/redis';
import { EventEmitter } from 'events';
import { setTimeout as sleep } from 'timers/promises';

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

interface BatchOperation {
  type: 'set' | 'del' | 'expire';
  key: string;
  value?: any;
  ttl?: number;
}

interface ConnectionHealth {
  isConnected: boolean;
  lastPing: number;
  errorCount: number;
  reconnectAttempts: number;
}

export class OptimizedRedisService extends EventEmitter {
  private redis: Redis;
  private health: ConnectionHealth;
  private batchQueue: BatchOperation[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchSize: number = 50;
  private batchInterval: number = 100; // ms
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // ms

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.health = {
      isConnected: true,
      lastPing: Date.now(),
      errorCount: 0,
      reconnectAttempts: 0,
    };

    this.startHealthCheck();
  }

  private async startHealthCheck() {
    setInterval(async () => {
      try {
        await this.redis.ping();
        this.health.isConnected = true;
        this.health.lastPing = Date.now();
        this.health.errorCount = 0;
        this.emit('health:connected');
      } catch (error) {
        this.health.isConnected = false;
        this.health.errorCount++;
        this.emit('health:disconnected', error);

        if (this.health.errorCount > 5) {
          await this.handleReconnection();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async handleReconnection() {
    if (this.health.reconnectAttempts >= 5) {
      this.emit('health:max_reconnect_attempts');
      return;
    }

    this.health.reconnectAttempts++;
    console.log(`Attempting Redis reconnection (${this.health.reconnectAttempts}/5)`);

    try {
      // Wait before reconnection attempt
      await sleep(this.retryDelay * this.health.reconnectAttempts);

      // Try to reconnect
      await this.redis.ping();
      this.health.isConnected = true;
      this.health.reconnectAttempts = 0;
      this.health.errorCount = 0;
      console.log('✅ Redis reconnection successful');
      this.emit('health:reconnected');
    } catch (error) {
      console.error('❌ Redis reconnection failed:', error);
      this.emit('health:reconnection_failed', error);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Redis operation failed (attempt ${attempt}/${this.retryAttempts}):`, error);

        if (attempt < this.retryAttempts) {
          await sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  private queueBatchOperation(operation: BatchOperation) {
    this.batchQueue.push(operation);

    if (this.batchQueue.length >= this.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushBatch(), this.batchInterval);
    }
  }

  private async flushBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchQueue.length === 0) return;

    const operations = [...this.batchQueue];
    this.batchQueue = [];

    try {
      await this.executeWithRetry(async () => {
        const pipeline = this.redis.pipeline();

        for (const op of operations) {
          switch (op.type) {
            case 'set':
              if (op.ttl) {
                pipeline.setex(op.key, op.ttl, JSON.stringify(op.value));
              } else {
                pipeline.set(op.key, JSON.stringify(op.value));
              }
              break;
            case 'del':
              pipeline.del(op.key);
              break;
            case 'expire':
              pipeline.expire(op.key, op.ttl!);
              break;
          }
        }

        await pipeline.exec();
      });

      this.emit('batch:success', operations.length);
    } catch (error) {
      console.error('Batch operation failed:', error);
      this.emit('batch:error', error);

      // Re-queue failed operations
      this.batchQueue.unshift(...operations);
    }
  }

  // Presence Management with batching
  async updatePresence(teamId: string, data: PresenceData): Promise<void> {
    const validatedData = PresenceSchema.parse(data);
    const key = RedisKeyBuilder[RedisKeyType.PRESENCE](teamId);

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, { [validatedData.userId]: JSON.stringify(validatedData) });
      await this.redis.expire(key, RedisTTL[RedisKeyType.PRESENCE]);
    });
  }

  async updatePresenceBatch(teamId: string, dataArray: PresenceData[]): Promise<void> {
    const key = RedisKeyBuilder[RedisKeyType.PRESENCE](teamId);
    const validatedData = dataArray.map((data) => PresenceSchema.parse(data));

    const hashData = validatedData.reduce(
      (acc, data) => {
        acc[data.userId] = JSON.stringify(data);
        return acc;
      },
      {} as Record<string, string>,
    );

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, hashData);
      await this.redis.expire(key, RedisTTL[RedisKeyType.PRESENCE]);
    });
  }

  async getPresence(teamId: string): Promise<Record<string, PresenceData>> {
    const key = RedisKeyBuilder[RedisKeyType.PRESENCE](teamId);

    return await this.executeWithRetry(async () => {
      const data = await this.redis.hgetall<Record<string, string>>(key);
      return Object.entries(data || {}).reduce(
        (acc, [userId, value]) => {
          if (typeof value === 'string') {
            try {
              acc[userId] = PresenceSchema.parse(JSON.parse(value));
            } catch (error) {
              console.warn(`Invalid presence data for user ${userId}:`, error);
            }
          }
          return acc;
        },
        {} as Record<string, PresenceData>,
      );
    });
  }

  // Typing Indicators with batching
  async setTyping(teamId: string, data: TypingData): Promise<void> {
    const validatedData = TypingSchema.parse(data);
    const key = RedisKeyBuilder[RedisKeyType.TYPING](teamId);

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, { [validatedData.userId]: JSON.stringify(validatedData) });
      await this.redis.expire(key, RedisTTL[RedisKeyType.TYPING]);
    });
  }

  async getTyping(teamId: string): Promise<Record<string, TypingData>> {
    const key = RedisKeyBuilder[RedisKeyType.TYPING](teamId);

    return await this.executeWithRetry(async () => {
      const data = await this.redis.hgetall<Record<string, string>>(key);
      return Object.entries(data || {}).reduce(
        (acc, [userId, value]) => {
          if (typeof value === 'string') {
            try {
              acc[userId] = TypingSchema.parse(JSON.parse(value));
            } catch (error) {
              console.warn(`Invalid typing data for user ${userId}:`, error);
            }
          }
          return acc;
        },
        {} as Record<string, TypingData>,
      );
    });
  }

  // Read Receipts with batching
  async updateReadReceipt(teamId: string, data: ReadReceiptData): Promise<void> {
    const validatedData = ReadReceiptSchema.parse(data);
    const key = RedisKeyBuilder[RedisKeyType.READ_RECEIPTS](teamId);

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, { [validatedData.userId]: JSON.stringify(validatedData) });
    });
  }

  async updateReadReceiptBatch(teamId: string, dataArray: ReadReceiptData[]): Promise<void> {
    const key = RedisKeyBuilder[RedisKeyType.READ_RECEIPTS](teamId);
    const validatedData = dataArray.map((data) => ReadReceiptSchema.parse(data));

    const hashData = validatedData.reduce(
      (acc, data) => {
        acc[data.userId] = JSON.stringify(data);
        return acc;
      },
      {} as Record<string, string>,
    );

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, hashData);
    });
  }

  async getReadReceipts(teamId: string): Promise<Record<string, ReadReceiptData>> {
    const key = RedisKeyBuilder[RedisKeyType.READ_RECEIPTS](teamId);

    return await this.executeWithRetry(async () => {
      const data = await this.redis.hgetall<Record<string, string>>(key);
      return Object.entries(data || {}).reduce(
        (acc, [userId, value]) => {
          if (typeof value === 'string') {
            try {
              acc[userId] = ReadReceiptSchema.parse(JSON.parse(value));
            } catch (error) {
              console.warn(`Invalid read receipt data for user ${userId}:`, error);
            }
          }
          return acc;
        },
        {} as Record<string, ReadReceiptData>,
      );
    });
  }

  // Credit Management with batching and atomic operations
  async trackCredits(userId: string, usage: CreditUsage): Promise<void> {
    const validatedUsage = CreditUsageSchema.parse(usage);
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, { [validatedUsage.messageId]: JSON.stringify(validatedUsage) });
      await this.redis.expire(key, RedisTTL[RedisKeyType.CREDITS]);
    });
  }

  async trackCreditsBatch(userId: string, usages: CreditUsage[]): Promise<void> {
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);
    const validatedUsages = usages.map((usage) => CreditUsageSchema.parse(usage));

    const hashData = validatedUsages.reduce(
      (acc, usage) => {
        acc[usage.messageId] = JSON.stringify(usage);
        return acc;
      },
      {} as Record<string, string>,
    );

    await this.executeWithRetry(async () => {
      await this.redis.hset(key, hashData);
      await this.redis.expire(key, RedisTTL[RedisKeyType.CREDITS]);
    });
  }

  async getUnsyncedCredits(userId: string): Promise<CreditUsage[]> {
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);

    return await this.executeWithRetry(async () => {
      const data = await this.redis.hgetall<Record<string, string>>(key);
      return Object.values(data || {})
        .map((value) => {
          try {
            return CreditUsageSchema.parse(JSON.parse(value)) as CreditUsage;
          } catch (error) {
            console.warn(`Invalid credit usage data:`, error);
            return null;
          }
        })
        .filter((usage): usage is CreditUsage => usage !== null && !usage.syncedToDb);
    });
  }

  async markCreditsSynced(userId: string, messageIds: string[]): Promise<void> {
    const key = RedisKeyBuilder[RedisKeyType.CREDITS](userId);

    await this.executeWithRetry(async () => {
      const pipeline = this.redis.pipeline();

      for (const messageId of messageIds) {
        const usage = await this.redis.hget<string>(key, messageId);
        if (usage) {
          try {
            const data = CreditUsageSchema.parse(JSON.parse(usage));
            data.syncedToDb = true;
            pipeline.hset(key, { [messageId]: JSON.stringify(data) });
          } catch (error) {
            console.warn(`Invalid credit usage data for message ${messageId}:`, error);
          }
        }
      }

      await pipeline.exec();
    });
  }

  // Active Messages Cache with compression
  async cacheActiveMessages(teamId: string, messages: MessageStreamData[]): Promise<void> {
    const validatedMessages = messages.map((m) => MessageStreamSchema.parse(m));
    const key = RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId);

    await this.executeWithRetry(async () => {
      await this.redis.del(key);
      if (validatedMessages.length > 0) {
        await this.redis.rpush(key, ...validatedMessages.map((m) => JSON.stringify(m)));
      }
      await this.redis.expire(key, RedisTTL[RedisKeyType.ACTIVE_MESSAGES]);
    });
  }

  async getActiveMessages(teamId: string): Promise<MessageStreamData[]> {
    const key = RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId);

    return await this.executeWithRetry(async () => {
      const messages = await this.redis.lrange(key, 0, -1);
      return messages
        .map((m: string) => {
          try {
            return MessageStreamSchema.parse(JSON.parse(m));
          } catch (error) {
            console.warn(`Invalid message data:`, error);
            return null;
          }
        })
        .filter((msg): msg is MessageStreamData => msg !== null);
    });
  }

  // Message Streaming with optimized batch processing
  async addToMessageStream(teamId: string, message: MessageStreamData): Promise<string> {
    const validatedMessage = MessageStreamSchema.parse(message);
    const key = RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId);

    return await this.executeWithRetry(async () => {
      const id = await this.redis.xadd(key, '*', { message: JSON.stringify(validatedMessage) });
      await this.redis.expire(key, RedisTTL[RedisKeyType.MESSAGE_STREAM]);
      return id;
    });
  }

  async addToMessageStreamBatch(teamId: string, messages: MessageStreamData[]): Promise<string[]> {
    const key = RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId);
    const validatedMessages = messages.map((message) => MessageStreamSchema.parse(message));

    return await this.executeWithRetry(async () => {
      const pipeline = this.redis.pipeline();
      const ids: string[] = [];

      for (const message of validatedMessages) {
        const id = await this.redis.xadd(key, '*', { message: JSON.stringify(message) });
        ids.push(id);
      }

      await this.redis.expire(key, RedisTTL[RedisKeyType.MESSAGE_STREAM]);
      return ids;
    });
  }

  async getMessageStream(
    teamId: string,
    lastId = '0-0',
    count = 50,
  ): Promise<[string, MessageStreamData][]> {
    const key = RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId);

    return await this.executeWithRetry(async () => {
      const messages = await this.redis.xrange(key, lastId, '+');
      return (messages as unknown as [string, { message: string }][])
        .slice(0, count)
        .map(([id, data]) => {
          try {
            return [id, MessageStreamSchema.parse(JSON.parse(data.message))] as [
              string,
              MessageStreamData,
            ];
          } catch (error) {
            console.warn(`Invalid message stream data:`, error);
            return null;
          }
        })
        .filter((item): item is [string, MessageStreamData] => item !== null);
    });
  }

  // Key Management with optimized scanning
  async scanKeys(pattern: string, batchSize = 100): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const options: ScanCommandOptions = { match: pattern, count: batchSize };
      const [nextCursor, matchedKeys] = await this.executeWithRetry(async () => {
        return await this.redis.scan(cursor, options);
      });

      cursor = nextCursor;
      keys.push(...(matchedKeys as string[]));
    } while (cursor !== '0');

    return keys;
  }

  // Atomic operations for data consistency
  async atomicUpdatePresence(
    teamId: string,
    userId: string,
    updateFn: (current: PresenceData | null) => PresenceData,
  ): Promise<void> {
    const key = RedisKeyBuilder[RedisKeyType.PRESENCE](teamId);

    await this.executeWithRetry(async () => {
      const currentData = await this.redis.hget<string>(key, userId);
      const current = currentData ? PresenceSchema.parse(JSON.parse(currentData)) : null;
      const updated = updateFn(current);
      const validatedData = PresenceSchema.parse(updated);

      await this.redis.hset(key, { [userId]: JSON.stringify(validatedData) });
      await this.redis.expire(key, RedisTTL[RedisKeyType.PRESENCE]);
    });
  }

  // Cleanup with batch operations
  async cleanup(teamId: string): Promise<void> {
    const keys = [
      RedisKeyBuilder[RedisKeyType.PRESENCE](teamId),
      RedisKeyBuilder[RedisKeyType.TYPING](teamId),
      RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId),
      RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId),
    ];

    await this.executeWithRetry(async () => {
      await this.redis.del(...keys);
    });
  }

  async cleanupBatch(teamIds: string[]): Promise<void> {
    const allKeys = teamIds.flatMap((teamId) => [
      RedisKeyBuilder[RedisKeyType.PRESENCE](teamId),
      RedisKeyBuilder[RedisKeyType.TYPING](teamId),
      RedisKeyBuilder[RedisKeyType.ACTIVE_MESSAGES](teamId),
      RedisKeyBuilder[RedisKeyType.MESSAGE_STREAM](teamId),
    ]);

    await this.executeWithRetry(async () => {
      await this.redis.del(...allKeys);
    });
  }

  // Health and monitoring
  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  async flushBatchQueue(): Promise<void> {
    await this.flushBatch();
  }

  getBatchQueueSize(): number {
    return this.batchQueue.length;
  }

  // Memory optimization
  async optimizeMemory(): Promise<void> {
    try {
      // Trigger Redis memory optimization if available
      await this.redis.memory('PURGE');
      console.log('✅ Redis memory optimization completed');
    } catch (error) {
      console.warn('⚠️ Redis memory optimization not available:', error);
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Redis service...');

    // Flush any pending batch operations
    await this.flushBatchQueue();

    // Clear any intervals
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    console.log('✅ Redis service shutdown complete');
  }
}

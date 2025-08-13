import { desc, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventEmitter } from 'events';
import { setTimeout as sleep } from 'timers/promises';

import { db } from '@/database';
import { credits } from '@/database/schemas/credits';
import { teamChatMessages } from '@/database/schemas/teamChat';
import { creditServerService } from '@/services/creditService';

import { OptimizedRedisService } from './optimized-redis-service';

interface SyncMetrics {
  totalSynced: number;
  failedSyncs: number;
  lastSyncTime: Date;
  syncDuration: number;
  errors: string[];
}

interface BatchSyncConfig {
  batchSize: number;
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export class OptimizedSyncService extends EventEmitter {
  private creditService = creditServerService;
  private redisService: OptimizedRedisService;
  private syncMetrics: SyncMetrics;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: BatchSyncConfig;

  constructor(redisService: OptimizedRedisService) {
    super();
    this.redisService = redisService;
    this.syncMetrics = {
      totalSynced: 0,
      failedSyncs: 0,
      lastSyncTime: new Date(),
      syncDuration: 0,
      errors: [],
    };

    this.config = {
      batchSize: 100,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000,
    };

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen to Redis health events
    this.redisService.on('health:connected', () => {
      console.log('🔄 Redis connected, resuming sync operations');
      this.resumeSync();
    });

    this.redisService.on('health:disconnected', () => {
      console.log('⚠️ Redis disconnected, pausing sync operations');
      this.pauseSync();
    });

    // Listen to batch operation events
    this.redisService.on('batch:success', (count: number) => {
      console.log(`✅ Redis batch operation successful: ${count} operations`);
    });

    this.redisService.on('batch:error', (error: Error) => {
      console.error('❌ Redis batch operation failed:', error);
      this.recordError(error.message);
    });
  }

  public startSync() {
    if (this.isRunning) {
      console.log('⚠️ Sync service is already running');
      return;
    }

    this.isRunning = true;
    this.syncInterval = setInterval(() => {
      this.performBatchSync();
    }, this.config.syncInterval);

    console.log('🔄 Optimized sync service started');
    this.emit('sync:started');
  }

  public stopSync() {
    if (!this.isRunning) {
      console.log('⚠️ Sync service is not running');
      return;
    }

    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    console.log('⏹️ Optimized sync service stopped');
    this.emit('sync:stopped');
  }

  private pauseSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private resumeSync() {
    if (this.isRunning && !this.syncInterval) {
      this.syncInterval = setInterval(() => {
        this.performBatchSync();
      }, this.config.syncInterval);
    }
  }

  private async performBatchSync() {
    const startTime = Date.now();
    console.log('🔄 Starting batch sync...');

    try {
      // Get all users with unsynced credits
      const usersWithUnsyncedCredits = await this.getUsersWithUnsyncedCredits();

      if (usersWithUnsyncedCredits.length === 0) {
        console.log('✅ No unsynced credits found');
        this.updateMetrics(startTime, 0, []);
        return;
      }

      // Process users in batches
      const batches = this.chunkArray(usersWithUnsyncedCredits, this.config.batchSize);
      let totalSynced = 0;
      const errors: string[] = [];

      for (const batch of batches) {
        try {
          const batchResult = await this.syncUserBatch(batch);
          totalSynced += batchResult.synced;
          errors.push(...batchResult.errors);

          // Small delay between batches to prevent overwhelming the database
          await sleep(100);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('❌ Batch sync failed:', errorMessage);
          errors.push(errorMessage);
        }
      }

      this.updateMetrics(startTime, totalSynced, errors);
      console.log(`✅ Batch sync completed: ${totalSynced} credits synced`);

      this.emit('sync:completed', { totalSynced, errors });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Batch sync failed:', errorMessage);
      this.recordError(errorMessage);
      this.updateMetrics(startTime, 0, [errorMessage]);
    }
  }

  private async getUsersWithUnsyncedCredits(): Promise<string[]> {
    try {
      // Scan Redis for credit keys
      const creditKeys = await this.redisService.scanKeys('user:*:credits');
      const userIds = creditKeys
        .map((key) => {
          const match = key.match(/user:(.+):credits/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null);

      // Check which users have unsynced credits
      const usersWithUnsynced: string[] = [];
      for (const userId of userIds) {
        const unsyncedCredits = await this.creditService.getUnsyncedCredits(userId);
        if (unsyncedCredits.length > 0) {
          usersWithUnsynced.push(userId);
        }
      }

      return usersWithUnsynced;
    } catch (error) {
      console.error('Error getting users with unsynced credits:', error);
      return [];
    }
  }

  private async syncUserBatch(userIds: string[]): Promise<{ synced: number; errors: string[] }> {
    let totalSynced = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        await this.syncUserCredits(userId);
        totalSynced++;
      } catch (error) {
        const errorMessage = `User ${userId}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    return { synced: totalSynced, errors };
  }

  // Sync credits for a specific user with enhanced error handling
  async syncUserCredits(userId: string) {
    try {
      // Get unsynced credits from Redis
      const unsyncedCredits = await this.creditService.getUnsyncedCredits(userId);
      if (unsyncedCredits.length === 0) return;

      console.log(`🔄 Syncing ${unsyncedCredits.length} credits for user ${userId}`);

      // Group credits by message ID
      const messageIds = unsyncedCredits.map((credit: any) => credit.messageId);

      // Begin transaction with retry logic
      await this.executeWithRetry(async () => {
        await db.transaction(async (tx) => {
          // Check for existing credits to avoid duplicates
          const existingCredits = await tx
            .select({ messageId: credits.messageId })
            .from(credits)
            .where(eq(credits.userId, userId))
            .where(sql`${credits.messageId} = ANY(${messageIds})`);

          const existingMessageIds = new Set(existingCredits.map((c: any) => c.messageId));
          const newCredits = unsyncedCredits.filter(
            (credit: any) => !existingMessageIds.has(credit.messageId),
          );

          if (newCredits.length > 0) {
            // Insert new credits into PostgreSQL
            await tx.insert(credits).values(
              newCredits.map((credit: any) => ({
                id: `credit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                userId: credit.userId,
                messageId: credit.messageId,
                amount: credit.credits,
                timestamp: new Date(credit.timestamp),
                metadata: credit.metadata,
              })),
            );
          }

          // Mark credits as synced in Redis
          await this.creditService.markCreditsSynced(userId, messageIds);
        });
      });

      console.log(`✅ Successfully synced ${unsyncedCredits.length} credits for user ${userId}`);
    } catch (error) {
      console.error(`Error syncing credits for user ${userId}:`, error);
      throw error;
    }
  }

  // Sync team chat messages with batch processing
  async syncTeamChatMessages(teamId: string, messages: any[]) {
    try {
      if (messages.length === 0) return;

      console.log(`🔄 Syncing ${messages.length} messages for team ${teamId}`);

      await this.executeWithRetry(async () => {
        await db.transaction(async (tx) => {
          // Check for existing messages to avoid duplicates
          const messageIds = messages.map((m: any) => m.id);
          const existingMessages = await tx
            .select({ id: teamChatMessages.id })
            .from(teamChatMessages)
            .where(eq(teamChatMessages.teamChatId, teamId))
            .where(sql`${teamChatMessages.id} = ANY(${messageIds})`);

          const existingIds = new Set(existingMessages.map((m: any) => m.id));
          const newMessages = messages.filter((m: any) => !existingIds.has(m.id));

          if (newMessages.length > 0) {
            // Insert new messages into PostgreSQL
            await tx.insert(teamChatMessages).values(
              newMessages.map((message: any) => ({
                id: message.id,
                teamChatId: message.teamId,
                userId: message.userId,
                content: message.content,
                messageType: message.type || 'user',
                metadata: message.metadata || {},
                createdAt: new Date(message.timestamp),
                updatedAt: new Date(message.timestamp),
              })),
            );
          }
        });
      });

      console.log(`✅ Successfully synced ${messages.length} messages for team ${teamId}`);
    } catch (error) {
      console.error(`Error syncing messages for team ${teamId}:`, error);
      throw error;
    }
  }

  // Sync presence data with batch processing
  async syncPresenceData(teamId: string, presenceData: Record<string, any>) {
    try {
      const presenceEntries = Object.entries(presenceData);
      if (presenceEntries.length === 0) return;

      console.log(`🔄 Syncing presence data for team ${teamId}: ${presenceEntries.length} users`);

      // Update presence in Redis with batch operation
      const presenceArray = presenceEntries.map(([userId, data]) => ({
        userId,
        lastActiveAt: data.lastActiveAt,
        isActive: data.isActive,
      }));

      await this.redisService.updatePresenceBatch(teamId, presenceArray);
      console.log(`✅ Successfully synced presence data for team ${teamId}`);
    } catch (error) {
      console.error(`Error syncing presence data for team ${teamId}:`, error);
      throw error;
    }
  }

  // Sync read receipts with batch processing
  async syncReadReceipts(teamId: string, receiptsData: Record<string, any>) {
    try {
      const receiptEntries = Object.entries(receiptsData);
      if (receiptEntries.length === 0) return;

      console.log(`🔄 Syncing read receipts for team ${teamId}: ${receiptEntries.length} users`);

      // Update read receipts in Redis with batch operation
      const receiptsArray = receiptEntries.map(([userId, data]) => ({
        userId,
        timestamp: data.timestamp,
        lastReadMessageId: data.lastReadMessageId,
      }));

      await this.redisService.updateReadReceiptBatch(teamId, receiptsArray);
      console.log(`✅ Successfully synced read receipts for team ${teamId}`);
    } catch (error) {
      console.error(`Error syncing read receipts for team ${teamId}:`, error);
      throw error;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Operation failed (attempt ${attempt}/${this.config.maxRetries}):`, error);

        if (attempt < this.config.maxRetries) {
          await sleep(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private updateMetrics(startTime: number, synced: number, errors: string[]) {
    const duration = Date.now() - startTime;

    this.syncMetrics = {
      totalSynced: this.syncMetrics.totalSynced + synced,
      failedSyncs: this.syncMetrics.failedSyncs + errors.length,
      lastSyncTime: new Date(),
      syncDuration: duration,
      errors: [...this.syncMetrics.errors, ...errors].slice(-100), // Keep last 100 errors
    };
  }

  private recordError(error: string) {
    this.syncMetrics.errors.push(error);
    if (this.syncMetrics.errors.length > 100) {
      this.syncMetrics.errors = this.syncMetrics.errors.slice(-100);
    }
  }

  // Get sync metrics
  getSyncMetrics(): SyncMetrics {
    return { ...this.syncMetrics };
  }

  // Get sync status
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      metrics: this.syncMetrics,
    };
  }

  // Update sync configuration
  updateConfig(newConfig: Partial<BatchSyncConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Restart sync if running with new interval
    if (this.isRunning && newConfig.syncInterval) {
      this.stopSync();
      this.startSync();
    }
  }

  // Manual sync trigger
  async triggerManualSync() {
    console.log('🔄 Manual sync triggered');
    await this.performBatchSync();
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down sync service...');

    this.stopSync();

    // Flush any pending Redis operations
    await this.redisService.flushBatchQueue();

    console.log('✅ Sync service shutdown complete');
  }
}

import { desc, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { db } from '@/database';
import { credits } from '@/database/schemas/credits';
import { getRedisService } from '@/libs/redis/client';
import { creditServerService } from '@/services/creditService';

export class CreditSyncService {
  private creditService = creditServerService;
  private redisService = getRedisService();

  // Sync credits for a specific user
  async syncUserCredits(userId: string) {
    try {
      // Get unsynced credits from Redis
      const unsyncedCredits = await this.creditService.getUnsyncedCredits(userId);
      if (unsyncedCredits.length === 0) return;

      // Group credits by message ID
      const messageIds = unsyncedCredits.map((credit) => credit.messageId);

      // Begin transaction
      await db.transaction(async (tx: PostgresJsDatabase) => {
        // Insert credits into PostgreSQL
        await tx.insert(credits).values(
          unsyncedCredits.map((credit) => ({
            id: `credit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            userId: credit.userId,
            messageId: credit.messageId,
            amount: credit.credits,
            timestamp: new Date(credit.timestamp),
            metadata: credit.metadata,
          })),
        );

        // Mark credits as synced in Redis
        await this.creditService.markCreditsSynced(userId, messageIds);
      });
    } catch (error) {
      console.error(`Error syncing credits for user ${userId}:`, error);
      throw error;
    }
  }

  // Sync credits for all users
  async syncAllCredits() {
    try {
      // Get all users with unsynced credits
      const users = await this.getAllUsersWithUnsyncedCredits();

      // Sync credits for each user
      await Promise.all(users.map((userId) => this.syncUserCredits(userId)));
    } catch (error) {
      console.error('Error syncing all credits:', error);
      throw error;
    }
  }

  // Get total credits for a user from PostgreSQL
  async getTotalCredits(userId: string) {
    try {
      const result = await db
        .select({
          total: sql<number>`COALESCE(SUM(${credits.amount}), 0)`,
        })
        .from(credits)
        .where(eq(credits.userId, userId));

      return result[0]?.total || 0;
    } catch (error) {
      console.error(`Error getting total credits for user ${userId}:`, error);
      throw error;
    }
  }

  // Get credit history for a user
  async getCreditHistory(userId: string, limit = 50, offset = 0) {
    try {
      return await db
        .select()
        .from(credits)
        .where(eq(credits.userId, userId))
        .orderBy(desc(credits.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error(`Error getting credit history for user ${userId}:`, error);
      throw error;
    }
  }

  private async getAllUsersWithUnsyncedCredits(): Promise<string[]> {
    try {
      const keys = await this.redisService.scanKeys('user:credits:*');
      return keys.map((key) => key.split(':')[2]);
    } catch (error) {
      console.error('Error getting users with unsynced credits:', error);
      return [];
    }
  }
}

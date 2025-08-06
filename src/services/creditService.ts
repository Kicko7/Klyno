import { getRedisService } from '@/libs/redis/client';
import { CreditUsage } from '@/types/redis';

export class CreditService {
  private redisService = getRedisService();

  // Track credit usage in Redis
  async trackCredits(userId: string, messageId: string, credits: number, metadata = {}) {
    const usage: CreditUsage = {
      userId,
      messageId,
      credits,
      timestamp: new Date().toISOString(),
      syncedToDb: false,
      metadata,
    };

    await this.redisService.trackCredits(userId, usage);
  }

  // Get unsynced credits for a user
  async getUnsyncedCredits(userId: string) {
    return this.redisService.getUnsyncedCredits(userId);
  }

  // Mark credits as synced
  async markCreditsSynced(userId: string, messageIds: string[]) {
    await this.redisService.markCreditsSynced(userId, messageIds);
  }

  // Get total credits used by a user
  async getTotalCredits(userId: string) {
    const credits = await this.getUnsyncedCredits(userId);
    return credits.reduce((total, usage) => total + usage.credits, 0);
  }
}

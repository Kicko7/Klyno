import { getRedisClient } from '@/libs/redis/client';
import { CreditUsage } from '@/types/redis';

import { ICreditService } from './type';

export class ServerService implements ICreditService {
  private redisService: any = null;

  constructor() {
    // Initialize Redis service
    this.initRedisService();
  }

  private async initRedisService() {
    try {
      const redisClient = await getRedisClient();

      // Dynamic import to prevent client-side bundling
      const { RedisService } = await import('@/services/redisService');
      this.redisService = new RedisService(redisClient as any);
    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis service:', error);
      // Fall back to mock service
      this.redisService = {
        trackCredits: async () => console.log('Mock: trackCredits called'),
        getUnsyncedCredits: async () => [],
        markCreditsSynced: async () => console.log('Mock: markCreditsSynced called'),
      };
    }
  }

  // Track credit usage in Redis
  async trackCredits(
    userId: string,
    messageId: string,
    credits: number,
    metadata = {},
  ): Promise<void> {
    if (!this.redisService) {
      await this.initRedisService();
    }

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
  async getUnsyncedCredits(userId: string): Promise<any[]> {
    if (!this.redisService) {
      await this.initRedisService();
    }

    return this.redisService.getUnsyncedCredits(userId);
  }

  // Mark credits as synced
  async markCreditsSynced(userId: string, messageIds: string[]): Promise<void> {
    if (!this.redisService) {
      await this.initRedisService();
    }

    await this.redisService.markCreditsSynced(userId, messageIds);
  }

  // Get total credits used by a user
  async getTotalCredits(userId: string): Promise<number> {
    const credits = await this.getUnsyncedCredits(userId);
    return credits.reduce((total, usage) => total + usage.credits, 0);
  }
}

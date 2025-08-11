import { and, eq, gte, lte } from 'drizzle-orm';

import { db } from '@/database';
import { userSubscriptions } from '@/database/schemas/userSubscriptions';
import { userUsageQuotas } from '@/database/schemas/userUsageQuotas';

export interface UsageUpdate {
  userId: string;
  creditsUsed?: number;
  fileStorageUsedMB?: number;
  vectorStorageUsedMB?: number;
}

export class UsageTracker {
  /**
   * Update user usage for the current billing period
   */
  async updateUsage(usageUpdate: UsageUpdate) {
    return db.transaction(async (tx) => {
      // Get current active subscription and usage quota
      const subscription = await tx
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, usageUpdate.userId),
            eq(userSubscriptions.status, 'active'),
          ),
        )
        .limit(1);

      if (subscription.length === 0) {
        // No active subscription, skip usage tracking
        return { success: false, message: 'No active subscription found' };
      }

      const sub = subscription[0];
      const now = new Date();

      // Get current usage quota for the billing period
      let usageQuota = await tx
        .select()
        .from(userUsageQuotas)
        .where(
          and(eq(userUsageQuotas.userId, usageUpdate.userId), gte(userUsageQuotas.periodEnd, now)),
        )
        .limit(1);

      if (usageQuota.length === 0) {
        // Create new usage quota for current billing period
        const periodStart = sub.currentPeriodStart || now;
        const periodEnd =
          sub.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

        await tx.insert(userUsageQuotas).values({
          id: `quota_${usageUpdate.userId}_${Date.now()}`,
          userId: usageUpdate.userId,
          periodStart,
          periodEnd,
          creditsLimit: sub.monthlyCredits,
          fileStorageLimit: sub.fileStorageLimit * 1024, // Convert GB to MB
          vectorStorageLimit: sub.vectorStorageLimit,
        });

        usageQuota = await tx
          .select()
          .from(userUsageQuotas)
          .where(
            and(
              eq(userUsageQuotas.userId, usageUpdate.userId),
              gte(userUsageQuotas.periodEnd, now),
            ),
          )
          .limit(1);
      }

      if (usageQuota.length === 0) {
        throw new Error('Failed to create or retrieve usage quota');
      }

      const quota = usageQuota[0];

      // Update usage values
      const updateData: any = {
        lastUsageUpdate: now,
        updatedAt: now,
      };

      if (usageUpdate.creditsUsed !== undefined) {
        updateData.creditsUsed = quota.creditsUsed + usageUpdate.creditsUsed;
      }

      if (usageUpdate.fileStorageUsedMB !== undefined) {
        updateData.fileStorageUsedMB = quota.fileStorageUsedMB + usageUpdate.fileStorageUsedMB;
      }

      if (usageUpdate.vectorStorageUsedMB !== undefined) {
        updateData.vectorStorageUsedMB =
          quota.vectorStorageUsedMB + usageUpdate.vectorStorageUsedMB;
      }

      // Update usage quota
      await tx.update(userUsageQuotas).set(updateData).where(eq(userUsageQuotas.id, quota.id));

      // Add to usage history
      const historyEntry = {
        timestamp: now.toISOString(),
        creditsUsed: updateData.creditsUsed || quota.creditsUsed,
        fileStorageUsedMB: updateData.fileStorageUsedMB || quota.fileStorageUsedMB,
        vectorStorageUsedMB: updateData.vectorStorageUsedMB || quota.vectorStorageUsedMB,
      };

      const currentHistory = quota.usageHistory || [];
      currentHistory.push(historyEntry);

      // Keep only last 30 days of history
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const filteredHistory = currentHistory.filter(
        (entry: any) => new Date(entry.timestamp) > thirtyDaysAgo,
      );

      await tx
        .update(userUsageQuotas)
        .set({ usageHistory: filteredHistory })
        .where(eq(userUsageQuotas.id, quota.id));

      return { success: true, updatedQuota: { ...quota, ...updateData } };
    });
  }

  /**
   * Get current usage for a user
   */
  async getCurrentUsage(userId: string) {
    const usageQuota = await db
      .select()
      .from(userUsageQuotas)
      .where(and(eq(userUsageQuotas.userId, userId), gte(userUsageQuotas.periodEnd, new Date())))
      .limit(1);

    if (usageQuota.length === 0) {
      return null;
    }

    return usageQuota[0];
  }

  /**
   * Check if user has exceeded their usage limits
   */
  async checkUsageLimits(userId: string) {
    const usage = await this.getCurrentUsage(userId);
    if (!usage) {
      return { exceeded: false, limits: null };
    }

    const exceeded = {
      credits: usage.creditsUsed >= usage.creditsLimit,
      fileStorage: usage.fileStorageUsedMB >= usage.fileStorageLimitMB,
      vectorStorage: usage.vectorStorageUsedMB >= usage.vectorStorageLimitMB,
    };

    return {
      exceeded: exceeded.credits || exceeded.fileStorage || exceeded.vectorStorage,
      limits: exceeded,
      usage,
    };
  }

  /**
   * Reset usage for a new billing period
   */
  async resetUsageForNewPeriod(userId: string, periodStart: Date, periodEnd: Date) {
    return db.transaction(async (tx) => {
      // Archive current usage
      const currentUsage = await tx
        .select()
        .from(userUsageQuotas)
        .where(and(eq(userUsageQuotas.userId, userId), gte(userUsageQuotas.periodEnd, new Date())))
        .limit(1);

      if (currentUsage.length > 0) {
        // Move current usage to archive (you might want to create an archive table)
        await tx
          .update(userUsageQuotas)
          .set({ periodEnd: new Date() })
          .where(eq(userUsageQuotas.id, currentUsage[0].id));
      }

      // Get subscription to get new limits
      const subscription = await tx
        .select()
        .from(userSubscriptions)
        .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, 'active')))
        .limit(1);

      if (subscription.length > 0) {
        const sub = subscription[0];

        // Create new usage quota
        await tx.insert(userUsageQuotas).values({
          id: `quota_${userId}_${Date.now()}`,
          userId,
          periodStart,
          periodEnd,
          creditsLimit: sub.monthlyCredits,
          fileStorageLimit: sub.fileStorageLimit * 1024, // Convert GB to MB
          vectorStorageLimit: sub.vectorStorageLimit,
        });
      }
    });
  }
}

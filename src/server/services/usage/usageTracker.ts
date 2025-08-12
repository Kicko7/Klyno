import { and, eq, gte, lte } from 'drizzle-orm';

import { userSubscriptions } from '@/database/schemas/userSubscriptions';
import { userUsageQuotas } from '@/database/schemas/userUsageQuotas';
import { serverDB } from '@/database/server';

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
    console.log('[UsageTracker] updateUsage:start', usageUpdate);

    try {
      // Validate input
      if (!usageUpdate.userId) {
        console.error('[UsageTracker] Invalid input: userId is required');
        return { success: false, message: 'userId is required' };
      }

      if (usageUpdate.creditsUsed !== undefined && usageUpdate.creditsUsed < 0) {
        console.error(
          '[UsageTracker] Invalid input: creditsUsed cannot be negative',
          usageUpdate.creditsUsed,
        );
        return { success: false, message: 'creditsUsed cannot be negative' };
      }

      return await serverDB.transaction(async (tx) => {
        try {
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
            console.warn(
              '[UsageTracker] No active subscription found for user',
              usageUpdate.userId,
            );
            // No active subscription, skip usage tracking gracefully
            return { success: false, message: 'No active subscription found' };
          }

          const sub = subscription[0];
          const now = new Date();

          console.log('[UsageTracker] Found subscription', {
            userId: usageUpdate.userId,
            monthlyCredits: sub.monthlyCredits,
            fileStorageLimit: sub.fileStorageLimit,
            vectorStorageLimit: sub.vectorStorageLimit,
          });

          // Get current usage quota for the billing period
          let usageQuota = await tx
            .select()
            .from(userUsageQuotas)
            .where(
              and(
                eq(userUsageQuotas.userId, usageUpdate.userId),
                gte(userUsageQuotas.periodEnd, now),
              ),
            )
            .limit(1);

          if (usageQuota.length === 0) {
            console.log('[UsageTracker] Creating new quota for user', usageUpdate.userId);
            // Create new usage quota for current billing period
            const periodStart = sub.currentPeriodStart || now;
            const periodEnd =
              sub.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

            const newQuotaId = `quota_${usageUpdate.userId}_${Date.now()}`;
            const newQuotaData = {
              id: newQuotaId,
              userId: usageUpdate.userId,
              periodStart,
              periodEnd,
              creditsLimit: sub.monthlyCredits,
              fileStorageLimit: sub.fileStorageLimit * 1024, // Convert GB to MB
              vectorStorageLimit: sub.vectorStorageLimit,
              creditsUsed: 0, // Initialize with 0
              fileStorageUsed: 0, // Initialize with 0
              vectorStorageUsed: 0, // Initialize with 0
              lastUsageUpdate: now,
              usageHistory: [],
            };

            console.log('[UsageTracker] Inserting new quota', newQuotaData);

            await tx.insert(userUsageQuotas).values(newQuotaData);

            // Verify the quota was created
            usageQuota = await tx
              .select()
              .from(userUsageQuotas)
              .where(eq(userUsageQuotas.id, newQuotaId))
              .limit(1);

            if (usageQuota.length === 0) {
              throw new Error('Failed to create usage quota');
            }

            console.log('[UsageTracker] Successfully created new quota', usageQuota[0]);
          }

          const quota = usageQuota[0];
          console.log('[UsageTracker] Current quota before update', {
            id: quota.id,
            creditsUsed: quota.creditsUsed,
            fileStorageUsed: quota.fileStorageUsed,
            vectorStorageUsed: quota.vectorStorageUsed,
          });

          // Update usage values
          const updateData: any = {
            lastUsageUpdate: now,
            updatedAt: now,
          };

          if (usageUpdate.creditsUsed !== undefined) {
            updateData.creditsUsed = (quota.creditsUsed || 0) + usageUpdate.creditsUsed;
            console.log('[UsageTracker] Updating credits', {
              current: quota.creditsUsed || 0,
              adding: usageUpdate.creditsUsed,
              newTotal: updateData.creditsUsed,
            });
          }

          if (usageUpdate.fileStorageUsedMB !== undefined) {
            updateData.fileStorageUsed =
              (quota.fileStorageUsed || 0) + usageUpdate.fileStorageUsedMB;
            console.log('[UsageTracker] Updating file storage', {
              current: quota.fileStorageUsed || 0,
              adding: usageUpdate.fileStorageUsedMB,
              newTotal: updateData.fileStorageUsed,
            });
          }

          if (usageUpdate.vectorStorageUsedMB !== undefined) {
            updateData.vectorStorageUsed =
              (quota.vectorStorageUsed || 0) + usageUpdate.vectorStorageUsedMB;
            console.log('[UsageTracker] Updating vector storage', {
              current: quota.vectorStorageUsed || 0,
              adding: usageUpdate.vectorStorageUsedMB,
              newTotal: updateData.vectorStorageUsed,
            });
          }

          // Update usage quota in database
          console.log('[UsageTracker] Updating quota in database', {
            quotaId: quota.id,
            updateData,
          });

          const updateResult = await tx
            .update(userUsageQuotas)
            .set(updateData)
            .where(eq(userUsageQuotas.id, quota.id));

          console.log('[UsageTracker] Database update result', updateResult);

          // Verify the update by fetching the updated record
          const updatedQuota = await tx
            .select()
            .from(userUsageQuotas)
            .where(eq(userUsageQuotas.id, quota.id))
            .limit(1);

          if (updatedQuota.length === 0) {
            throw new Error('Failed to verify quota update');
          }

          console.log('[UsageTracker] Verified updated quota', {
            id: updatedQuota[0].id,
            creditsUsed: updatedQuota[0].creditsUsed,
            fileStorageUsed: updatedQuota[0].fileStorageUsed,
            vectorStorageUsed: updatedQuota[0].vectorStorageUsed,
          });

          // Add to usage history
          const historyEntry = {
            timestamp: now.toISOString(),
            creditsUsed: updateData.creditsUsed || quota.creditsUsed || 0,
            fileStorageUsed: updateData.fileStorageUsed || quota.fileStorageUsed || 0,
            vectorStorageUsed: updateData.vectorStorageUsed || quota.vectorStorageUsed || 0,
            source: 'team_chat',
            metadata: usageUpdate,
          };

          const currentHistory = Array.isArray(quota.usageHistory) ? quota.usageHistory : [];
          currentHistory.push(historyEntry);

          // Keep only last 30 days of history
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const filteredHistory = currentHistory.filter(
            (entry: any) => new Date(entry.timestamp) > thirtyDaysAgo,
          );

          // Update usage history
          await tx
            .update(userUsageQuotas)
            .set({ usageHistory: filteredHistory })
            .where(eq(userUsageQuotas.id, quota.id));

          console.log('[UsageTracker] Updated usage history', {
            historyLength: filteredHistory.length,
            latestEntry: historyEntry,
          });

          const finalResult = { success: true, updatedQuota: { ...quota, ...updateData } };
          console.log('[UsageTracker] updateUsage:success', finalResult);

          return finalResult;
        } catch (transactionError) {
          console.error('[UsageTracker] Transaction error:', transactionError);
          throw transactionError; // Re-throw to trigger rollback
        }
      });
    } catch (error) {
      console.error('[UsageTracker] updateUsage:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        usageUpdate,
      });

      // Return error result instead of throwing
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Database operation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current usage for a user
   */
  async getCurrentUsage(userId: string) {
    const usageQuota = await serverDB
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
      fileStorage: usage.fileStorageUsed >= usage.fileStorageLimit,
      vectorStorage: usage.vectorStorageUsed >= usage.vectorStorageLimit,
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
    return serverDB.transaction(async (tx) => {
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

  /**
   * Debug method to check database connection and table access
   */
  async debugDatabaseAccess(userId: string) {
    try {
      console.log('[UsageTracker] Testing database access for user', userId);

      // Test subscription access
      const subscription = await serverDB
        .select()
        .from(userSubscriptions)
        .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, 'active')))
        .limit(1);

      console.log('[UsageTracker] Subscription query result:', {
        found: subscription.length > 0,
        subscription: subscription[0] || null,
      });

      // Test usage quota access
      const usageQuota = await serverDB
        .select()
        .from(userUsageQuotas)
        .where(eq(userUsageQuotas.userId, userId))
        .limit(5);

      console.log('[UsageTracker] Usage quota query result:', {
        found: usageQuota.length,
        quotas: usageQuota,
      });

      return {
        subscriptionAccess: subscription.length > 0,
        usageQuotaAccess: true,
        subscriptionCount: subscription.length,
        usageQuotaCount: usageQuota.length,
      };
    } catch (error) {
      console.error('[UsageTracker] Database access test failed:', error);
      return {
        subscriptionAccess: false,
        usageQuotaAccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Simple test method to verify database connectivity
   */
  async testConnection() {
    try {
      console.log('[UsageTracker] Testing database connection...');

      // Test basic connection by doing a simple query
      const result = await serverDB.select().from(userUsageQuotas).limit(1);
      console.log('[UsageTracker] Database connection test successful', {
        resultCount: result.length,
      });

      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      console.error('[UsageTracker] Database connection test failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

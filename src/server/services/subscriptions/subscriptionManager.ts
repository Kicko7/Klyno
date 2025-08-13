import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/database';
import { creditTransactions } from '@/database/schemas/creditTransactions';
import { users } from '@/database/schemas/user';
import { userCredits } from '@/database/schemas/userCredits';
import { userSubscriptions } from '@/database/schemas/userSubscriptions';
import { userUsageQuotas } from '@/database/schemas/userUsageQuotas';

import { PlanMapper } from './planMapper';

// Helper function to map Stripe status to our internal status
function mapStripeStatus(
  stripeStatus: string,
):
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return stripeStatus;
    case 'canceled':
      return 'canceled';
    case 'incomplete':
      return 'incomplete';
    case 'incomplete_expired':
      return 'incomplete_expired';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'incomplete';
  }
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyCredits: number;
  fileStorageLimitGB: number;
  vectorStorageLimitMB: number;
  price: number;
  interval: 'month' | 'year';
}

export interface UsageUpdate {
  userId: string;
  creditsUsed?: number;
  fileStorageUsedMB?: number;
  vectorStorageUsedMB?: number;
}

export interface UsageLimits {
  credits: {
    used: number;
    limit: number;
    remaining: number;
  };
  fileStorage: {
    usedMB: number;
    limitMB: number;
    remainingMB: number;
    usedGB: number;
    limitGB: number;
    remainingGB: number;
  };
  vectorStorage: {
    usedMB: number;
    limitMB: number;
    remainingMB: number;
  };
}

export class SubscriptionManager {
  /**
   * Create or update a subscription with automatic credit allocation and usage quota setup
   */
  async upsertSubscription(
    userId: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    stripePriceId: string,
    plan: SubscriptionPlan,
    status:
      | 'active'
      | 'canceled'
      | 'incomplete'
      | 'incomplete_expired'
      | 'past_due'
      | 'trialing'
      | 'unpaid',
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: boolean = false,
    canceledAt?: Date,
  ) {
    return db.transaction(async (tx) => {
      // Check if subscription already exists
      const existingSubscription = await tx
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .limit(1);

      const isNewSubscription = existingSubscription.length === 0;
      const isPlanChange =
        !isNewSubscription &&
        (existingSubscription[0].monthlyCredits !== plan.monthlyCredits ||
          existingSubscription[0].fileStorageLimit !== plan.fileStorageLimitGB ||
          existingSubscription[0].vectorStorageLimit !== plan.vectorStorageLimitMB);

      if (existingSubscription.length > 0) {
        // Update existing subscription
        await tx
          .update(userSubscriptions)
          .set({
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            canceledAt,
            planName: plan.name,
            monthlyCredits: plan.monthlyCredits,
            fileStorageLimit: plan.fileStorageLimitGB,
            vectorStorageLimit: plan.vectorStorageLimitMB,
            amount: plan.price,
            interval: plan.interval,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
      } else {
        // Create new subscription
        await tx.insert(userSubscriptions).values({
          id: `sub_${userId}_${Date.now()}`,
          userId,
          stripeSubscriptionId,
          stripeCustomerId,
          stripePriceId,
          planId: plan.id,
          planName: plan.name,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd,
          canceledAt,
          monthlyCredits: plan.monthlyCredits,
          fileStorageLimit: plan.fileStorageLimitGB,
          vectorStorageLimit: plan.vectorStorageLimitMB,
          amount: plan.price,
          interval: plan.interval,
        });
      }

      // Update user's Stripe customer ID if not set
      await tx
        .update(users)
        .set({ stripeCustomerId: stripeCustomerId })
        .where(eq(users.id, userId));

      // Handle usage quota setup
      if (isNewSubscription || isPlanChange) {
        if (isPlanChange) {
          // Reset usage for plan change
          await this.resetUsageForPlanChange(
            tx,
            userId,
            plan,
            currentPeriodStart,
            currentPeriodEnd,
          );
        } else {
          // Create new usage quota for new subscription
          await this.createOrUpdateUsageQuota(
            tx,
            userId,
            plan,
            currentPeriodStart,
            currentPeriodEnd,
          );
        }
      }

      // Note: Credit allocation is now handled by webhook handlers to avoid duplicate allocation
      // and ensure proper sequencing
    });
  }

  /**
   * Create or update usage quota for a billing period
   */
  private async createOrUpdateUsageQuota(
    tx: any,
    userId: string,
    plan: SubscriptionPlan,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const existingQuota = await tx
      .select()
      .from(userUsageQuotas)
      .where(and(eq(userUsageQuotas.userId, userId), gte(userUsageQuotas.periodEnd, new Date())))
      .limit(1);

    if (existingQuota.length > 0) {
      // Update existing quota with new limits
      await tx
        .update(userUsageQuotas)
        .set({
          creditsLimit: plan.monthlyCredits,
          fileStorageLimit: plan.fileStorageLimitGB * 1024, // Convert GB to MB
          vectorStorageLimit: plan.vectorStorageLimitMB,
          updatedAt: new Date(),
        })
        .where(eq(userUsageQuotas.id, existingQuota[0].id));
    } else {
      // Create new quota for the billing period
      await tx.insert(userUsageQuotas).values({
        id: `quota_${userId}_${Date.now()}`,
        userId,
        periodStart,
        periodEnd,
        creditsLimit: plan.monthlyCredits,
        fileStorageLimit: plan.fileStorageLimitGB * 1024, // Convert GB to MB
        vectorStorageLimit: plan.vectorStorageLimitMB,
      });
    }
  }

  /**
   * Reset usage for plan change - creates new quota and resets counters
   */
  private async resetUsageForPlanChange(
    tx: any,
    userId: string,
    plan: SubscriptionPlan,
    periodStart: Date,
    periodEnd: Date,
  ) {
    // Archive current usage by setting period end to now
    const currentUsage = await tx
      .select()
      .from(userUsageQuotas)
      .where(and(eq(userUsageQuotas.userId, userId), gte(userUsageQuotas.periodEnd, new Date())))
      .limit(1);

    if (currentUsage.length > 0) {
      await tx
        .update(userUsageQuotas)
        .set({ periodEnd: new Date() })
        .where(eq(userUsageQuotas.id, currentUsage[0].id));
    }

    // Create new usage quota with new limits
    await tx.insert(userUsageQuotas).values({
      id: `quota_${userId}_${Date.now()}`,
      userId,
      periodStart,
      periodEnd,
      creditsLimit: plan.monthlyCredits,
      fileStorageLimit: plan.fileStorageLimitGB * 1024, // Convert GB to MB
      vectorStorageLimit: plan.vectorStorageLimitMB,
    });
  }

  /**
   * Allocate monthly credits for an active subscription
   */
  async allocateMonthlyCredits(
    userId: string,
    subscriptionId: string,
    metadata?: {
      subscriptionId?: string;
      planId?: string;
      planName?: string;
      isPlanChange?: boolean;
      stripeEventId?: string;
    },
  ) {
    return db.transaction(async (tx) => {
      // Idempotency check when stripeEventId is provided
      if (metadata?.stripeEventId) {
        const existing = await tx
          .select({ id: creditTransactions.id })
          .from(creditTransactions)
          .where(eq(creditTransactions.stripeEventId, metadata.stripeEventId))
          .limit(1);
        if (existing.length > 0) {
          console.log(
            `Skipping credit allocation - already processed for event ${metadata.stripeEventId}`,
          );
          return { success: true, creditsAdded: 0 };
        }
      }

      // First try to find subscription by the provided ID
      let subscription = await tx
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      // If not found by ID, try to find by user ID and active status
      if (subscription.length === 0) {
        console.log(
          `Subscription ${subscriptionId} not found by ID, trying to find by user ID ${userId}`,
        );
        subscription = await tx
          .select()
          .from(userSubscriptions)
          .where(
            and(
              eq(userSubscriptions.userId, userId),
              inArray(userSubscriptions.status, ['active', 'trialing']),
            ),
          )
          .limit(1);
      }

      if (subscription.length === 0) {
        // Log more details to help debug the issue
        const allUserSubs = await tx
          .select({
            id: userSubscriptions.id,
            stripeSubscriptionId: userSubscriptions.stripeSubscriptionId,
            status: userSubscriptions.status,
            userId: userSubscriptions.userId,
          })
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, userId));

        console.error(
          `No active subscription found for user ${userId}. Available subscriptions:`,
          allUserSubs,
        );
        throw new Error(
          `No active subscription found for user ${userId}. Please ensure the subscription is properly created before allocating credits.`,
        );
      }

      const sub = subscription[0];

      // Check if subscription is active or trialing
      if (sub.status !== 'active' && sub.status !== 'trialing') {
        throw new Error(`Subscription ${sub.id} is not active (status: ${sub.status})`);
      }

      const creditsToAdd = sub.monthlyCredits;

      if (creditsToAdd <= 0) {
        throw new Error(`Subscription ${sub.id} has no monthly credits configured`);
      }

      console.log(`Allocating ${creditsToAdd} credits for user ${userId}, subscription ${sub.id}`);

      // Add credits to user balance
      let userCreditsRecord = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      if (userCreditsRecord.length === 0) {
        await tx.insert(userCredits).values({
          id: `credits_${userId}_${Date.now()}`,
          userId,
          balance: creditsToAdd,
        });
        console.log(`Created new credits record for user ${userId} with ${creditsToAdd} credits`);
      } else {
        const newBalance = userCreditsRecord[0].balance + creditsToAdd;
        await tx
          .update(userCredits)
          .set({
            balance: newBalance,
            lastUpdated: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userCredits.userId, userId));
        console.log(
          `Updated credits for user ${userId}: ${userCreditsRecord[0].balance} + ${creditsToAdd} = ${newBalance}`,
        );
      }

      // Record the transaction
      await tx.insert(creditTransactions).values({
        id: `tx_${userId}_${Date.now()}`,
        userId,
        type: metadata?.isPlanChange ? 'subscription_renewal' : 'subscription_allocation',
        amount: creditsToAdd,
        currency: sub.currency,
        stripeEventId: metadata?.stripeEventId || `monthly_alloc_${Date.now()}`,
        priceId: sub.stripePriceId,
        productId: sub.planId,
        metadata: {
          subscriptionId: metadata?.subscriptionId || sub.id,
          planId: metadata?.planId || sub.planId,
          planName: metadata?.planName || sub.planName,
          billingPeriod: {
            start: sub.currentPeriodStart,
            end: sub.currentPeriodEnd,
          },
          isPlanChange: metadata?.isPlanChange || false,
        },
      });

      console.log(`Credit transaction recorded for user ${userId}: ${creditsToAdd} credits`);

      return { success: true, creditsAdded: creditsToAdd };
    });
  }

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
        updateData.fileStorageUsed = quota.fileStorageUsed + usageUpdate.fileStorageUsedMB;
      }

      if (usageUpdate.vectorStorageUsedMB !== undefined) {
        updateData.vectorStorageUsed = quota.vectorStorageUsed + usageUpdate.vectorStorageUsedMB;
      }

      // Update usage quota
      await tx.update(userUsageQuotas).set(updateData).where(eq(userUsageQuotas.id, quota.id));

      // Add to usage history
      const historyEntry = {
        timestamp: now.toISOString(),
        creditsUsed: updateData.creditsUsed || quota.creditsUsed,
        fileStorageUsedMB: updateData.fileStorageUsed ?? quota.fileStorageUsed,
        vectorStorageUsedMB: updateData.vectorStorageUsed ?? quota.vectorStorageUsed,
      };

      const currentHistory = Array.isArray(quota.usageHistory) ? [...quota.usageHistory] : [];
      currentHistory.push(historyEntry);

      // Keep only last 30 days of history
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const filteredHistory = currentHistory.filter((entry: any) => {
        const ts = new Date(entry.timestamp);
        return !isNaN(ts.getTime()) && ts > thirtyDaysAgo;
      });

      await tx
        .update(userUsageQuotas)
        .set({ usageHistory: filteredHistory })
        .where(eq(userUsageQuotas.id, quota.id));

      return { success: true, updatedQuota: { ...quota, ...updateData } };
    });
  }

  /**
   * Get user's current subscription and usage information
   */
  async getUserSubscriptionInfo(userId: string) {
    const subscription = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(sql`current_period_end DESC`)
      .limit(1);

    if (subscription.length === 0) {
      return null;
    }

    const usageQuota = await db
      .select()
      .from(userUsageQuotas)
      .where(and(eq(userUsageQuotas.userId, userId), gte(userUsageQuotas.periodEnd, new Date())))
      .limit(1);

    const userCreditsRecord = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    return {
      subscription: subscription[0],
      usageQuota: usageQuota[0] || null,
      currentCredits: userCreditsRecord[0]?.balance || 0,
    };
  }

  /**
   * Get comprehensive usage limits and current usage
   */
  async getUsageLimits(userId: string): Promise<UsageLimits | null> {
    const subscriptionInfo = await this.getUserSubscriptionInfo(userId);
    if (!subscriptionInfo) {
      return null;
    }

    const { subscription, usageQuota, currentCredits } = subscriptionInfo;

    return {
      credits: {
        used: usageQuota?.creditsUsed || 0,
        limit: subscription.monthlyCredits,
        remaining: subscription.monthlyCredits - (usageQuota?.creditsUsed || 0),
      },
      fileStorage: {
        usedMB: usageQuota?.fileStorageUsed || 0,
        limitMB: subscription.fileStorageLimit * 1024, // Convert GB to MB
        remainingMB: subscription.fileStorageLimit * 1024 - (usageQuota?.fileStorageUsed || 0),
        usedGB: (usageQuota?.fileStorageUsed || 0) / 1024,
        limitGB: subscription.fileStorageLimit,
        remainingGB: subscription.fileStorageLimit - (usageQuota?.fileStorageUsed || 0) / 1024,
      },
      vectorStorage: {
        usedMB: usageQuota?.vectorStorageUsed || 0,
        limitMB: subscription.vectorStorageLimit,
        remainingMB: subscription.vectorStorageLimit - (usageQuota?.vectorStorageUsed || 0),
      },
    };
  }

  /**
   * Check if user has exceeded their usage limits
   */
  async checkUsageLimits(userId: string) {
    const usageLimits = await this.getUsageLimits(userId);
    if (!usageLimits) {
      return { exceeded: false, limits: null };
    }

    const exceeded = {
      credits: usageLimits.credits.used >= usageLimits.credits.limit,
      fileStorage: usageLimits.fileStorage.usedMB >= usageLimits.fileStorage.limitMB,
      vectorStorage: usageLimits.vectorStorage.usedMB >= usageLimits.vectorStorage.limitMB,
    };

    return {
      exceeded: exceeded.credits || exceeded.fileStorage || exceeded.vectorStorage,
      limits: exceeded,
      usageLimits,
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
        // Move current usage to archive
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
   * Cancel a subscription
   */
  async cancelSubscription(
    userId: string,
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ) {
    return db.transaction(async (tx) => {
      await tx
        .update(userSubscriptions)
        .set({
          cancelAtPeriodEnd,
          canceledAt: cancelAtPeriodEnd ? undefined : new Date(),
          status: cancelAtPeriodEnd ? 'active' : 'canceled',
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
    });
  }

  /**
   * Remove a deleted subscription completely
   */
  async removeDeletedSubscription(userId: string, subscriptionId: string) {
    return db.transaction(async (tx) => {
      // Remove the subscription
      await tx
        .delete(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

      // Archive current usage quota
      const currentUsage = await tx
        .select()
        .from(userUsageQuotas)
        .where(and(eq(userUsageQuotas.userId, userId), gte(userUsageQuotas.periodEnd, new Date())))
        .limit(1);

      if (currentUsage.length > 0) {
        await tx
          .update(userUsageQuotas)
          .set({ periodEnd: new Date() })
          .where(eq(userUsageQuotas.id, currentUsage[0].id));
      }
    });
  }

  /**
   * Sync subscription status with Stripe and clean up if subscription no longer exists
   */
  async syncSubscriptionWithStripe(userId: string, stripeSubscriptionId: string, stripe: Stripe) {
    try {
      // Try to retrieve the subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      if (stripeSubscription.status === 'canceled') {
        // Subscription is canceled in Stripe, remove it from our database
        console.log(
          `Subscription ${stripeSubscriptionId} is canceled in Stripe, removing from database`,
        );
        return await this.removeDeletedSubscription(userId, stripeSubscriptionId);
      } else {
        // Update subscription status to match Stripe
        const product = await stripe.products.retrieve(
          stripeSubscription.items.data[0].price.product as string,
        );
        const plan = PlanMapper.getPlanFromStripeProduct(product);

        if (plan) {
          await this.upsertSubscription(
            userId,
            stripeSubscription.id,
            stripeSubscription.customer as string,
            stripeSubscription.items.data[0].price.id,
            plan,
            mapStripeStatus(stripeSubscription.status),
            new Date(stripeSubscription.current_period_start * 1000),
            new Date(stripeSubscription.current_period_end * 1000),
            stripeSubscription.cancel_at_period_end,
            stripeSubscription.canceled_at
              ? new Date(stripeSubscription.canceled_at * 1000)
              : undefined,
          );
          console.log(`Subscription ${stripeSubscriptionId} synced with Stripe`);
          return { success: true, message: 'Subscription synced successfully' };
        }
      }
    } catch (error) {
      console.error('Error syncing subscription with Stripe:', error);
      throw error;
    }
  }

  /**
   * Find and clean up orphaned subscriptions (exist in DB but not in Stripe)
   */
  async cleanupOrphanedSubscriptions(stripe: Stripe) {
    const results = [];

    try {
      // Get all subscriptions from our database
      const allSubscriptions = await db.select().from(userSubscriptions);

      for (const subscription of allSubscriptions) {
        try {
          // Try to retrieve from Stripe
          await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId!);
          console.log(`Subscription ${subscription.stripeSubscriptionId} exists in Stripe`);
        } catch (error) {
          if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
            // Subscription doesn't exist in Stripe, remove it
            console.log(
              `Found orphaned subscription ${subscription.stripeSubscriptionId}, removing...`,
            );
            const result = await this.removeDeletedSubscription(
              subscription.userId,
              subscription.stripeSubscriptionId!,
            );
            results.push({
              subscriptionId: subscription.stripeSubscriptionId,
              userId: subscription.userId,
              result,
            });
          }
        }
      }

      return { success: true, cleanedUp: results.length, results };
    } catch (error) {
      console.error('Error cleaning up orphaned subscriptions:', error);
      throw error;
    }
  }
}

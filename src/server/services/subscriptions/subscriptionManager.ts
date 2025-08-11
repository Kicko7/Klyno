import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/database';
import { creditTransactions } from '@/database/schemas/creditTransactions';
import { users } from '@/database/schemas/user';
import { userCredits } from '@/database/schemas/userCredits';
import { userSubscriptions } from '@/database/schemas/userSubscriptions';
import { userUsageQuotas } from '@/database/schemas/userUsageQuotas';

import { PlanMapper } from './planMapper';

// Helper function to map Stripe subscription status to supported status values
function mapStripeStatus(
  status: Stripe.Subscription.Status,
):
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid' {
  switch (status) {
    case 'active':
    case 'trialing':
      return status;
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return status;
    case 'past_due':
    case 'unpaid':
      return status;
    case 'paused':
      // Treat paused subscriptions as active for now
      return 'active';
    default:
      // Default to incomplete for unknown statuses
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

export class SubscriptionManager {
  /**
   * Create or update a user subscription from Stripe webhook data
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

      // Create or update usage quota for the new billing period
      await this.createOrUpdateUsageQuota(tx, userId, plan, currentPeriodStart, currentPeriodEnd);
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
   * Allocate monthly credits for an active subscription
   */
  async allocateMonthlyCredits(userId: string, subscriptionId: string) {
    return db.transaction(async (tx) => {
      const subscription = await tx
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.id, subscriptionId))
        .limit(1);

      if (subscription.length === 0 || subscription[0].status !== 'active') {
        throw new Error('Subscription not found or not active');
      }

      const sub = subscription[0];
      const creditsToAdd = sub.monthlyCredits;

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
      } else {
        await tx
          .update(userCredits)
          .set({
            balance: userCreditsRecord[0].balance + creditsToAdd,
            lastUpdated: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userCredits.userId, userId));
      }

      // Record the transaction
      await tx.insert(creditTransactions).values({
        id: `tx_${userId}_${Date.now()}`,
        userId,
        type: 'subscription_allocation',
        amount: creditsToAdd,
        currency: sub.currency,
        stripeEventId: `monthly_alloc_${Date.now()}`,
        priceId: sub.stripePriceId,
        productId: sub.planId,
        metadata: {
          subscriptionId: sub.id,
          billingPeriod: {
            start: sub.currentPeriodStart,
            end: sub.currentPeriodEnd,
          },
        },
      });

      return { success: true, creditsAdded: creditsToAdd };
    });
  }

  /**
   * Get user's current subscription and usage information
   */
  async getUserSubscriptionInfo(userId: string) {
    const subscription = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          inArray(userSubscriptions.status, ['active', 'trialing']),
        ),
      )
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
        .where(and(eq(userSubscriptions.id, subscriptionId), eq(userSubscriptions.userId, userId)));
    });
  }

  /**
   * Completely remove a deleted subscription and clean up related data
   */
  async removeDeletedSubscription(userId: string, stripeSubscriptionId: string) {
    return db.transaction(async (tx) => {
      // Find the subscription by Stripe ID
      const subscription = await tx
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .limit(1);

      if (subscription.length === 0) {
        console.log(`Subscription ${stripeSubscriptionId} not found in database`);
        return { success: false, message: 'Subscription not found' };
      }

      const sub = subscription[0];

      // Remove usage quotas for this subscription
      await tx.delete(userUsageQuotas).where(eq(userUsageQuotas.userId, userId));

      // Remove the subscription record
      await tx
        .delete(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

      console.log(`Subscription ${stripeSubscriptionId} completely removed for user ${userId}`);

      return { success: true, message: 'Subscription removed successfully' };
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
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        // Subscription doesn't exist in Stripe anymore, remove it from our database
        console.log(
          `Subscription ${stripeSubscriptionId} not found in Stripe, removing from database`,
        );
        return await this.removeDeletedSubscription(userId, stripeSubscriptionId);
      } else {
        console.error(`Error syncing subscription ${stripeSubscriptionId}:`, error);
        throw error;
      }
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

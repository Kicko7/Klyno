import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/database';
import { creditTransactions } from '@/database/schemas/creditTransactions';
import { userCredits } from '@/database/schemas/userCredits';

export class CreditManager {
  /**
   * Add credits to user balance (for purchases)
   */
  async addCredits(
    userId: string,
    amount: number,
    stripeEventId: string,
    metadata: {
      priceId?: string;
      productId?: string;
      stripePaymentIntentId?: string;
      stripeChargeId?: string;
      currency?: string;
    },
  ) {
    return db.transaction(async (tx) => {
      // Check if this event has already been processed
      const existingTransaction = await tx
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.stripeEventId, stripeEventId))
        .limit(1);

      if (existingTransaction.length > 0) {
        // Event already processed, skip
        return { success: true, message: 'Event already processed' };
      }

      // Get or create user credits record
      let userCreditsRecord = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      if (userCreditsRecord.length === 0) {
        // Create new user credits record
        await tx.insert(userCredits).values({
          id: `credits_${userId}_${Date.now()}`,
          userId,
          balance: amount,
        });
      } else {
        // Update existing balance with SELECT FOR UPDATE for concurrency safety
        await tx
          .update(userCredits)
          .set({
            balance: sql`${userCredits.balance} + ${amount}`,
            lastUpdated: new Date(),
          })
          .where(eq(userCredits.userId, userId));
      }

      // Record the transaction
      await tx.insert(creditTransactions).values({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId,
        type: 'purchase',
        amount,
        currency: metadata.currency || 'usd',
        stripeEventId,
        stripePaymentIntentId: metadata.stripePaymentIntentId,
        stripeChargeId: metadata.stripeChargeId,
        priceId: metadata.priceId,
        productId: metadata.productId,
        metadata: { source: 'stripe_checkout' },
      });

      return { success: true, message: 'Credits added successfully' };
    });
  }

  /**
   * Refund credits (for charge.refunded events)
   */
  async refundCredits(
    userId: string,
    amount: number,
    stripeEventId: string,
    metadata: {
      stripePaymentIntentId?: string;
      stripeChargeId?: string;
      currency?: string;
    },
  ) {
    return db.transaction(async (tx) => {
      // Check if this event has already been processed
      const existingTransaction = await tx
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.stripeEventId, stripeEventId))
        .limit(1);

      if (existingTransaction.length > 0) {
        return { success: true, message: 'Event already processed' };
      }

      // Update user balance
      await tx
        .update(userCredits)
        .set({
          balance: sql`${userCredits.balance} - ${amount}`,
          lastUpdated: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // Record the refund transaction
      await tx.insert(creditTransactions).values({
        id: `refund_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId,
        type: 'refund',
        amount: -amount, // Negative amount for refunds
        currency: metadata.currency || 'usd',
        stripeEventId,
        stripePaymentIntentId: metadata.stripePaymentIntentId,
        stripeChargeId: metadata.stripeChargeId,
        metadata: { source: 'stripe_refund' },
      });

      return { success: true, message: 'Credits refunded successfully' };
    });
  }

  /**
   * Consume credits for usage (e.g., team chat assistant message)
   * - Idempotent per messageId (uses transaction id derived from messageId if provided)
   */
  async consumeCredits(
    userId: string,
    amount: number,
    metadata: {
      messageId?: string;
      teamChatId?: string;
      source?: 'team_chat' | string;
      currency?: string;
    } = {},
  ) {
    console.log(
      '[CreditManager] consumeCredits:start',
      JSON.stringify({
        userId,
        amount,
        messageId: metadata.messageId,
        teamChatId: metadata.teamChatId,
        source: metadata.source,
      }),
    );
    if (amount <= 0) return { success: true, message: 'No credits to consume' };

    const txId = metadata.messageId
      ? `usage_${metadata.messageId}`
      : `usage_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return db.transaction(async (tx) => {
      // Idempotency: skip if this usage already recorded
      const existing = await tx
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.id, txId))
        .limit(1);

      if (existing.length > 0) {
        console.log('[CreditManager] consumeCredits:idempotent-skip', txId);
        return { success: true, message: 'Usage already recorded' };
      }

      // Ensure user has enough balance
      const creditsRow = await tx
        .select({ balance: userCredits.balance })
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      const currentBalance = creditsRow[0]?.balance ?? 0;
      console.log('[CreditManager] consumeCredits:balance-check', {
        userId,
        currentBalance,
        amount,
      });
      if (currentBalance < amount) {
        console.error('[CreditManager] consumeCredits:insufficient', {
          userId,
          currentBalance,
          amount,
        });
        throw new Error('Insufficient credits');
      }

      // Deduct balance
      await tx
        .update(userCredits)
        .set({ balance: sql`${userCredits.balance} - ${amount}`, lastUpdated: new Date() })
        .where(eq(userCredits.userId, userId));

      // Record usage transaction (negative amount)
      await tx.insert(creditTransactions).values({
        id: txId,
        userId,
        type: 'usage',
        amount: -amount,
        currency: metadata.currency || 'usd',
        metadata: {
          source: metadata.source || 'team_chat',
          teamChatId: metadata.teamChatId,
          messageId: metadata.messageId,
        },
      });

      console.log('[CreditManager] consumeCredits:success', { txId, userId, amount });
      return { success: true, message: 'Credits consumed' };
    });
  }

  /**
   * Find transaction by Stripe payment intent ID
   */
  async findTransactionByPaymentIntent(paymentIntentId: string) {
    const result = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.stripePaymentIntentId, paymentIntentId),
          eq(creditTransactions.type, 'purchase'),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get user's current credit balance
   */
  async getUserBalance(userId: string): Promise<number> {
    const result = await db
      .select({ balance: userCredits.balance })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    return result[0]?.balance || 0;
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(userId: string, limit = 50) {
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(sql`${creditTransactions.transactionDate} DESC`)
      .limit(limit);
  }
}

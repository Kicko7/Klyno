import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { timestamps } from './_helpers';
import { users } from './user';

/**
 * Credit transactions table - tracks all credit purchases, refunds, and usage
 */
export const creditTransactions = pgTable('credit_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Transaction details
  type: text('type', {
    enum: ['purchase', 'refund', 'usage', 'subscription_allocation', 'subscription_renewal'],
  }).notNull(),
  amount: integer('amount').notNull(), // Positive for purchases, negative for refunds/usage
  currency: text('currency').notNull().default('usd'),

  // Stripe integration
  stripeEventId: text('stripe_event_id').unique(), // For idempotency
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeChargeId: text('stripe_charge_id'),

  // Product details
  priceId: text('price_id'),
  productId: text('product_id'),

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamps
  transactionDate: timestamp('transaction_date').notNull().defaultNow(),

  ...timestamps,
});

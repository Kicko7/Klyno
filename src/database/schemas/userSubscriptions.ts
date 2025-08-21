import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { timestamps } from './_helpers';
import { users } from './user';

/**
 * User subscriptions table - tracks Stripe subscription status and billing cycles
 */
export const userSubscriptions = pgTable('user_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Stripe integration
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripePriceId: text('stripe_price_id'),

  // Subscription details
  planId: text('plan_id').notNull(), 
  planName: text('plan_name').notNull(),
  status: text('status', {
    enum: [
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'trialing',
      'unpaid',
    ],
  })
    .notNull()
    .default('incomplete'),

  // Billing cycle
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),

  // Usage limits (from plan)
  monthlyCredits: integer('monthly_credits').notNull().default(0),
  fileStorageLimit: integer('file_storage_limit_gb').notNull().default(1), // in GB
  vectorStorageLimit: integer('vector_storage_limit_mb').notNull().default(50), // in MB
  balance: integer('balance').notNull().default(0),

  // Billing information
  currency: text('currency').notNull().default('usd'),
  amount: integer('amount'), // Amount in cents
  interval: text('interval', { enum: ['month', 'year'] }),

  // Metadata
  metadata: jsonb('metadata'),

  ...timestamps,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type UserSubscriptionItem = typeof userSubscriptions.$inferSelect;

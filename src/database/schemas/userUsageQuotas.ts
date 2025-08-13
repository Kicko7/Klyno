import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { timestamps } from './_helpers';
import { users } from './user';

/**
 * User usage quotas table - tracks current usage against subscription limits
 */
export const userUsageQuotas = pgTable('user_usage_quotas', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Current billing period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Credit usage
  creditsUsed: integer('credits_used').notNull().default(0),
  creditsLimit: integer('credits_limit').notNull().default(0),

  // Storage usage
  fileStorageUsed: integer('file_storage_used_mb').notNull().default(0), // in MB
  fileStorageLimit: integer('file_storage_limit_mb').notNull().default(1024), // in MB
  vectorStorageUsed: integer('vector_storage_used_mb').notNull().default(0), // in MB
  vectorStorageLimit: integer('vector_storage_limit_mb').notNull().default(50), // in MB

  // Usage tracking
  lastUsageUpdate: timestamp('last_usage_update').notNull().defaultNow(),
  usageHistory: jsonb('usage_history'), // JSON array of daily usage snapshots

  // Metadata
  metadata: jsonb('metadata'),

  ...timestamps,
});

export const insertUserUsageQuotaSchema = createInsertSchema(userUsageQuotas);
export type NewUserUsageQuota = typeof userUsageQuotas.$inferInsert;
export type UserUsageQuotaItem = typeof userUsageQuotas.$inferSelect;

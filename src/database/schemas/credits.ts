import { integer, json, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const credits = pgTable('credits', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  messageId: text('message_id').notNull(),
  amount: integer('amount').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  metadata: json('metadata'),
});

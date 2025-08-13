import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { timestamps } from './_helpers';
import { users } from './user';

/**
 * User credits balance table - tracks available credits for each user
 */
export const userCredits = pgTable('user_credits', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),

  ...timestamps,
});

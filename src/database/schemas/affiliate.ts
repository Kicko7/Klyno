import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { userSubscriptions } from "./userSubscriptions";
import { idGenerator } from "../utils/idGenerator";



export const affiliate = pgTable('affiliate', {
  id: text('id').primaryKey().$defaultFn(() => idGenerator('affiliate')),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  affiliateUserId: text('affiliate_user_id').references(() => users.id, { onDelete: 'cascade' }),
  planPurchaseId: text('plan_purchase_id').references(() => userSubscriptions.id, { onDelete: 'cascade' }),
  link: text('link').notNull(),
});


export const affiliateInfo = pgTable('affiliate_info', {
  id: text('id').primaryKey().$defaultFn(() => idGenerator('affiliate_links')),
  link: text('link').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  totalClicks: integer('total_clicks').default(0),
  totalSignups: integer('total_signups').default(0),
  totalRevenue: integer('total_revenue').default(0),
  conversionRate: integer('conversion_rate').default(0),
});

export type NewAffiliate = typeof affiliate.$inferInsert;
export type AffiliateItem = typeof affiliate.$inferSelect;

export type AffiliateInfoItem = typeof affiliateInfo.$inferSelect;
export type NewAffiliateInfo = typeof affiliateInfo.$inferInsert;


export const affiliateWithdrawals = pgTable('affiliate_withdrawals', {
  id: text('id').primaryKey().$defaultFn(() => idGenerator('affiliate_withdrawals')),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  status: text('status', { enum: ['pending', 'paid',] }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type AffiliateWithdrawalItem = typeof affiliateWithdrawals.$inferSelect;
export type NewAffiliateWithdrawal = typeof affiliateWithdrawals.$inferInsert;
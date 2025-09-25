import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export class Migration0044AddSubscriptionTables {
  version = 44;

  async up(db: PostgresJsDatabase) {
    console.log('🔄 Starting migration 0044: Adding subscription tables...');

    try {
      // Create user_subscriptions table
      console.log('📋 Creating user_subscriptions table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "user_subscriptions" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "stripe_subscription_id" text UNIQUE,
          "stripe_customer_id" text,
          "stripe_price_id" text,
          "plan_id" text NOT NULL,
          "plan_name" text NOT NULL,
          "status" text NOT NULL DEFAULT 'incomplete',
          "current_period_start" timestamp,
          "current_period_end" timestamp,
          "cancel_at_period_end" boolean DEFAULT false,
          "canceled_at" timestamp,
          "monthly_credits" integer NOT NULL DEFAULT 0,
          "file_storage_limit_gb" integer NOT NULL DEFAULT 1,
          "vector_storage_limit_mb" integer NOT NULL DEFAULT 50,
          "currency" text NOT NULL DEFAULT 'usd',
          "amount" integer,
          "interval" text,
          "metadata" jsonb,
          "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `);
      console.log('✅ user_subscriptions table created successfully');

      // Create user_usage_quotas table
      console.log('📊 Creating user_usage_quotas table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "user_usage_quotas" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "period_start" timestamp NOT NULL,
          "period_end" timestamp NOT NULL,
          "credits_used" integer NOT NULL DEFAULT 0,
          "credits_limit" integer NOT NULL DEFAULT 0,
          "file_storage_used_mb" integer NOT NULL DEFAULT 0,
          "file_storage_limit_mb" integer NOT NULL DEFAULT 1024,
          "vector_storage_used_mb" integer NOT NULL DEFAULT 0,
          "vector_storage_limit_mb" integer NOT NULL DEFAULT 50,
          "last_usage_update" timestamp NOT NULL DEFAULT now(),
          "usage_history" jsonb,
          "metadata" jsonb,
          "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "user_usage_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `);
      console.log('✅ user_usage_quotas table created successfully');

      // Create user_credits table if it doesn't exist
      console.log('💰 Creating user_credits table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "user_credits" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "balance" integer NOT NULL DEFAULT 0,
          "last_updated" timestamp NOT NULL DEFAULT now(),
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `);
      console.log('✅ user_credits table created successfully');

      // Create credit_transactions table if it doesn't exist
      console.log('💳 Creating credit_transactions table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "credit_transactions" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "type" text NOT NULL CHECK (type IN ('purchase', 'refund', 'usage', 'subscription_allocation', 'subscription_renewal')),
          "amount" integer NOT NULL,
          "currency" text NOT NULL DEFAULT 'usd',
          "stripe_event_id" text UNIQUE,
          "stripe_payment_intent_id" text,
          "stripe_charge_id" text,
          "price_id" text,
          "product_id" text,
          "metadata" jsonb,
          "transaction_date" timestamp NOT NULL DEFAULT now(),
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `);
      console.log('✅ credit_transactions table created successfully');

      // Add stripe_customer_id to users table if it doesn't exist
      console.log('👤 Adding stripe_customer_id to users table...');
      await db.execute(sql`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
      `);
      console.log('✅ stripe_customer_id column added to users table');

      // Create indexes for better performance
      console.log('🔍 Creating database indexes...');
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "user_subscriptions_user_id_idx" ON "user_subscriptions" ("user_id");
        CREATE INDEX IF NOT EXISTS "user_subscriptions_stripe_subscription_id_idx" ON "user_subscriptions" ("stripe_subscription_id");
        CREATE INDEX IF NOT EXISTS "user_subscriptions_status_idx" ON "user_subscriptions" ("status");
        CREATE INDEX IF NOT EXISTS "user_usage_quotas_user_id_idx" ON "user_usage_quotas" ("user_id");
        CREATE INDEX IF NOT EXISTS "user_usage_quotas_period_end_idx" ON "user_usage_quotas" ("period_end");
        CREATE INDEX IF NOT EXISTS "user_credits_user_id_idx" ON "user_credits" ("user_id");
        CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions" ("user_id");
        CREATE INDEX IF NOT EXISTS "credit_transactions_stripe_event_id_idx" ON "credit_transactions" ("stripe_event_id");
      `);
      console.log('✅ Database indexes created successfully');

      console.log('🎉 Migration 0044: Subscription tables created successfully');
    } catch (error) {
      console.error('❌ Error during migration:', error);
      throw error;
    }
  }

  async down(db: PostgresJsDatabase) {
    console.log('🔄 Rolling back migration 0044...');

    try {
      // Drop tables in reverse order
      await db.execute(sql`DROP TABLE IF EXISTS "credit_transactions" CASCADE;`);
      console.log('✅ credit_transactions table dropped');

      await db.execute(sql`DROP TABLE IF EXISTS "user_credits" CASCADE;`);
      console.log('✅ user_credits table dropped');

      await db.execute(sql`DROP TABLE IF EXISTS "user_usage_quotas" CASCADE;`);
      console.log('✅ user_usage_quotas table dropped');

      await db.execute(sql`DROP TABLE IF EXISTS "user_subscriptions" CASCADE;`);
      console.log('✅ user_subscriptions table dropped');

      // Remove stripe_customer_id column from users table
      await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";`);
      console.log('✅ stripe_customer_id column removed from users table');

      console.log('✅ Migration 0044: Subscription tables dropped successfully');
    } catch (error) {
      console.error('❌ Error during rollback:', error);
      throw error;
    }
  }
}

import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { ConfigStateAll } from '@/types/exportConfig';

export class MigrationV7ToV8 {
  version = 8;

  async up(db: PostgresJsDatabase) {
    // Add stripe_customer_id to users table
    await db.execute(sql`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
    `);

    // Create user_credits table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_credits" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "balance" integer NOT NULL DEFAULT 0,
        "last_updated" timestamp NOT NULL DEFAULT now(),
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        "accessed_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Create credit_transactions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "credit_transactions" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "type" text NOT NULL CHECK ("type" IN ('purchase', 'refund', 'usage')),
        "amount" integer NOT NULL,
        "currency" text NOT NULL DEFAULT 'usd',
        "stripe_event_id" text UNIQUE,
        "stripe_payment_intent_id" text,
        "stripe_charge_id" text,
        "price_id" text,
        "product_id" text,
        "metadata" jsonb,
        "transaction_date" timestamp NOT NULL DEFAULT now(),
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        "accessed_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_credits_user_id_idx" ON "user_credits" ("user_id");
      CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions" ("user_id");
      CREATE INDEX IF NOT EXISTS "credit_transactions_stripe_event_id_idx" ON "credit_transactions" ("stripe_event_id");
      CREATE INDEX IF NOT EXISTS "credit_transactions_stripe_payment_intent_id_idx" ON "credit_transactions" ("stripe_payment_intent_id");
      CREATE INDEX IF NOT EXISTS "credit_transactions_type_idx" ON "credit_transactions" ("type");
      CREATE INDEX IF NOT EXISTS "credit_transactions_transaction_date_idx" ON "credit_transactions" ("transaction_date");
    `);
  }

  async down(db: PostgresJsDatabase) {
    // Drop indexes
    await db.execute(sql`
      DROP INDEX IF EXISTS "credit_transactions_transaction_date_idx";
      DROP INDEX IF EXISTS "credit_transactions_type_idx";
      DROP INDEX IF EXISTS "credit_transactions_stripe_payment_intent_id_idx";
      DROP INDEX IF EXISTS "credit_transactions_stripe_event_id_idx";
      DROP INDEX IF EXISTS "credit_transactions_user_id_idx";
      DROP INDEX IF EXISTS "user_credits_user_id_idx";
    `);

    // Drop tables
    await db.execute(sql`
      DROP TABLE IF EXISTS "credit_transactions";
      DROP TABLE IF EXISTS "user_credits";
    `);

    // Remove stripe_customer_id column
    await db.execute(sql`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";
    `);
  }
}

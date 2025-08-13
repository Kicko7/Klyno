CREATE TABLE "credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	"amount" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"stripe_event_id" text,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"price_id" text,
	"product_id" text,
	"metadata" jsonb,
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transactions_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "team_chat_presence" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
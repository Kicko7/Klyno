CREATE TABLE "user_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"stripe_price_id" text,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"monthly_credits" integer DEFAULT 0 NOT NULL,
	"file_storage_limit_gb" integer DEFAULT 1 NOT NULL,
	"vector_storage_limit_mb" integer DEFAULT 50 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"amount" integer,
	"interval" text,
	"metadata" jsonb,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "user_usage_quotas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"credits_limit" integer DEFAULT 0 NOT NULL,
	"file_storage_used_mb" integer DEFAULT 0 NOT NULL,
	"file_storage_limit_mb" integer DEFAULT 1024 NOT NULL,
	"vector_storage_used_mb" integer DEFAULT 0 NOT NULL,
	"vector_storage_limit_mb" integer DEFAULT 50 NOT NULL,
	"last_usage_update" timestamp DEFAULT now() NOT NULL,
	"usage_history" jsonb,
	"metadata" jsonb,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_usage_quotas" ADD CONSTRAINT "user_usage_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
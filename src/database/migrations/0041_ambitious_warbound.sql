CREATE TABLE "team_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"team_chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'user',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Team Chat',
	"description" text,
	"organization_id" text NOT NULL,
	"team_id" text,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_chat_messages" ADD CONSTRAINT "team_chat_messages_team_chat_id_team_chats_id_fk" FOREIGN KEY ("team_chat_id") REFERENCES "public"."team_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_chat_messages" ADD CONSTRAINT "team_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_chats" ADD CONSTRAINT "team_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
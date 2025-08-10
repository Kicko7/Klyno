CREATE TABLE "team_chat_presence" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"team_chat_id" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_active_at" timestamp DEFAULT now(),
	"last_seen_message_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_chats" ALTER COLUMN "metadata" SET DEFAULT '{"memberAccess":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "team_chat_presence" ADD CONSTRAINT "team_chat_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_chat_presence" ADD CONSTRAINT "team_chat_presence_team_chat_id_team_chats_id_fk" FOREIGN KEY ("team_chat_id") REFERENCES "public"."team_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_chat_presence_user_chat_idx" ON "team_chat_presence" USING btree ("user_id","team_chat_id");
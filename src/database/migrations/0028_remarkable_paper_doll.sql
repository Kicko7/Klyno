CREATE TABLE "team_activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_message_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'text',
	"metadata" jsonb,
	"is_edited" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_activity_log" ADD CONSTRAINT "team_activity_log_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_activity_log" ADD CONSTRAINT "team_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_message_reactions" ADD CONSTRAINT "team_message_reactions_message_id_team_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."team_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_message_reactions" ADD CONSTRAINT "team_message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_channel_id_team_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."team_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "teams" ADD COLUMN "team_members" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "organizer_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
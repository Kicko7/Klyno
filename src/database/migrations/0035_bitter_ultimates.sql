CREATE TABLE "organization_invitations" (
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "team_activity_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_channels" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_message_reactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "team_activity_log" CASCADE;--> statement-breakpoint
DROP TABLE "team_channels" CASCADE;--> statement-breakpoint
DROP TABLE "team_invitations" CASCADE;--> statement-breakpoint
DROP TABLE "team_members" CASCADE;--> statement-breakpoint
DROP TABLE "team_message_reactions" CASCADE;--> statement-breakpoint
DROP TABLE "team_messages" CASCADE;--> statement-breakpoint
DROP TABLE "teams" CASCADE;--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_slug_unique";--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_clerk_org_id_unique";--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" DROP COLUMN "permissions";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "logo";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "settings";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "billing_email";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "subscription_tier";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "clerk_org_id";
ALTER TABLE "organizations" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "clerk_invitation_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id");--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_clerk_invitation_id_unique" UNIQUE("clerk_invitation_id");
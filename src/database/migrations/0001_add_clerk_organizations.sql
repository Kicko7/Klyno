-- Add Clerk organization ID to organizations table
ALTER TABLE organizations 
ADD COLUMN clerk_org_id VARCHAR(255) UNIQUE;

-- Add index for performance
CREATE INDEX idx_organizations_clerk_org_id 
ON organizations(clerk_org_id);

-- Add table for tracking team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id TEXT PRIMARY KEY DEFAULT ('inv_' || nanoid()),
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('leader', 'moderator', 'member')),
  clerk_invitation_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for team invitations
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_clerk_invitation_id ON team_invitations(clerk_invitation_id);

-- Add updated_at trigger for team_invitations
CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

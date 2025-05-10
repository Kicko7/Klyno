-- Add foreign key relationships
ALTER TABLE team_members
  ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES teams(id)
  ON DELETE CASCADE;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Add RLS policies for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own team memberships"
  ON team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Team owners and admins can manage team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_members.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  ); 
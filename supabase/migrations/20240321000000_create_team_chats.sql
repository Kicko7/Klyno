-- Create team_chats table
CREATE TABLE IF NOT EXISTS team_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id TEXT,
  system_prompt TEXT,
  temperature FLOAT DEFAULT 0.7,
  context_length INTEGER DEFAULT 4096
);

-- Create team_messages table
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES team_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id TEXT,
  tokens INTEGER,
  metadata JSONB
);

-- Add RLS policies
ALTER TABLE team_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Team members can view team chats
CREATE POLICY "Team members can view team chats"
  ON team_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chats.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Team members can create team chats
CREATE POLICY "Team members can create team chats"
  ON team_chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chats.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Team members can view team messages
CREATE POLICY "Team members can view team messages"
  ON team_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_chats
      JOIN team_members ON team_members.team_id = team_chats.team_id
      WHERE team_chats.id = team_messages.chat_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Team members can create team messages
CREATE POLICY "Team members can create team messages"
  ON team_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_chats
      JOIN team_members ON team_members.team_id = team_chats.team_id
      WHERE team_chats.id = team_messages.chat_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Enable realtime for team_messages
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages; 
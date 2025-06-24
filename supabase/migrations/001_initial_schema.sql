-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to get user_id from clerk_id
CREATE OR REPLACE FUNCTION get_user_id_from_clerk()
RETURNS UUID AS $$
DECLARE
  user_id_val UUID;
BEGIN
  SELECT id INTO user_id_val FROM users WHERE clerk_id = auth.uid()::text LIMIT 1;
  RETURN user_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_customer_id TEXT,
  settings JSONB
);

-- Plans table
CREATE TABLE plans (
    id TEXT PRIMARY KEY, -- e.g., 'free', 'solo', 'team'
    name TEXT NOT NULL,
    price INT, -- Price in cents
    "interval" TEXT, -- 'month' or 'year'
    included_seats INT,
    included_credits BIGINT,
    overage_credit_price DECIMAL(10, 6), -- Cost per credit over the included amount
    stripe_price_id TEXT,
    features JSONB -- Store feature flags for this plan
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compliance_profile TEXT NOT NULL DEFAULT 'standard' CHECK (compliance_profile IN ('standard', 'hipaa', 'financial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB
);

-- Subscriptions table (references users, teams, plans)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    credit_balance BIGINT NOT NULL DEFAULT 0,
    stripe_subscription_id TEXT UNIQUE,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure a subscription is tied to EITHER a user OR a team, but not both.
    CONSTRAINT user_or_team CHECK (
        (user_id IS NOT NULL AND team_id IS NULL) OR
        (user_id IS NULL AND team_id IS NOT NULL)
    )
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB
);

-- Team Invitations table
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, email)
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- MODIFIED: Usage logs table now uses credits
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  credits_used INTEGER NOT NULL, -- Renamed from tokens_used
  cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- AI Providers Table
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name TEXT NOT NULL,
    api_key_name TEXT NOT NULL,
    api_key_value TEXT NOT NULL, -- Note: Should be encrypted
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings Table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table (for user sessions if needed)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    session_token TEXT UNIQUE NOT NULL
);

-- NEW: Credit management functions
-- Safely consumes credits from a subscription. To be called by the backend service role.
CREATE OR REPLACE FUNCTION consume_credits(p_user_id UUID, p_team_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
    IF p_team_id IS NOT NULL THEN
        UPDATE subscriptions
        SET credit_balance = credit_balance - p_amount
        WHERE team_id = p_team_id AND status = 'active';
    ELSE
        UPDATE subscriptions
        SET credit_balance = credit_balance - p_amount
        WHERE user_id = p_user_id AND status = 'active';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checks if a user or team has sufficient credits.
CREATE OR REPLACE FUNCTION has_sufficient_credits(p_user_id UUID, p_team_id UUID, p_amount BIGINT)
RETURNS boolean AS $$
DECLARE
    v_balance BIGINT;
BEGIN
    IF p_team_id IS NOT NULL THEN
        SELECT credit_balance INTO v_balance FROM subscriptions
        WHERE team_id = p_team_id AND status = 'active';
    ELSE
        SELECT credit_balance INTO v_balance FROM subscriptions
        WHERE user_id = p_user_id AND status = 'active';
    END IF;
    RETURN COALESCE(v_balance, 0) >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_workspaces_team_id ON workspaces(team_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON ai_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = clerk_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = clerk_id);

-- Plans policies
CREATE POLICY "Plans are public" ON plans FOR SELECT USING (true);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions FOR SELECT USING (user_id = get_user_id_from_clerk());
CREATE POLICY "Team members can view their team subscription" ON subscriptions FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = subscriptions.team_id AND team_members.user_id = get_user_id_from_clerk()));

-- Team policies
CREATE POLICY "Team members can view team" ON teams FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = get_user_id_from_clerk()));
CREATE POLICY "Team owners/admins can update team" ON teams FOR UPDATE USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = get_user_id_from_clerk() AND (team_members.role = 'owner' OR team_members.role = 'admin')));

-- Team members policies
CREATE POLICY "Team members can view their own membership" ON team_members FOR SELECT USING (user_id = get_user_id_from_clerk());
CREATE POLICY "Team owners/admins can manage members" ON team_members FOR ALL USING (EXISTS (SELECT 1 FROM team_members tm_admin WHERE tm_admin.team_id = team_members.team_id AND tm_admin.user_id = get_user_id_from_clerk() AND (tm_admin.role = 'owner' OR tm_admin.role = 'admin')));

-- Workspaces policies
CREATE POLICY "Team members can access workspaces" ON workspaces FOR ALL USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workspaces.team_id AND team_members.user_id = get_user_id_from_clerk()));

-- Team Invitations policies
CREATE POLICY "Team owners/admins can manage invitations" ON team_invitations FOR ALL USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_invitations.team_id AND team_members.user_id = get_user_id_from_clerk() AND (team_members.role = 'owner' OR team_members.role = 'admin')));
CREATE POLICY "Invited users can see their own invitations" ON team_invitations FOR SELECT USING (email = (SELECT u.email FROM users u WHERE u.clerk_id = auth.uid()::text));

-- Conversation policies
CREATE POLICY "Users can manage their personal conversations" ON conversations FOR ALL USING (workspace_id IS NULL AND user_id = get_user_id_from_clerk());
CREATE POLICY "Team members can manage conversations in their workspaces" ON conversations FOR ALL USING (workspace_id IS NOT NULL AND EXISTS (SELECT 1 FROM workspaces w JOIN team_members tm ON w.team_id = tm.team_id WHERE w.id = conversations.workspace_id AND tm.user_id = get_user_id_from_clerk()));

-- Message policies
CREATE POLICY "Users can access messages in accessible conversations" ON messages FOR ALL USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id));

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" ON usage_logs FOR SELECT USING (user_id = get_user_id_from_clerk());
CREATE POLICY "Team members can view their team's usage logs" ON usage_logs FOR SELECT USING (team_id IS NOT NULL AND EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = usage_logs.team_id AND team_members.user_id = get_user_id_from_clerk()));

-- AI Providers Policies
CREATE POLICY "Users can manage their own API keys" ON ai_providers FOR ALL USING (user_id = get_user_id_from_clerk() AND team_id IS NULL);
CREATE POLICY "Team admins can manage team API keys" ON ai_providers FOR ALL USING (team_id IS NOT NULL AND EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = ai_providers.team_id AND team_members.user_id = get_user_id_from_clerk() AND (team_members.role = 'owner' OR team_members.role = 'admin')));

-- User Settings Policies
CREATE POLICY "Users can manage their own settings" ON user_settings FOR ALL USING (user_id = get_user_id_from_clerk());

-- Session Policies
CREATE POLICY "Users can manage their own sessions" ON sessions FOR ALL USING (user_id = get_user_id_from_clerk());
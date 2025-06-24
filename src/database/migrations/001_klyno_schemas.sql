-- Klyno AI Database Migration
-- This migration adds team collaboration and subscription features to LobeChat

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Klyno Users - extends existing users table
CREATE TABLE IF NOT EXISTS klyno_users (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT UNIQUE NOT NULL,
  
  -- Subscription info
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'pro', 'ultimate')) DEFAULT 'starter',
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due')) DEFAULT 'active',
  stripe_customer_id TEXT,
  
  -- Usage tracking
  usage_quota INTEGER DEFAULT 1000000, -- 1M tokens for starter
  usage_current INTEGER DEFAULT 0,
  
  -- Klyno-specific settings
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  
  -- Team settings
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member' NOT NULL,
  
  -- Member-specific settings
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (team_id, user_id)
);

-- Create unique index for team members
CREATE UNIQUE INDEX IF NOT EXISTS team_members_team_user_unique ON team_members (team_id, user_id);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  
  -- Workspace settings
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member' NOT NULL,
  
  -- Member-specific settings
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (workspace_id, user_id)
);

-- Create unique index for workspace members
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_user_unique ON workspace_members (workspace_id, user_id);

-- Team Conversations (extends existing conversations)
CREATE TABLE IF NOT EXISTS team_conversations (
  conversation_id TEXT PRIMARY KEY NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Conversation settings
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Messages (extends existing messages)
CREATE TABLE IF NOT EXISTS team_messages (
  message_id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES team_conversations(conversation_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message metadata
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Usage details
  provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost INTEGER, -- in cents
  
  -- Request metadata
  request_type TEXT NOT NULL, -- 'chat', 'completion', etc.
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template content
  content TEXT NOT NULL,
  variables JSONB, -- JSON schema for template variables
  
  -- Ownership
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Template settings
  is_public BOOLEAN DEFAULT FALSE,
  settings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_klyno_users_clerk_id ON klyno_users (clerk_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_team_id ON usage_tracking (team_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id ON prompt_templates (user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_team_id ON prompt_templates (team_id);

-- Add Row Level Security (RLS) policies
ALTER TABLE klyno_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (these should be customized based on your auth system)
-- Users can only see their own data
CREATE POLICY "Users can view own klyno profile" ON klyno_users
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own klyno profile" ON klyno_users
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own klyno profile" ON klyno_users
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Team members can see team data
CREATE POLICY "Team members can view team data" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()::text
    )
  );

-- Add more specific policies as needed for your use case 
-- Fix expires_at column in team_invitations table
-- First drop the incorrect column if it exists
ALTER TABLE team_invitations DROP COLUMN IF EXISTS expires_at;

-- Add the correct expires_at column
ALTER TABLE team_invitations ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days');

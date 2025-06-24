/* eslint-disable sort-keys-fix/sort-keys-fix */
import { jsonb, pgTable, primaryKey, text, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

import { timestamps } from './_helpers';
import { users } from './user';

// Klyno Users - extends existing users table
export const klynoUsers = pgTable('klyno_users', {
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  
  clerkId: text('clerk_id').unique().notNull(),
  
  // Subscription info
  subscriptionTier: text('subscription_tier', { 
    enum: ['starter', 'pro', 'ultimate'] 
  }).default('starter'),
  subscriptionStatus: text('subscription_status', { 
    enum: ['active', 'canceled', 'past_due'] 
  }).default('active'),
  stripeCustomerId: text('stripe_customer_id'),
  
  // Usage tracking
  usageQuota: integer('usage_quota').default(1_000_000), // 1M tokens for starter
  usageCurrent: integer('usage_current').default(0),
  
  // Klyno-specific settings
  settings: jsonb('settings'),
  
  ...timestamps,
});

// Teams
export const teams = pgTable('teams', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  
  // Team settings
  settings: jsonb('settings'),
  
  ...timestamps,
});

// Team Members
export const teamMembers = pgTable('team_members', {
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  
  role: text('role', { 
    enum: ['owner', 'admin', 'member'] 
  }).default('member').notNull(),
  
  // Member-specific settings
  settings: jsonb('settings'),
  
  ...timestamps,
}, (t) => ({
  pk: primaryKey({ columns: [t.teamId, t.userId] }),
  teamUserUnique: uniqueIndex('team_members_team_user_unique').on(t.teamId, t.userId),
}));

// Workspaces
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey().notNull(),
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  
  name: text('name').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  
  // Workspace settings
  settings: jsonb('settings'),
  
  ...timestamps,
});

// Workspace Members
export const workspaceMembers = pgTable('workspace_members', {
  workspaceId: text('workspace_id')
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  
  role: text('role', { 
    enum: ['owner', 'admin', 'member', 'viewer'] 
  }).default('member').notNull(),
  
  // Member-specific settings
  settings: jsonb('settings'),
  
  ...timestamps,
}, (t) => ({
  pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
  workspaceUserUnique: uniqueIndex('workspace_members_workspace_user_unique').on(t.workspaceId, t.userId),
}));

// Team Conversations (extends existing conversations)
export const teamConversations = pgTable('team_conversations', {
  conversationId: text('conversation_id').primaryKey().notNull(),
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  workspaceId: text('workspace_id')
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Conversation settings
  settings: jsonb('settings'),
  
  ...timestamps,
});

// Team Messages (extends existing messages)
export const teamMessages = pgTable('team_messages', {
  messageId: text('message_id').primaryKey().notNull(),
  conversationId: text('conversation_id')
    .references(() => teamConversations.conversationId, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  
  // Message metadata
  metadata: jsonb('metadata'),
  
  ...timestamps,
});

// Usage Tracking
export const usageTracking = pgTable('usage_tracking', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' }),
  
  // Usage details
  provider: text('provider').notNull(), // 'openai', 'anthropic', etc.
  model: text('model').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  cost: integer('cost'), // in cents
  
  // Request metadata
  requestType: text('request_type').notNull(), // 'chat', 'completion', etc.
  metadata: jsonb('metadata'),
  
  ...timestamps,
});

// Prompt Templates
export const promptTemplates = pgTable('prompt_templates', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  
  // Template content
  content: text('content').notNull(),
  variables: jsonb('variables'), // JSON schema for template variables
  
  // Ownership
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' }),
  
  // Template settings
  isPublic: boolean('is_public').default(false),
  settings: jsonb('settings'),
  
  ...timestamps,
});

// Export types
export type NewKlynoUser = typeof klynoUsers.$inferInsert;
export type KlynoUserItem = typeof klynoUsers.$inferSelect;

export type NewTeam = typeof teams.$inferInsert;
export type TeamItem = typeof teams.$inferSelect;

export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamMemberItem = typeof teamMembers.$inferSelect;

export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceItem = typeof workspaces.$inferSelect;

export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspaceMemberItem = typeof workspaceMembers.$inferSelect;

export type NewTeamConversation = typeof teamConversations.$inferInsert;
export type TeamConversationItem = typeof teamConversations.$inferSelect;

export type NewTeamMessage = typeof teamMessages.$inferInsert;
export type TeamMessageItem = typeof teamMessages.$inferSelect;

export type NewUsageTracking = typeof usageTracking.$inferInsert;
export type UsageTrackingItem = typeof usageTracking.$inferSelect;

export type NewPromptTemplate = typeof promptTemplates.$inferInsert;
export type PromptTemplateItem = typeof promptTemplates.$inferSelect; 
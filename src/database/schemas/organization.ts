import { boolean, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core';

import { timestamps } from './_helpers';
import { users } from './user';

// Organizations table
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  logo: text('logo'),
  website: text('website'),
  
  // Organization settings
  settings: jsonb('settings').$defaultFn(() => ({
    features: {
      teamChat: true,
      fileSharing: true,
      aiAgents: true,
    },
    limits: {
      maxTeams: 10,
      maxMembersPerTeam: 50,
      maxStorageGB: 100,
    },
  })),
  
  // Billing info
  billingEmail: text('billing_email'),
  subscriptionTier: text('subscription_tier', { 
    enum: ['free', 'starter', 'professional', 'enterprise'] 
  }).default('free'),
  
  isActive: boolean('is_active').default(true),
  
  // Owner
  ownerId: text('owner_id')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  
  ...timestamps,
});

export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationItem = typeof organizations.$inferSelect;

// Organization members table
export const organizationMembers = pgTable('organization_members', {
  id: text('id').primaryKey().notNull(),
  
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
    
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
    
  role: text('role', { 
    enum: ['owner', 'admin', 'member'] 
  }).notNull().default('member'),
  
  permissions: jsonb('permissions').$defaultFn(() => ({
    canInviteMembers: false,
    canManageTeams: false,
    canManageBilling: false,
    canManageSettings: false,
  })),
  
  isActive: boolean('is_active').default(true),
  
  ...timestamps,
});

export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type OrganizationMemberItem = typeof organizationMembers.$inferSelect;

// Teams table
export const teams = pgTable('teams', {
  id: text('id').primaryKey().notNull(),
  
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
    
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  icon: text('icon'),
  
  settings: jsonb('settings').$defaultFn(() => ({
    isPrivate: false,
    allowGuestAccess: false,
    features: {
      chat: true,
      fileSharing: true,
      aiAgents: true,
    },
  })),
  
  isActive: boolean('is_active').default(true),
  isArchived: boolean('is_archived').default(false),
  
  ...timestamps,
});

export type NewTeam = typeof teams.$inferInsert;
export type TeamItem = typeof teams.$inferSelect;

// Team members table
export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey().notNull(),
  
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
    
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
    
  role: text('role', { 
    enum: ['leader', 'moderator', 'member'] 
  }).notNull().default('member'),
  
  permissions: jsonb('permissions').$defaultFn(() => ({
    canInviteMembers: false,
    canManageSettings: false,
    canModerateChat: false,
    canDeleteMessages: false,
  })),
  
  isActive: boolean('is_active').default(true),
  lastSeenAt: timestamps.updatedAt,
  
  ...timestamps,
});

export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamMemberItem = typeof teamMembers.$inferSelect;

// Team channels for different chat topics
export const teamChannels = pgTable('team_channels', {
  id: text('id').primaryKey().notNull(),
  
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
    
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: text('type', { 
    enum: ['general', 'announcement', 'project', 'random'] 
  }).notNull().default('general'),
  
  isPrivate: boolean('is_private').default(false),
  isArchived: boolean('is_archived').default(false),
  
  settings: jsonb('settings').$defaultFn(() => ({
    allowThreads: true,
    allowReactions: true,
    allowFileUploads: true,
  })),
  
  ...timestamps,
});

export type NewTeamChannel = typeof teamChannels.$inferInsert;
export type TeamChannelItem = typeof teamChannels.$inferSelect;

// Team invitations
export const teamInvitations = pgTable('team_invitations', {
  id: text('id').primaryKey().notNull(),
  
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
    
  invitedBy: text('invited_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
    
  email: text('email').notNull(),
  role: text('role', { 
    enum: ['leader', 'moderator', 'member'] 
  }).notNull().default('member'),
  
  token: text('token').unique().notNull(),
  expiresAt: timestamps.createdAt.notNull(),
  
  status: text('status', { 
    enum: ['pending', 'accepted', 'declined', 'expired'] 
  }).notNull().default('pending'),
  
  ...timestamps,
});

export type NewTeamInvitation = typeof teamInvitations.$inferInsert;
export type TeamInvitationItem = typeof teamInvitations.$inferSelect;

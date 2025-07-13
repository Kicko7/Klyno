import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, varchar } from 'drizzle-orm/pg-core';

import { timestamps, timestamptz } from '../schemas/_helpers';
import { users } from '../schemas/user';

// Organizations table
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().notNull(),
  isActive: boolean('is_active').default(true),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: text('owner_id')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  ...timestamps,
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
// Teams table
export const teams = pgTable('teams', {
  id: text('id')
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
});

export type Team = typeof teams.$inferSelect;
// Organization members table
export const organizationMembers = pgTable('organization_members', {
  id: text('id').primaryKey().notNull(),
  isActive: boolean('is_active').default(true),

  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role', {
    enum: ['owner', 'admin', 'member'],
  })
    .notNull()
    .default('member'),
  teamIds: text('team_ids').array().notNull(),

  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  ...timestamps,
});

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;

export const organizationInvitations = pgTable('organization_invitations', {
  email: text('email').notNull(),
  expiresAt: timestamptz('expires_at').notNull(),
  id: text('id').primaryKey().notNull(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role', {
    enum: ['admin', 'member'],
  })
    .notNull()
    .default('member'),
  status: text('status', {
    enum: ['pending', 'accepted', 'declined', 'dismissed'],
  })
    .notNull()
    .default('pending'),
  teamId: text('team_id'),
  token: text('token').unique().notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
});

export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert;

export type NewTeam = typeof teams.$inferInsert;

// Team members table
export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey().notNull(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role', {
    enum: ['owner', 'admin', 'member'],
  })
    .notNull()
    .default('member'),
  teamId: text('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

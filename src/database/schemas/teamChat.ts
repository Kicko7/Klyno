/* eslint-disable sort-keys-fix/sort-keys-fix  */
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { idGenerator } from '@/database/utils/idGenerator';

import { timestamps } from './_helpers';
import { users } from './user';

// Team Chat table - completely separate from regular sessions
export const teamChats = pgTable('team_chats', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => idGenerator('team_chats'))
    .notNull(),
  
  title: text('title').default('Team Chat'),
  description: text('description'),
  
  // Organization/Team identification
  organizationId: text('organization_id').notNull(),
  teamId: text('team_id'),
  
  // Owner of the chat
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
    
  // Chat configuration
  isActive: boolean('is_active').default(true),
  
  // Additional metadata
  metadata: jsonb('metadata').$type<{
    avatar?: string;
    backgroundColor?: string;
    tags?: string[];
    teamMembers?: string[];
    [key: string]: any;
  }>().default({}),
  
  ...timestamps,
});

// Team Chat Messages table
export const teamChatMessages = pgTable('team_chat_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => idGenerator('team_chat_messages'))
    .notNull(),
    
  teamChatId: text('team_chat_id')
    .references(() => teamChats.id, { onDelete: 'cascade' })
    .notNull(),
    
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
    
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 50 }).default('user'), // 'user', 'assistant', 'system'
  
  // Message metadata
  metadata: jsonb('metadata').$type<{
    model?: string;
    provider?: string;
    tokens?: number;
    [key: string]: any;
  }>().default({}),
  
  ...timestamps,
});

export const insertTeamChatSchema = createInsertSchema(teamChats);
export const insertTeamChatMessageSchema = createInsertSchema(teamChatMessages);

export type NewTeamChat = typeof teamChats.$inferInsert;
export type TeamChatItem = typeof teamChats.$inferSelect;
export type NewTeamChatMessage = typeof teamChatMessages.$inferInsert;
export type TeamChatMessageItem = typeof teamChatMessages.$inferSelect;

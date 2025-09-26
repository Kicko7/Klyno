/* eslint-disable sort-keys-fix/sort-keys-fix  */
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
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
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),

  // Chat configuration
  isActive: boolean('is_active').default(true),

  isInFolder:boolean("is_in_folder").default(false),
  // Additional metadata
  metadata: jsonb('metadata')
    .$type<{
      avatar?: string;
      backgroundColor?: string;
      tags?: string[];
      isPublic?: boolean;
      memberAccess: {
        userId: string;
        role: 'owner' | 'admin' | 'member';
        addedAt: string;
        addedBy: string;
      }[];
      presence?: {
        [userId: string]: {
          isActive: boolean;
          lastActiveAt: string;
          lastSeenMessageId?: string;
          device?: string;
        };
      };
      [key: string]: any;
    }>()
    .default({
      memberAccess: [],
    }),

    defaultModels: jsonb('default_models').$type<string[]>().default([]),

  ...timestamps,
});

const timestamptzMs = (name: string) =>
  timestamp(name, { withTimezone: true, precision: 3 });

export const teamChatMessages = pgTable('team_chat_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => idGenerator('team_chat_messages'))
    .notNull(),

  teamChatId: text('team_chat_id')
    .references(() => teamChats.id, { onDelete: 'cascade' })
    .notNull(),

  userId: text('user_id')
    .notNull(),

  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 50 }).default('user'),

  metadata: jsonb('metadata').$type<{
    userInfo?: {
      id: string;
      username?: string;
      email?: string;
      fullName?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
    isMultiUserChat?: boolean;
    totalUsersInChat?: number;
    totalTokens?: number;
    tokens?: number;
    model?: string;
    provider?: string;
    [key: string]: any;
  }>().default({}),

  // 👇 Use custom precision timestamps only here
  createdAt: timestamptzMs('created_at').notNull().defaultNow(),
  updatedAt: timestamptzMs('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  accessedAt: timestamptzMs('accessed_at').notNull().defaultNow(),
  sendTime: timestamptzMs('send_time').notNull().defaultNow(),
});

export const insertTeamChatSchema = createInsertSchema(teamChats);
export const insertTeamChatMessageSchema = createInsertSchema(teamChatMessages);

export type NewTeamChat = typeof teamChats.$inferInsert;
export type TeamChatItem = typeof teamChats.$inferSelect;
export type NewTeamChatMessage = typeof teamChatMessages.$inferInsert;
export type TeamChatMessageItem = typeof teamChatMessages.$inferSelect;

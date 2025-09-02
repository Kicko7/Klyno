import { sql } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, varchar } from 'drizzle-orm/pg-core';

import { idGenerator } from '../utils/idGenerator';
import { organizations } from './organization';
import { teamChats } from './teamChat';
import { users } from './user';

export const sharedParentFolder = pgTable('shared_folders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => idGenerator('shared_folders'))
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`NOW()`),
  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),
});

export const sharedSubFolder = pgTable('shared_sub_folder', {
  parentId: text('parent_folder_id')
    .references(() => sharedParentFolder.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  id: text('id')
    .primaryKey()
    .$defaultFn(() => idGenerator('shared_folders'))
    .notNull(),
});

export const subFolderChat = pgTable('shared_sub_folders_chat', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => idGenerator('shared_folders'))
    .notNull(),
  subFolderId: text('sub_folder_id').references(() => sharedSubFolder.id, { onDelete: 'cascade' }),
  teamChatId: text('team_chat_id').references(() => teamChats.id, { onDelete: 'cascade' }),
});

export type SharedParentFolder = typeof sharedParentFolder.$inferSelect;
export type NewSharedParentFolder = typeof sharedParentFolder.$inferInsert;

export type SharedSubFolder = typeof sharedSubFolder.$inferSelect;
export type NewSharedSubFolder = typeof sharedSubFolder.$inferInsert;

export type SubFolderChat = typeof subFolderChat.$inferSelect;
export type NewSubFolderChat = typeof subFolderChat.$inferInsert;


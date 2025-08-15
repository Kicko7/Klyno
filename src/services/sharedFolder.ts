import { eq, sql } from 'drizzle-orm';

import { db } from '@/database';
import {
  NewSharedParentFolder,
  NewSharedSubFolder,
  NewSubFolderChat,
  sharedParentFolder,
  sharedSubFolder,
  subFolderChat,
  teamChats,
} from '@/database/schemas';

export interface ISharedFolderService {
  createParentFolder: (params: {
    name: string;
    userId: string;
    organizationId: string;
  }) => Promise<any>;
  getUserSharedFolders: (params: { organizationId: string }) => Promise<any>;
  createSubFolder: (params: { parentId: string; name: string }) => Promise<any>;
  createChatSubFolder: (params: { subFolderId: string; teamChatId: string }) => Promise<any>;
}

export class SharedFolderService implements ISharedFolderService {
  async createParentFolder(data: { name: string; userId: string; organizationId: string }) {
    const folder: NewSharedParentFolder = {
      userId: data.userId,
      name: data.name,
      organizationId: data.organizationId,
    };
    const [inserted] = await db.insert(sharedParentFolder).values(folder).returning();
    return inserted;
  }

  async getUserSharedFolders(data: { organizationId: string }) {
    return db.execute(sql`
    SELECT
      p.id,
      p.name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'chats', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', tc.id,
                    'title', tc.title,
                    'description', tc.description
                  )
                )
                FROM shared_sub_folders_chat sfc
                JOIN team_chats tc
                  ON tc.id = sfc.team_chat_id
                WHERE sfc.sub_folder_id = s.id
              ),
              '[]'
            )
          )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS "subFolders"
    FROM shared_folders p
    LEFT JOIN shared_sub_folder s
      ON s.parent_folder_id = p.id
    WHERE p.organization_id = ${data.organizationId}
    GROUP BY p.id, p.name
  `);
  }

  async createSubFolder(data: { parentId: string; name: string }) {
    const subFolder: NewSharedSubFolder = {
      parentId: data.parentId,
      name: data.name,
    };
    const [inserted] = await db.insert(sharedSubFolder).values(subFolder).returning();
    return inserted;
  }

  async createChatSubFolder(data: { subFolderId: string; teamChatId: string }) {
    const chatFolder: NewSubFolderChat = {
      subFolderId: data.subFolderId,
      teamChatId: data.teamChatId,
    };
     const [inserted] = await db.insert(subFolderChat).values(chatFolder).returning();
    return inserted;
  }
}

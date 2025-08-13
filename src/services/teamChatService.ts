import { and, desc, eq, sql } from 'drizzle-orm';

import {
  NewTeamChat,
  NewTeamChatMessage,
  TeamChatMessageItem,
  teamChatMessages,
  teamChats,
} from '@/database/schemas/teamChat';
import { users } from '@/database/schemas/user';
import { LobeChatDatabase } from '@/database/type';
import { idGenerator } from '@/database/utils/idGenerator';

export class TeamChatService {
  private db: LobeChatDatabase;
  private userId: string;

  constructor(db: LobeChatDatabase, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  // Create a new team chat
  createTeamChat = async (data: Omit<NewTeamChat, 'userId' | 'id'>) => {
    return this.db.transaction(async (trx) => {
      // Ensure required fields
      if (!data.organizationId) {
        throw new Error('organizationId is required');
      }

      // Create metadata with additional tracking info
      const metadata = {
        ...(data.metadata || {}),
        memberAccess: [
          {
            userId: this.userId,
            role: 'owner' as const,
            addedAt: new Date().toISOString(),
            addedBy: this.userId,
          },
        ],
      };

      const newChat = await trx
        .insert(teamChats)
        .values({
          ...data,
          userId: this.userId,
          id: idGenerator('team_chats'),
          metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return newChat[0];
    });
  };

  // Add a message to a team chat
  addMessageToChat = async (
    teamChatId: string,
    data: Omit<NewTeamChatMessage, 'userId' | 'teamChatId'> & { id?: string },
  ) => {
    const messageId = data.id || idGenerator('team_chat_messages');

    // Get user information for the message
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, this.userId),
    });

    // Prepare metadata with user information
    const messageMetadata = {
      ...(data.metadata || {}),
      userInfo: user
        ? {
            id: user.id,
            username: user.username ?? undefined,
            email: user.email ?? undefined,
            fullName: user.fullName ?? undefined,
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            avatar: user.avatar ?? undefined,
          }
        : undefined,
      // Add multi-user chat context for AI
      isMultiUserChat: true,
      totalUsersInChat: await this.getActiveUsersInChat(teamChatId),
    };

    // Check if message already exists and update it
    if (data.id) {
      const existingMessage = await this.db.query.teamChatMessages.findFirst({
        where: eq(teamChatMessages.id, data.id),
      });

      if (existingMessage) {
        const result = await this.db
          .update(teamChatMessages)
          .set({
            content: data.content,
            messageType: data.messageType,
            metadata: messageMetadata,
            updatedAt: new Date(),
          })
          .where(eq(teamChatMessages.id, data.id))
          .returning();

        return result[0];
      }
    }

    // Create new message
    const result = await this.db
      .insert(teamChatMessages)
      .values({
        ...data,
        teamChatId,
        userId: this.userId,
        id: messageId,
        metadata: messageMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  };

  // Get messages for a team chat with pagination
  getMessages = async (
    teamChatId: string,
    limit = 50,
    offset?: number,
    lastMessageId?: string,
  ): Promise<TeamChatMessageItem[]> => {
    const conditions = [eq(teamChatMessages.teamChatId, teamChatId)];

    // If lastMessageId is provided, get messages after that ID
    if (lastMessageId) {
      const lastMessage = await this.db.query.teamChatMessages.findFirst({
        where: eq(teamChatMessages.id, lastMessageId),
      });

      if (lastMessage) {
        conditions.push(sql`${teamChatMessages.createdAt} > ${lastMessage.createdAt}`);
      }
    }

    return this.db.query.teamChatMessages.findMany({
      where: and(...conditions),
      orderBy: [desc(teamChatMessages.createdAt)], // Order by descending (newest first)
      limit,
      offset,
    });
  };

  // Check if there are new messages without fetching all messages
  hasNewMessages = async (
    teamChatId: string,
    lastMessageId?: string,
    lastMessageTimestamp?: string,
  ): Promise<boolean> => {
    if (!lastMessageId || !lastMessageTimestamp) return true;

    // Get the latest message timestamp
    const latestMessage = await this.db.query.teamChatMessages.findFirst({
      where: eq(teamChatMessages.teamChatId, teamChatId),
      orderBy: [desc(teamChatMessages.createdAt)],
    });

    if (!latestMessage) return false;

    // Compare timestamps
    const lastTimestamp = new Date(lastMessageTimestamp);
    const latestTimestamp = latestMessage.createdAt;

    // Return true if there are newer messages
    return latestTimestamp > lastTimestamp || latestMessage.id !== lastMessageId;
  };

  // Get a single team chat by ID
  getChatById = async (id: string) => {
    return this.db.query.teamChats.findFirst({
      where: eq(teamChats.id, id),
    });
  };

  // Get all team chats for an organization that the user has access to
  getChatsByOrganization = async (organizationId: string) => {
    console.log('🔍 getChatsByOrganization called:', { organizationId, userId: this.userId });

    // First get all chats for the organization
    const allChats = await this.db.query.teamChats.findMany({
      where: eq(teamChats.organizationId, organizationId),
      orderBy: [desc(teamChats.updatedAt)], // Most recently updated first
    });

    console.log('🔍 All chats found:', allChats.length);

    // Filter chats based on access:
    // 1. User is the creator
    // 2. Chat is public
    // 3. User is in memberAccess list
    const filteredChats = allChats.filter((chat) => {
      const isCreator = chat.userId === this.userId;
      const isPublic = chat.metadata?.isPublic === true;
      const hasMemberAccess = chat.metadata?.memberAccess?.some(
        (member) => member.userId === this.userId,
      );

      const hasAccess = isCreator || isPublic || hasMemberAccess;

      console.log('🔍 Chat access check:', {
        chatId: chat.id,
        chatTitle: chat.title,
        isCreator,
        isPublic,
        hasMemberAccess,
        hasAccess,
        memberAccess: chat.metadata?.memberAccess,
      });

      return hasAccess;
    });

    console.log('🔍 Filtered chats:', filteredChats.length);
    return filteredChats;
  };

  // Update chat access settings
  updateChatAccess = async (
    chatId: string,
    data: {
      isPublic?: boolean;
      memberAccess?: {
        userId: string;
        role: 'owner' | 'admin' | 'member';
        addedAt: string;
        addedBy: string;
      }[];
    },
  ) => {
    // First check if user has permission to update access
    const chat = await this.db.query.teamChats.findFirst({
      where: eq(teamChats.id, chatId),
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Only creator or admins can update access
    const isCreator = chat.userId === this.userId;
    const isAdmin = chat.metadata?.memberAccess?.some(
      (m) => m.userId === this.userId && (m.role === 'admin' || m.role === 'owner'),
    );

    if (!isCreator && !isAdmin) {
      throw new Error('You do not have permission to update chat access');
    }

    // Update the chat
    const result = await this.db
      .update(teamChats)
      .set({
        ...(typeof data.isPublic === 'boolean' ? { isPublic: data.isPublic } : {}),
        ...(data.memberAccess
          ? {
              metadata: {
                ...chat.metadata,
                memberAccess: data.memberAccess,
              },
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(teamChats.id, chatId))
      .returning();

    return result[0];
  };

  // Add member to chat
  addChatMember = async (chatId: string, userId: string, role: 'admin' | 'member' = 'member') => {
    const chat = await this.db.query.teamChats.findFirst({
      where: eq(teamChats.id, chatId),
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user already has access
    const existingAccess = chat.metadata?.memberAccess?.find((m) => m.userId === userId);
    if (existingAccess) {
      throw new Error('User already has access to this chat');
    }

    // Add the new member
    const newMemberAccess = [
      ...(chat.metadata?.memberAccess || []),
      {
        userId,
        role,
        addedAt: new Date().toISOString(),
        addedBy: this.userId,
      },
    ];

    const result = await this.db
      .update(teamChats)
      .set({
        metadata: {
          ...chat.metadata,
          memberAccess: newMemberAccess,
        },
        updatedAt: new Date(),
      })
      .where(eq(teamChats.id, chatId))
      .returning();

    return result[0];
  };

  // Remove member from chat
  removeChatMember = async (chatId: string, userId: string) => {
    const chat = await this.db.query.teamChats.findFirst({
      where: eq(teamChats.id, chatId),
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Cannot remove the creator
    if (chat.userId === userId) {
      throw new Error('Cannot remove the chat creator');
    }

    // Only creator or admins can remove members
    const isCreator = chat.userId === this.userId;
    const isAdmin = chat.metadata?.memberAccess?.some(
      (m) => m.userId === this.userId && (m.role === 'admin' || m.role === 'owner'),
    );

    if (!isCreator && !isAdmin) {
      throw new Error('You do not have permission to remove members');
    }

    // Remove the member
    const newMemberAccess = chat.metadata?.memberAccess?.filter((m) => m.userId !== userId) || [];

    const result = await this.db
      .update(teamChats)
      .set({
        metadata: {
          ...chat.metadata,
          memberAccess: newMemberAccess,
        },
        updatedAt: new Date(),
      })
      .where(eq(teamChats.id, chatId))
      .returning();

    return result[0];
  };

  // Update a team chat
  updateTeamChat = async (
    id: string,
    data: Partial<Pick<NewTeamChat, 'title' | 'description' | 'metadata'>>,
  ) => {
    const result = await this.db
      .update(teamChats)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teamChats.id, id))
      .returning();

    return result[0];
  };

  // Delete a team chat
  deleteTeamChat = async (id: string) => {
    return this.db.transaction(async (trx) => {
      await trx.delete(teamChatMessages).where(eq(teamChatMessages.teamChatId, id));
      return trx.delete(teamChats).where(eq(teamChats.id, id));
    });
  };

  // Get the number of active users in a chat
  private getActiveUsersInChat = async (teamChatId: string): Promise<number> => {
    // Get the chat with presence data
    const chat = await this.db.query.teamChats.findFirst({
      where: eq(teamChats.id, teamChatId),
    });

    if (!chat) {
      return 0;
    }

    // Count active users from presence data
    const presence = chat.metadata?.presence || {};
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return Object.values(presence).filter(
      (data) => data.isActive && new Date(data.lastActiveAt) > fiveMinutesAgo,
    ).length;
  };

  // Update user presence in a chat with optimized performance
  updatePresence = async (teamChatId: string, lastSeenMessageId?: string) => {
    const now = new Date();
    const timestamp = now.toISOString();

    // Update presence directly without fetching first
    return this.db
      .update(teamChats)
      .set({
        metadata: sql`jsonb_set(
          COALESCE(metadata, '{"presence": {}, "memberAccess": []}'::jsonb),
          '{presence}'::text[],
          jsonb_set(
            COALESCE(metadata->'presence', '{}'::jsonb),
            ${sql.raw(`'{${this.userId}}'`)},
            ${JSON.stringify({
              isActive: true,
              lastActiveAt: timestamp,
              lastSeenMessageId: lastSeenMessageId || null,
            })}::jsonb
          )
        )`,
        updatedAt: now,
      })
      .where(eq(teamChats.id, teamChatId))
      .returning();
  };

  // Mark user as inactive in a chat with optimized performance
  markInactive = async (teamChatId: string) => {
    const now = new Date();
    const timestamp = now.toISOString();

    // Update presence directly without fetching first
    return this.db
      .update(teamChats)
      .set({
        metadata: sql`jsonb_set(
          COALESCE(metadata, '{"presence": {}, "memberAccess": []}'::jsonb),
          '{presence}'::text[],
          jsonb_set(
            COALESCE(metadata->'presence', '{}'::jsonb),
            ${sql.raw(`'{${this.userId}}'`)},
            ${JSON.stringify({
              isActive: false,
              lastActiveAt: timestamp,
            })}::jsonb
          )
        )`,
        updatedAt: now,
      })
      .where(eq(teamChats.id, teamChatId))
      .returning();
  };

  // Get active users in a chat
  getActiveUsers = async (teamChatId: string) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Get the chat with presence data
    const chat = await this.db.query.teamChats.findFirst({
      where: eq(teamChats.id, teamChatId),
    });

    if (!chat) {
      return [];
    }

    // Get user details for active users
    const presence = chat.metadata?.presence || {};
    const activeUserIds = Object.entries(presence)
      .filter(([_, data]) => data.isActive && new Date(data.lastActiveAt) > fiveMinutesAgo)
      .map(([userId]) => userId);

    if (activeUserIds.length === 0) {
      return [];
    }

    // Get user details
    const userRecords = await this.db.query.users.findMany({
      where: eq(users.id, activeUserIds[0]), // Using first ID as we'll filter in memory
    });

    // Map users to presence data
    return activeUserIds.map((userId) => {
      const userRecord = userRecords.find((u) => u.id === userId);
      return {
        userId,
        id: userId,
        teamChatId,
        isActive: true,
        lastActiveAt: new Date(presence[userId].lastActiveAt),
        lastSeenMessageId: presence[userId].lastSeenMessageId,
        user: userRecord ? [userRecord] : [],
      };
    });
  };


  // Update an existing message
  updateMessage = async (
    teamChatId: string,
    messageId: string,
    data: { content: string; metadata?: any },
  ) => {
    const result = await this.db
      .update(teamChatMessages)
      .set({
        content: data.content,
        metadata: {
          ...(data.metadata || {}),
          updatedBy: this.userId,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamChatMessages.id, messageId),
          eq(teamChatMessages.teamChatId, teamChatId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new Error('Message not found or cannot be updated');
    }

    return result[0];
  };

  async deleteMessage(teamChatId: string, messageId: string): Promise<void> {
    const result = await this.db
      .delete(teamChatMessages)
      .where(
        and(
          eq(teamChatMessages.id, messageId),
          eq(teamChatMessages.teamChatId, teamChatId)
        )
      );

    if (result.rowCount === 0) {
      throw new Error('Message not found or already deleted');
    }
  }
}

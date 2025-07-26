import { eq, desc } from 'drizzle-orm';
import { LobeChatDatabase } from '@/database/type';
import { idGenerator } from '@/database/utils/idGenerator';
import { NewTeamChat, NewTeamChatMessage, teamChats, teamChatMessages, TeamChatMessageItem } from '@/database/schemas/teamChat';

export class TeamChatService {
  private db: LobeChatDatabase;
  private userId: string;

  constructor(db: LobeChatDatabase, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  // Create a new team chat
  createTeamChat = async (data: Omit<NewTeamChat, 'userId'>) => {
    return this.db.transaction(async (trx) => {
      const newChat = await trx.insert(teamChats).values({
        ...data,
        userId: this.userId,
        id: idGenerator('team_chats'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return newChat[0];
    });
  };

  // Add a message to a team chat
  addMessageToChat = async (teamChatId: string, data: Omit<NewTeamChatMessage, 'userId' | 'teamChatId'>) => {
    const result = await this.db.insert(teamChatMessages).values({
      ...data,
      teamChatId,
      userId: this.userId,
      id: idGenerator('team_chat_messages'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return result[0];
  };
  
  // Get messages for a team chat
  getMessages = async (teamChatId: string, limit = 50): Promise<TeamChatMessageItem[]> => {
    return this.db.query.teamChatMessages.findMany({
      where: eq(teamChatMessages.teamChatId, teamChatId),
      orderBy: [desc(teamChatMessages.createdAt)],
      limit,
    });
  };

  // Get all team chats for an organization
  getChatsByOrganization = async (organizationId: string) => {
    return this.db.query.teamChats.findMany({
      where: eq(teamChats.organizationId, organizationId)
    });
  };

  // Update a team chat
  updateTeamChat = async (id: string, data: Partial<Pick<NewTeamChat, 'title' | 'description' | 'metadata'>>) => {
    const result = await this.db.update(teamChats)
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
}

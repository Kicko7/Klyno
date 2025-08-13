
import { db } from '@/database';
import { NewSharedFolder, sharedFolder, sharedFolderTeamChats, teamChats } from '@/database/schemas';
import { eq } from 'drizzle-orm';


export interface ISharedFolderService {
  createSharedFolder: (params: {
   name:string;
   userId:string;
  }) => Promise<any>;
  getUserSharedFolders: (params: {
   userId:string;
  }) => Promise<any>;
  getFolderTeamChats:(params:{
    folderId:string
  }) => Promise<any>
}

export class SharedFolderService implements ISharedFolderService{

  async createSharedFolder(data: { name: string ,userId:string}) {
    const folder: NewSharedFolder = {
      userId: data.userId,
      name: data.name,
    };

    const [inserted] = await db.insert(sharedFolder).values(folder).returning();
    return inserted;
  }

  async getUserSharedFolders(data:{userId:string}) {
    return db
      .select()
      .from(sharedFolder)
      .where(eq(sharedFolder.userId, data.userId));
  }

  async getFolderTeamChats(data:{folderId: string}) {
    return db
      .select({
        folderId: sharedFolderTeamChats.sharedFolderId,
        teamChat: teamChats,
      })
      .from(sharedFolderTeamChats)
      .where(eq(sharedFolderTeamChats.sharedFolderId, data.folderId))
      .innerJoin(teamChats, eq(teamChats.id, sharedFolderTeamChats.teamChatId));
  }
}

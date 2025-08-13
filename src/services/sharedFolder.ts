
import { db } from '@/database';
import { NewSharedParentFolder, sharedParentFolder, teamChats } from '@/database/schemas';
import { eq } from 'drizzle-orm';


export interface ISharedFolderService {
  createParentFolder: (params: {
   name:string;
   userId:string;
  }) => Promise<any>;
  getUserSharedFolders: (params: {
   userId:string;
  }) => Promise<any>;
  // getFolderTeamChats:(params:{
  //   folderId:string
  // }) => Promise<any>
}

export class SharedFolderService implements ISharedFolderService{

  async createParentFolder(data: { name: string ,userId:string}) {
    const folder: NewSharedParentFolder = {
      userId: data.userId,
      name: data.name,
    };
    const [inserted] = await db.insert(sharedParentFolder).values(folder).returning();
    return inserted;
  }

  async getUserSharedFolders(data:{userId:string}) {
    return db
      .select()
      .from(sharedParentFolder)
      .where(eq(sharedParentFolder.userId, data.userId));
  }

  // async getFolderTeamChats(data:{folderId: string}) {
  //   return db
  //     .select({
  //       folderId: sharedFolderTeamChats.sharedFolderId,
  //       teamChat: teamChats,
  //     })
  //     .from(sharedFolderTeamChats)
  //     .where(eq(sharedFolderTeamChats.sharedFolderId, data.folderId))
  //     .innerJoin(teamChats, eq(teamChats.id, sharedFolderTeamChats.teamChatId));
  // }
  
}

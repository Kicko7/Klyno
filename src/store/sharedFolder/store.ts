import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { lambdaClient } from '@/libs/trpc/client';

export interface SharedSubFolderChat {
  id: string;
  title: string;
  description?: string;
}

export interface SharedSubFolder {
  id: string;
  name: string;
  chats: SharedSubFolderChat[];
}

export interface SharedFolder {
  id: string;
  name: string;
  subFolders: SharedSubFolder[];
}

export interface SharedFolderState {
  sharedFolders: SharedFolder[];
  loading: boolean;
  selectedParentFolderId: string;
  selectedSubFolderId: string;
}

export interface SharedFolderAction {
  createSharedFolder: (data: {
    userId: string;
    name: string;
    organizationId: string;
  }) => Promise<any>;
  getMySharedFolders: (data: { organizationId: string }) => void;
  createSharedSubFolder: (data: { name: string; parentId: string }) => Promise<any>;
  setSelectedParentFolderId: (id: string) => void;
  setSelectedSubFolderId: (id: string) => void;
  createChatInSubFolder: (data: {
    organizationId: string;
    title: string;
    isInFolder: boolean;
    subFolderId: string;
  }) => Promise<any>;
}

export interface SharedFolderStore extends SharedFolderState, SharedFolderAction {}

const initialSharedFoldeState: SharedFolderState = {
  sharedFolders: [],
  loading: false,
  selectedParentFolderId: '',
  selectedSubFolderId: '',
};

export const useSharedFolderStore = create<SharedFolderStore>()(
  devtools(
    (set, get) => ({
      ...initialSharedFoldeState,

      createSharedFolder: async (data) => {
        try {
          set({ loading: true });
          const folder: any = await lambdaClient.sharedFolder.createSharedParentFolder.mutate(data);
          set({
            sharedFolders: [...get().sharedFolders, { ...folder, subFolders: [] }],
            loading: false,
          });
          return folder;
        } catch (error) {
          console.error(error);
          set({ loading: false });
          throw error;
        }
      },

      getMySharedFolders: async (data) => {
        try {
          const response: any = await lambdaClient.sharedFolder.getMySharedFolders.query(data);
          console.log(response)
          set({ sharedFolders: response });
        } catch (error) {
          console.log(error);
        }
      },

      createSharedSubFolder: async (data) => {
        try {
          set({ loading: true });
          const subFolder = await lambdaClient.sharedFolder.createSharedSubFolder.mutate(data);
          set((state) => ({
            sharedFolders: state.sharedFolders.map((folder) =>
              folder.id === data.parentId
                ? {
                    ...folder,
                    subFolders: [...folder.subFolders, { ...subFolder, chats: [] }],
                  }
                : folder,
            ),
            loading: false,
          }));
          return subFolder;
        } catch (error) {
          set({ loading: false });
          console.log('Error adding subfolder', error);
          throw error;
        }
      },

      setSelectedParentFolderId: (id) => {
        set({ selectedParentFolderId: id });
      },

      setSelectedSubFolderId: (id) => {
        set({ selectedSubFolderId: id });
      },

      createChatInSubFolder: async (data) => {
        try {
          set({ loading: true });

          // Step 1: Create the chat in backend
          const sessionResult = await lambdaClient.session.createSession.mutate({
            config: {
              model: 'gpt-4',
              provider: 'openai',
              systemRole: 'You are a helpful AI assistant for team collaboration.',
            },
            session: {
              title: data.title || 'Team Chat',
              type: 'agent',
            },
            type: 'agent',
          });

          
          const newChat = await lambdaClient.teamChat.createTeamChat.mutate({
            ...data,
            metadata: {
              sessionId: sessionResult, // Pass the session ID
            },
          });


          // Step 2: Link chat to subfolder in backend
          await lambdaClient.sharedFolder.createChatInSubFolder.mutate({
            subFolderId: data.subFolderId,
            teamChatId: newChat.id,
          });

          // Step 3: Map to SharedSubFolderChat type
          const chatToAdd: SharedSubFolderChat = {
            id: newChat.id,
            title: newChat.title ?? 'Untitled Chat',
            description: newChat.description ?? '',
          };

          // Step 4: Update local store
          set((state) => ({
            sharedFolders: state.sharedFolders.map((folder) => ({
              ...folder,
              subFolders: folder.subFolders.map((subFolder) =>
                subFolder.id === data.subFolderId
                  ? { ...subFolder, chats: [...subFolder.chats, chatToAdd] }
                  : subFolder,
              ),
            })),
            loading: false,
          }));

          return newChat;
        } catch (error) {
          set({ loading: false });
          console.log('Error creating chat in subfolder', error);
          throw error;
        }
      },
    }),
    { name: 'SharedFolderState' },
  ),
);

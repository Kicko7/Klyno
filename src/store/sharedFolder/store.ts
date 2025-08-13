import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { lambdaClient } from '@/libs/trpc/client';

export interface SharedFolderState {
    sharedFolders:any[];
    loading:boolean;
}

export interface SharedFolderAction {
    createSharedFolder:({userId,name}:{userId:string,name:string}) => Promise<any>;
    getMySharedFolders:({userId}:{userId:string}) => void;
}

export interface SharedFolderStore extends SharedFolderState, SharedFolderAction {}

const initialSharedFoldeState: SharedFolderState = {
    sharedFolders:[],
    loading:false
};

export const useSharedFolderStore = create<SharedFolderStore>()(
  devtools(
    (set, get) => ({
      ...initialSharedFoldeState,
      createSharedFolder: async (data) => {
        try {
          set({ loading: true });
          const res = await lambdaClient.sharedFolder.createSharedParentFolder.mutate(data);
          set({
            sharedFolders: [...get().sharedFolders, res],
            loading: false,
          });

          return res; 
        } catch (error) {
          console.error(error);
          set({ loading: false });
          throw error; 
        }
      },
      getMySharedFolders:async(data) => {
        try {
          const response = await lambdaClient.sharedFolder.getMySharedFolders.query(data);
          console.log(response)
        } catch (error) {
          console.log(error);
        }
      }
    }),
    {
      name: 'SharedFolderState',
    }
  )
);


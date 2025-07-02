// CLIENT-ONLY: All sync logic here is for browser/client-side only. Never import this file on the server.
import { clientDataSync } from '@/utils/dataSync.client';
import { StartDataSyncParams } from '@/types/sync';

class SyncService {
  enabledSync = async (params: StartDataSyncParams) => {
    if (typeof window === 'undefined') return false;
    
    try {
      await clientDataSync.startDataSync(params);
      return true;
    } catch (error) {
      console.error('Failed to enable sync:', error);
      return false;
    }
  };

  disableSync = async () => {
    try {
      await clientDataSync.disconnect();
    } catch (error) {
      console.error('Failed to disable sync:', error);
    }
    return false;
  };
}

export const syncService = new SyncService();

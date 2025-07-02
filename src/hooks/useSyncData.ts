import { useCallback, useEffect } from 'react';

import { useChatStore } from '@/store/chat';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useSessionStore } from '@/store/session';
import { useUserStore } from '@/store/user';
import { syncSettingsSelectors, userProfileSelectors } from '@/store/user/selectors';

export const useSyncEvent = () => {
  const [refreshMessages, refreshTopic] = useChatStore((s) => [s.refreshMessages, s.refreshTopic]);
  const [refreshSessions] = useSessionStore((s) => [s.refreshSessions]);

  return useCallback(
    (tableKey: string) => {
      // console.log('triggerSync Event:', tableKey);

      switch (tableKey) {
        case 'messages': {
          refreshMessages();
          break;
        }

        case 'topics': {
          refreshTopic();
          break;
        }

        case 'sessions': {
          refreshSessions();
          break;
        }

        default: {
          break;
        }
      }
    },
    [refreshMessages, refreshTopic, refreshSessions],
  );
};

export const useEnabledDataSync = () => {
  // Always call hooks at the top level, regardless of environment
  const [userId, userEnableSync] = useUserStore((s) => [
    userProfileSelectors.userId(s),
    syncSettingsSelectors.enableWebRTC(s),
  ]);

  const { enableWebrtc } = useServerConfigStore(featureFlagsSelectors);
  const syncEvent = useSyncEvent();
  const enableSync = useUserStore((s) => s.useEnabledSync);

  // Use useEffect to handle browser-only logic
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Call the sync function - this is a function from the store, not a hook
    enableSync(enableWebrtc, { onEvent: syncEvent, userEnableSync, userId });
  }, [enableWebrtc, syncEvent, userEnableSync, userId, enableSync]);
};

export const useSyncData = () => {
  const [triggerEnableSync, syncEnabled] = useUserStore((s) => [
    s.triggerEnableSync,
    s.syncEnabled,
  ]);

  const handleEnabledSync = useCallback(
    async (userId: string, onEvent: (tableKey: string) => void) => {
      await triggerEnableSync(userId, onEvent);
    },
    [triggerEnableSync],
  );

  const handleDisableSync = useCallback(async () => {
    // Use client-only sync service to avoid SSR errors
    const { syncService } = await import('@/services/sync.client');
    return syncService.disableSync();
  }, []);

  return {
    disableSync: handleDisableSync,
    enabledSync: handleEnabledSync,
    enabledSyncState: syncEnabled,
  };
};

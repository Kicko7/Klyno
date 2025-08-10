'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useTeamChatStore } from '@/store/teamChat';

const TeamChatSessionHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useTeamChatStore);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current URL parameters
  const currentChatId = searchParams.get('chatId') || '';
  const currentTopic = searchParams.get('topic') || '';

  // Only sync URL params to store on initial load or direct URL navigation
  useEffect(() => {
    const urlHasParams = currentChatId || currentTopic;
    const storeState = useTeamChatStore.getState();
    const storeIsEmpty = !storeState.activeTeamChatId && !storeState.activeTopicId;

    // Only sync from URL if we have URL params and store is empty
    if (urlHasParams && storeIsEmpty) {
      if (currentChatId) {
        useTeamChatStore.setState({ activeTeamChatId: currentChatId });
      }
      if (currentTopic) {
        useTeamChatStore.setState({ activeTopicId: currentTopic });
      }
    }
  }, []); // Only run on mount

  return null;
});

TeamChatSessionHydration.displayName = 'TeamChatSessionHydration';

export default TeamChatSessionHydration;

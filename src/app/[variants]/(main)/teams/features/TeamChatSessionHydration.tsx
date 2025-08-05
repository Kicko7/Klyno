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

  // Sync URL params to store
  useEffect(() => {
    if (currentChatId) {
      useTeamChatStore.setState({ activeTeamChatId: currentChatId });
    }
    if (currentTopic) {
      useTeamChatStore.setState({ activeTopicId: currentTopic });
    }
  }, [currentChatId, currentTopic]);

  // Sync store to URL
  useEffect(() => {
    const updateURL = (state: {
      activeTeamChatId: string | null;
      activeTopicId: string | null;
    }) => {
      // Only update URL if values have changed
      if (state.activeTeamChatId !== currentChatId || state.activeTopicId !== currentTopic) {
        const query = new URLSearchParams();
        query.set('view', 'chat');
        if (state.activeTeamChatId) {
          query.set('chatId', state.activeTeamChatId);
        }
        if (state.activeTopicId) {
          query.set('topic', state.activeTopicId);
        }
        router.replace(`/teams?${query.toString()}`);
      }
    };

    // Subscribe to store changes
    const unsubscribe = useTeamChatStore.subscribe(updateURL);

    return () => {
      unsubscribe();
    };
  }, [router, currentChatId, currentTopic]);

  return null;
});

TeamChatSessionHydration.displayName = 'TeamChatSessionHydration';

export default TeamChatSessionHydration;

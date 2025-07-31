'use client';

import { useQueryState } from 'nuqs';
import { memo, useLayoutEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useTeamChatStore } from '@/store/teamChat';

// Sync outside state to useTeamChatStore for URL parameters
const TeamChatHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useTeamChatStore);

  // Two-way bindings for topic params to team chat store
  const [topic, setTopic] = useQueryState('topic', { history: 'replace', throttleMs: 500 });
  
  // Update store when URL changes
  useStoreUpdater('activeTopicId', topic);

  useLayoutEffect(() => {
    // Subscribe to store changes and update URL
    const unsubscribeTopic = useTeamChatStore.subscribe(
      (s) => s.activeTopicId,
      (state) => {
        setTopic(!state ? null : state);
      },
    );

    return () => {
      unsubscribeTopic();
    };
  }, [setTopic]);

  return null;
});

TeamChatHydration.displayName = 'TeamChatHydration';

export default TeamChatHydration;

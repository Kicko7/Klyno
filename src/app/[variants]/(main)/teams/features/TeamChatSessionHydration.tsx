'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs/server';
import { memo, useEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useTeamChatStore } from '@/store/teamChat';

const TeamChatSessionHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useTeamChatStore);

  // Two-way bindings for team chat ID and topic ID
  const [teamChat, setTeamChat] = useQueryState(
    'teamChat',
    parseAsString.withDefault('').withOptions({ history: 'replace', throttleMs: 50 }),
  );

  const [topic, setTopic] = useQueryState(
    'topic',
    parseAsString.withDefault('').withOptions({ history: 'replace', throttleMs: 50 }),
  );

  useStoreUpdater('activeTeamChatId', teamChat || null);
  useStoreUpdater('activeTopicId', topic || null);

  useEffect(() => {
    const updateTeamChat = (state: { activeTeamChatId: string | null }) => {
      setTeamChat(state.activeTeamChatId || '');
    };

    const updateTopic = (state: { activeTopicId: string | null }) => {
      setTopic(state.activeTopicId || '');
    };

    // Subscribe to changes in activeTeamChatId
    const unsubscribeTeamChat = useTeamChatStore.subscribe(updateTeamChat);

    // Subscribe to changes in activeTopicId
    const unsubscribeTopic = useTeamChatStore.subscribe(updateTopic);

    return () => {
      unsubscribeTeamChat();
      unsubscribeTopic();
    };
  }, [setTeamChat, setTopic]);

  return null;
});

TeamChatSessionHydration.displayName = 'TeamChatSessionHydration';

export default TeamChatSessionHydration;

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { memo, useEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useAgentStore } from '@/store/agent';
import { useChatStore } from '@/store/chat';
import { useSessionStore } from '@/store/session';

// sync outside state to useSessionStore
const SessionHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useSessionStore);
  const useAgentStoreUpdater = createStoreUpdater(useAgentStore);
  const useChatStoreUpdater = createStoreUpdater(useChatStore);
  const [switchTopic] = useChatStore((s) => [s.switchTopic]);
  const searchParams = useSearchParams();
  const router = useRouter();

  // two-way bindings the url and session store
  const session = searchParams.get('session');
  useStoreUpdater('activeId', session);
  useAgentStoreUpdater('activeId', session);
  useChatStoreUpdater('activeId', session);

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe(
      (s) => s.activeId,
      (state) => {
        switchTopic();
        const params = new URLSearchParams(searchParams.toString());
        if (state) {
          params.set('session', state);
        } else {
          params.delete('session');
        }
        router.replace(`?${params.toString()}`);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [searchParams, router, switchTopic]);

  return null;
});

export default SessionHydration;

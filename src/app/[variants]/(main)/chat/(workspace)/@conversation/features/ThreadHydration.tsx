'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { memo, useEffect, useLayoutEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useFetchThreads } from '@/hooks/useFetchThreads';
import { useChatStore } from '@/store/chat';

// sync outside state to useChatStore
const ThreadHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useChatStore);
  const searchParams = useSearchParams();
  const router = useRouter();

  // two-way bindings the topic params to chat store
  const portalThread = searchParams.get('portalThread');
  useStoreUpdater('portalThreadId', portalThread);

  useLayoutEffect(() => {
    const unsubscribe = useChatStore.subscribe(
      (s) => s.portalThreadId,
      (state) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!state) {
          params.delete('portalThread');
        } else {
          params.set('portalThread', state);
        }
        router.replace(`?${params.toString()}`);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [searchParams, router]);

  // should open portal automatically when portalThread is set
  useEffect(() => {
    if (!!portalThread && !useChatStore.getState().showPortal) {
      useChatStore.getState().togglePortal(true);
    }
  }, [portalThread]);

  const activeTopicId = useChatStore((s) => s.activeTopicId);

  useFetchThreads(activeTopicId);

  return null;
});

export default ThreadHydration;

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { memo, useLayoutEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useChatStore } from '@/store/chat';

// sync outside state to useChatStore
const ChatHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useChatStore);
  const searchParams = useSearchParams();
  const router = useRouter();

  // two-way bindings the topic params to chat store
  const topic = searchParams.get('topic');
  const thread = searchParams.get('thread');
  useStoreUpdater('activeTopicId', topic);
  useStoreUpdater('activeThreadId', thread);

  useLayoutEffect(() => {
    const unsubscribeTopic = useChatStore.subscribe(
      (s) => s.activeTopicId,
      (state) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!state) {
          params.delete('topic');
        } else {
          params.set('topic', state);
        }
        router.replace(`?${params.toString()}`);
      },
    );
    const unsubscribeThread = useChatStore.subscribe(
      (s) => s.activeThreadId,
      (state) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!state) {
          params.delete('thread');
        } else {
          params.set('thread', state);
        }
        router.replace(`?${params.toString()}`);
      },
    );

    return () => {
      unsubscribeTopic();
      unsubscribeThread();
    };
  }, [searchParams, router]);

  return null;
});

export default ChatHydration;

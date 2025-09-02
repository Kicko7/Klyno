'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useEffect } from 'react';

const TeamChatSessionHydration = memo(() => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current URL parameters
  const currentChatId = searchParams.get('chatId') || '';
  const currentTopic = searchParams.get('topic') || '';

  // Only sync URL params to store on initial load or direct URL navigation
  useEffect(() => {
    const urlHasParams = currentChatId || currentTopic;
    
    // Only log for debugging - don't update store state directly
    if (urlHasParams) {
      console.log('🔍 URL params detected:', { currentChatId, currentTopic });
    }
  }, []); // Only run on mount

  return null;
});

TeamChatSessionHydration.displayName = 'TeamChatSessionHydration';

export default TeamChatSessionHydration;
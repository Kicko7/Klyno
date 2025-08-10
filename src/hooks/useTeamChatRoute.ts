import { useRouter } from 'nextjs-toploader/app';
import { useCallback } from 'react';

import { useQueryRoute } from '@/hooks/useQueryRoute';

export const useTeamChatRoute = () => {
  const router = useRouter();
  const queryRoute = useQueryRoute();

  const navigateToTeamChat = useCallback(
    (teamId: string, chatId?: string, topicId?: string) => {
      const basePath = `/teams`;
      const query = new URLSearchParams();

      // Always add params in a consistent order
      query.set('view', 'chat');
      if (chatId) query.set('chatId', chatId);
      if (topicId) query.set('topic', topicId);

      const url = `${basePath}?${query.toString()}`;
      const currentUrl = window.location.pathname + window.location.search;

      // Only update URL if it's different
      if (url !== currentUrl) {
        queryRoute.replace(basePath, {
          query: Object.fromEntries(query.entries()),
          replace: true,
          scroll: false, // Prevent scroll jump
        });
      }
    },
    [queryRoute],
  );

  const createNewTeamChat = useCallback(
    (teamId: string, chatId: string, topicId: string) => {
      navigateToTeamChat(teamId, chatId, topicId);
    },
    [navigateToTeamChat],
  );

  const switchToTeamChat = useCallback(
    (teamId: string, chatId?: string, topicId?: string) => {
      navigateToTeamChat(teamId, chatId, topicId);
    },
    [navigateToTeamChat],
  );

  return {
    navigateToTeamChat,
    createNewTeamChat,
    switchToTeamChat,
  };
};

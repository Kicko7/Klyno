import { useRouter } from 'nextjs-toploader/app';
import { useCallback } from 'react';

import { useQueryRoute } from '@/hooks/useQueryRoute';

export const useTeamChatRoute = () => {
  const router = useRouter();
  const queryRoute = useQueryRoute();

  const navigateToTeamChat = useCallback(
    (teamId: string, chatId?: string, topicId?: string) => {
      const basePath = `/teams`;
      const query: Record<string, string> = {
        view: 'chat',
      };

      if (chatId) {
        query.chatId = chatId;
      }

      if (topicId) {
        query.topic = topicId;
      }

      queryRoute.push(basePath, { query });
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

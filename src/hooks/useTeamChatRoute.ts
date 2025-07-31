import { useCallback } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useQueryRoute } from '@/hooks/useQueryRoute';

export const useTeamChatRoute = () => {
  const router = useRouter();
  const queryRoute = useQueryRoute();

  const navigateToTeamChat = useCallback(
    (teamId: string, topicId?: string) => {
      const basePath = `/teams/${teamId}`;
      const query: Record<string, string> = {};
      
      if (topicId) {
        query.topic = topicId;
      }
      
      queryRoute.push(basePath, { query });
    },
    [queryRoute]
  );

  const createNewTeamChat = useCallback(
    (teamId: string, topicId: string) => {
      navigateToTeamChat(teamId, topicId);
    },
    [navigateToTeamChat]
  );

  const switchToTeamChat = useCallback(
    (teamId: string, topicId?: string) => {
      navigateToTeamChat(teamId, topicId);
    },
    [navigateToTeamChat]
  );

  return {
    navigateToTeamChat,
    createNewTeamChat,
    switchToTeamChat,
  };
};

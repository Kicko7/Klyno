import { useCallback, useState } from 'react';

import { teamChatCreditService } from '@/services/teamChatCreditService/index';
import { useTeamChatStore } from '@/store/teamChat';
import { ModelTokensUsage } from '@/types/message';
import { calculateMessageCredits } from '@/utils/creditCalculation';

export interface TeamChatCreditInfo {
  totalCreditsConsumed: number;
  teamChatCreditsConsumed: number;
  isLoading: boolean;
  error: string | null;
}

export const useTeamChatCreditTracking = (userId: string, teamChatId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCreditsConsumed, setTotalCreditsConsumed] = useState(0);
  const [teamChatCreditsConsumed, setTeamChatCreditsConsumed] = useState(0);

  // Get total credits consumed by user across all team chats
  const fetchTotalCreditsConsumed = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const total = await teamChatCreditService.getUserTotalCreditsConsumed(userId);
      setTotalCreditsConsumed(total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch total credits';
      setError(errorMessage);
      console.error('Error fetching total credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Get credits consumed in a specific team chat
  const fetchTeamChatCreditsConsumed = useCallback(async () => {
    if (!userId || !teamChatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const teamChatCredits = await teamChatCreditService.getTeamChatCreditsConsumed(
        userId,
        teamChatId,
      );
      setTeamChatCreditsConsumed(teamChatCredits);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team chat credits';
      setError(errorMessage);
      console.error('Error fetching team chat credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, teamChatId]);

  // Calculate credits for a message (without tracking)
  const calculateMessageCreditsForDisplay = useCallback(
    (messageType: 'user' | 'assistant' | 'system', metadata?: ModelTokensUsage) => {
      return calculateMessageCredits(messageType, metadata);
    },
    [],
  );

  // Refresh all credit data
  const refreshCredits = useCallback(async () => {
    await Promise.all([
      fetchTotalCreditsConsumed(),
      teamChatId ? fetchTeamChatCreditsConsumed() : Promise.resolve(),
    ]);
  }, [fetchTotalCreditsConsumed, fetchTeamChatCreditsConsumed, teamChatId]);

  // Get credit info object
  const getCreditInfo = useCallback(
    (): TeamChatCreditInfo => ({
      totalCreditsConsumed,
      teamChatCreditsConsumed,
      isLoading,
      error,
    }),
    [totalCreditsConsumed, teamChatCreditsConsumed, isLoading, error],
  );

  return {
    // State
    totalCreditsConsumed,
    teamChatCreditsConsumed,
    isLoading,
    error,

    // Actions
    fetchTotalCreditsConsumed,
    fetchTeamChatCreditsConsumed,
    refreshCredits,
    calculateMessageCreditsForDisplay,

    // Computed
    getCreditInfo,
  };
};

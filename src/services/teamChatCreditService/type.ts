import { ModelTokensUsage } from '@/types/message';

export interface TeamChatCreditTracking {
  userId: string;
  teamChatId: string;
  messageId: string;
  messageType: 'user' | 'assistant' | 'system';
  metadata?: ModelTokensUsage;
  creditsConsumed: number;
  timestamp: Date;
}

export interface ITeamChatCreditService {
  trackMessageCredits(
    userId: string,
    teamChatId: string,
    messageId: string,
    messageType: 'user' | 'assistant' | 'system',
    metadata?: ModelTokensUsage,
  ): Promise<TeamChatCreditTracking>;

  getTeamChatCreditsConsumed(userId: string, teamChatId: string): Promise<number>;
  getUserTotalCreditsConsumed(userId: string): Promise<number>;
  getTeamChatCreditHistory(userId: string, teamChatId: string): Promise<TeamChatCreditTracking[]>;
}

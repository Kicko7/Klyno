import { ModelTokensUsage } from '@/types/message';
import { calculateMessageCredits } from '@/utils/creditCalculation';

import { ITeamChatCreditService, TeamChatCreditTracking } from './type';

export class ClientService implements ITeamChatCreditService {
  /**
   * Track credit consumption for a team chat message (client-side)
   */
  async trackMessageCredits(
    userId: string,
    teamChatId: string,
    messageId: string,
    messageType: 'user' | 'assistant' | 'system',
    metadata?: ModelTokensUsage,
  ): Promise<TeamChatCreditTracking> {
    // Calculate credits based on message type and metadata
    const creditsConsumed = calculateMessageCredits(messageType, metadata);

    // Create tracking record
    const tracking: TeamChatCreditTracking = {
      userId,
      teamChatId,
      messageId,
      messageType,
      metadata,
      creditsConsumed,
      timestamp: new Date(),
    };

    // Only track credits for assistant messages (AI-generated content)
    if (messageType === 'assistant' && creditsConsumed > 0) {
      console.log(
        `💰 Client-side team chat credit tracking: ${creditsConsumed} credits consumed for message ${messageId} in team chat ${teamChatId}`,
      );

      // TODO: Implement local storage for client-side credit tracking
      // This would allow offline credit tracking that can be synced later
    }

    return tracking;
  }

  /**
   * Get total credits consumed by a user in a specific team chat (client-side)
   */
  async getTeamChatCreditsConsumed(userId: string, teamChatId: string): Promise<number> {
    console.log(
      '📱 Client-side team chat credit service: getTeamChatCreditsConsumed not implemented',
    );
    return 0;
  }

  /**
   * Get total credits consumed by a user across all team chats (client-side)
   */
  async getUserTotalCreditsConsumed(userId: string): Promise<number> {
    console.log(
      '📱 Client-side team chat credit service: getUserTotalCreditsConsumed not implemented',
    );
    return 0;
  }

  /**
   * Get credit history for a specific team chat (client-side)
   */
  async getTeamChatCreditHistory(
    userId: string,
    teamChatId: string,
  ): Promise<TeamChatCreditTracking[]> {
    console.log(
      '📱 Client-side team chat credit service: getTeamChatCreditHistory not implemented',
    );
    return [];
  }
}

// This file is now deprecated. Use the new service pattern from ./teamChatCreditService/index.ts
// The new pattern automatically chooses between client and server services based on environment
import { teamChatCreditService } from './teamChatCreditService/index';

// Re-export the main service for backward compatibility
export { teamChatCreditService as default };

// Export the interface for type safety
export type { ITeamChatCreditService, TeamChatCreditTracking } from './teamChatCreditService/type';

// Legacy class for backward compatibility
export class TeamChatCreditService {
  private service = teamChatCreditService;

  async trackMessageCredits(
    userId: string,
    teamChatId: string,
    messageId: string,
    messageType: 'user' | 'assistant' | 'system',
    metadata?: any,
  ) {
    return this.service.trackMessageCredits(userId, teamChatId, messageId, messageType, metadata);
  }

  async getTeamChatCreditsConsumed(userId: string, teamChatId: string) {
    return this.service.getTeamChatCreditsConsumed(userId, teamChatId);
  }

  async getUserTotalCreditsConsumed(userId: string) {
    return this.service.getUserTotalCreditsConsumed(userId);
  }

  async getTeamChatCreditHistory(userId: string, teamChatId: string) {
    return this.service.getTeamChatCreditHistory(userId, teamChatId);
  }
}

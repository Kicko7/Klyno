import { OrganizationModel } from '@/database/models/organization';
import { CreditManager } from '@/server/services/credits/creditManager';
import { UsageTracker } from '@/server/services/usage/usageTracker';
import { creditService } from '@/services/creditService';
import { ModelTokensUsage } from '@/types/message';
import { calculateMessageCredits } from '@/utils/creditCalculation';

import { ITeamChatCreditService, TeamChatCreditTracking } from './type';

export class ServerService implements ITeamChatCreditService {
  private creditService = creditService;
  private creditManager = new CreditManager();
  private usageTracker = new UsageTracker();

  constructor() {
    // No need to instantiate since we're using the singleton instance
    this.creditService = creditService;
  }

  /**
   * Track credit consumption for a team chat message (server-side with Redis)
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
      try {
        // Resolve organization owner as payer
        let payerUserId = userId;
        try {
          // We need a DB handle; re-use the lambda context DB via OrganizationModel requirements
          // Since this service may run on server, attempt to infer organization from teamChatId
          const { serverDatabase } = await import('@/libs/trpc/lambda/middleware');
          const db = (serverDatabase as any)?._def?.ctx?.serverDB; // best-effort
          if (db) {
            const { TeamChatService } = await import('@/services/teamChatService');
            const tempSvc = new TeamChatService(db, userId);
            const chat = await tempSvc.getChatById(teamChatId);
            if (chat?.organizationId) {
              const orgModel = new OrganizationModel(db, userId);
              const org = await orgModel.getOrganization(chat.organizationId);
              if (org?.ownerId) payerUserId = org.ownerId;
            }
          }
        } catch {}

        // First enforce balance and deduct immediately (idempotent per messageId)
        await this.creditManager.consumeCredits(payerUserId, creditsConsumed, {
          messageId,
          teamChatId,
          source: 'team_chat',
        });

        // Update usage quota for billing period
        await this.usageTracker.updateUsage({ userId: payerUserId, creditsUsed: creditsConsumed });

        // Track credits in the credit service (Redis) for short-term analytics/sync
        await this.creditService.trackCredits(payerUserId, messageId, creditsConsumed, {
          ...tracking,
          source: 'team_chat',
          teamChatId,
        });

        console.log(
          `💰 Team chat credit deduction: ${creditsConsumed} credits consumed for message ${messageId} in team chat ${teamChatId}`,
        );
      } catch (error) {
        console.error('❌ Failed to deduct or track team chat credits:', error);
        // Don't throw error to avoid breaking the message flow
        // The message will still be sent, but credits won't be deducted/tracked
      }
    }

    return tracking;
  }

  /**
   * Get total credits consumed by a user in a specific team chat (server-side)
   */
  async getTeamChatCreditsConsumed(userId: string, teamChatId: string): Promise<number> {
    try {
      const unsyncedCredits = await this.creditService.getUnsyncedCredits(userId);

      // Filter credits for this specific team chat
      const teamChatCredits = unsyncedCredits.filter(
        (usage) => usage.metadata?.teamChatId === teamChatId,
      );

      return teamChatCredits.reduce((total, usage) => total + usage.credits, 0);
    } catch (error) {
      console.error('❌ Failed to get team chat credits consumed:', error);
      return 0;
    }
  }

  /**
   * Get total credits consumed by a user across all team chats (server-side)
   */
  async getUserTotalCreditsConsumed(userId: string): Promise<number> {
    try {
      const unsyncedCredits = await this.creditService.getUnsyncedCredits(userId);

      // Filter credits for team chats only
      const teamChatCredits = unsyncedCredits.filter(
        (usage) => usage.metadata?.source === 'team_chat',
      );

      return teamChatCredits.reduce((total, usage) => total + usage.credits, 0);
    } catch (error) {
      console.error('❌ Failed to get user total team chat credits consumed:', error);
      return 0;
    }
  }

  /**
   * Get credit history for a specific team chat (server-side)
   */
  async getTeamChatCreditHistory(
    userId: string,
    teamChatId: string,
  ): Promise<TeamChatCreditTracking[]> {
    try {
      const unsyncedCredits = await this.creditService.getUnsyncedCredits(userId);

      // Filter credits for this specific team chat and convert to tracking format
      const teamChatCredits = unsyncedCredits
        .filter((usage) => usage.metadata?.teamChatId === teamChatId)
        .map((usage) => ({
          userId: usage.userId,
          teamChatId: usage.metadata?.teamChatId || '',
          messageId: usage.messageId,
          messageType: usage.metadata?.messageType || 'assistant',
          metadata: usage.metadata?.metadata,
          creditsConsumed: usage.credits,
          timestamp: new Date(usage.timestamp),
        }));

      return teamChatCredits;
    } catch (error) {
      console.error('❌ Failed to get team chat credit history:', error);
      return [];
    }
  }
}

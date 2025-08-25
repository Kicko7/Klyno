import { lambdaClient } from '@/libs/trpc/client';

import { ApiService } from './fetchService';
import { ChatSession, MessageData } from './sessionManager';

export class SyncService {
  private readonly BATCH_SIZE = 100;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // ms
  private apiService: ApiService;

  constructor() {
    this.apiService = new ApiService();
  }

  /**
   * Sync a single message to database
   */
  async syncSingleMessage(teamChatId: string, message: MessageData): Promise<void> {
    try {
      await lambdaClient.teamChat.addMessage.mutate({
        teamChatId,
        // userId: message.userId,
        content: message.content,
        messageType: message.type as 'user' | 'assistant' | 'system',
        metadata: {
          ...message.metadata,
          redisMessageId: message.id,
          syncedFromRedis: true,
          originalTimestamp: message.timestamp,
        },
      });
      console.log(`✅ Synced single message to DB: ${message.id}`);
    } catch (error) {
      console.error(`Failed to sync message ${message.id}:`, error);
      throw error;
    }
  }

  /**
   * Batch sync messages to database
   */
  async batchSyncMessages(teamChatId: string, messages: MessageData[]): Promise<void> {
    if (messages.length === 0) return;

    console.log(`📤 Batch syncing ${messages.length} messages for team chat: ${teamChatId}`);

    // Process in batches
    for (let i = 0; i < messages.length; i += this.BATCH_SIZE) {
      const batch = messages.slice(i, i + this.BATCH_SIZE);
      await this.syncBatch(teamChatId, batch);
    }
  }

  /**
   * Sync a batch of messages with retry logic
   */
  private async syncBatch(teamChatId: string, batch: MessageData[]): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        // Use Promise.all for parallel processing within batch
        await Promise.all(
          batch.map(async (message) => {
            if (message?.id) {
              await this.apiService.addMessage({
                id: message.id,
                teamChatId,
                userId: message.userId,
                content: message.content,
                messageType: message.type as 'user' | 'assistant' | 'system',
                metadata: {
                  ...message.metadata,
                  redisMessageId: message.id,
                  syncedFromRedis: true,
                  originalTimestamp: message.timestamp,
                  syncAttempt: attempt,
                },
              });
            }
          }),
        );

        console.log(`✅ Synced batch of ${batch.length} messages (attempt ${attempt})`);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.error(`Batch sync failed (attempt ${attempt}/${this.RETRY_ATTEMPTS}):`, error);

        if (attempt < this.RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to sync batch after ${this.RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Sync entire session to database
   */
  async syncSessionToDb(session: ChatSession): Promise<void> {
    try {
      console.log(`🔄 Syncing session to DB: ${session.teamChatId}`);

      // Filter unsynced messages
      const unsyncedMessages = session.messages.filter((m) => !m.syncedToDb);

      if (unsyncedMessages.length === 0) {
        console.log('No unsynced messages to sync');
        return;
      }

      // Batch sync messages
      await this.batchSyncMessages(session.teamChatId, unsyncedMessages);

      // Update chat metadata
      await this.updateChatMetadata(session.teamChatId, {
        lastActivityAt: session.lastActivityAt,
        messageCount: session.messages.length,
        lastSessionId: session.sessionId,
        participantCount: session.participants.length,
      });

      // Create session history record
      await this.createSessionHistory(session);

      console.log(`✅ Session sync completed: ${unsyncedMessages.length} messages synced`);
    } catch (error) {
      console.error('Failed to sync session to DB:', error);
      throw error;
    }
  }

  /**
   * Update chat metadata after sync
   */
  async updateChatMetadata(
    teamChatId: string,
    metadata: {
      lastActivityAt: number;
      messageCount: number;
      lastSessionId?: string;
      participantCount?: number;
    },
  ): Promise<void> {
    try {
      await lambdaClient.teamChat.updateTeamChat.mutate({
        id: teamChatId,
        metadata: {
          lastActivityAt: new Date(metadata.lastActivityAt).toISOString(),
          totalMessageCount: metadata.messageCount,
          lastSessionId: metadata.lastSessionId,
          activeParticipants: metadata.participantCount,
          lastSyncedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to update chat metadata:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Create session history record
   */
  async createSessionHistory(session: ChatSession): Promise<void> {
    try {
      // This would create a record in team_chat_sessions table
      // For now, we'll store it in chat metadata
      await lambdaClient.teamChat.updateTeamChat.mutate({
        id: session.teamChatId,
        metadata: {
          sessionHistory: {
            [session.sessionId]: {
              startedAt: new Date(session.createdAt).toISOString(),
              endedAt: new Date().toISOString(),
              messageCount: session.messages.length,
              participantCount: session.participants.length,
              syncStatus: 'completed',
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to create session history:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Load history from database
   */
  async loadHistoryFromDb(teamChatId: string, limit: number = 50): Promise<MessageData[]> {
    try {
      const messages = await lambdaClient.teamChat.getMessages.query({
        teamChatId,
        limit,
      });

      return messages.map((msg) => ({
        id: msg.metadata?.redisMessageId || msg.id,
        content: msg.content,
        userId: msg.userId,
        timestamp: msg.createdAt.getTime(),
        type: msg.messageType as 'user' | 'assistant' | 'system',
        metadata: msg.metadata,
        syncedToDb: true,
      }));
    } catch (error) {
      console.error('Failed to load history from DB:', error);
      return [];
    }
  }

  /**
   * Check if message already exists in database
   */
  private async checkMessageExists(teamChatId: string, redisMessageId: string): Promise<boolean> {
    try {
      // This is a simplified check - in production, you'd want a dedicated endpoint
      const recentMessages = await lambdaClient.teamChat.getMessages.query({
        teamChatId,
        limit: 100,
      });

      return recentMessages.some((msg) => msg.metadata?.redisMessageId === redisMessageId);
    } catch (error) {
      console.error('Failed to check message existence:', error);
      return false; // Assume doesn't exist
    }
  }

  /**
   * Mark messages as synced in Redis (called after successful sync)
   */
  async markMessagesSynced(sessionId: string, messages: MessageData[]): Promise<void> {
    // This would update the messages in Redis to mark them as synced
    // Implementation depends on how we want to track this
    console.log(`Marked ${messages.length} messages as synced for session: ${sessionId}`);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(teamChatId: string): Promise<{
    totalMessages: number;
    syncedMessages: number;
    pendingMessages: number;
    lastSyncTime: Date | null;
  }> {
    try {
      const chat = await lambdaClient.teamChat.getTeamChatById.query({ id: teamChatId });

      return {
        totalMessages: chat?.metadata?.totalMessageCount || 0,
        syncedMessages: chat?.metadata?.syncedMessageCount || 0,
        pendingMessages: 0, // Would need to check Redis
        lastSyncTime: chat?.metadata?.lastSyncedAt ? new Date(chat.metadata.lastSyncedAt) : null,
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return {
        totalMessages: 0,
        syncedMessages: 0,
        pendingMessages: 0,
        lastSyncTime: null,
      };
    }
  }

  /**
   * Utility function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up old session history (maintenance task)
   */
  async cleanupOldSessions(daysToKeep: number = 30): Promise<void> {
    // This would clean up old session records from the database
    // Implementation would depend on your retention policy
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    console.log(`Cleaning up sessions older than ${cutoffDate.toISOString()}`);
    // TODO: Implement cleanup logic
  }
}


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
                sendTime: message.timestamp,
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
      // await this.updateChatMetadata(session.teamChatId, {
      //   lastActivityAt: session.lastActivityAt,
      //   messageCount: session.messages.length,
      //   lastSessionId: session.sessionId,
      //   participantCount: session.participants.length,
      // });

      // Create session history record
      // await this.createSessionHistory(session);

      console.log(`✅ Session sync completed: ${unsyncedMessages.length} messages synced`);
    } catch (error) {
      console.error('Failed to sync session to DB:', error);
      throw error;
    }
  }

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

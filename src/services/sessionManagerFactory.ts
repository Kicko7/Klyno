import { getOptimizedRedisService } from './optimized-redis-service-factory';
import { SessionManager } from './sessionManager';
import { SyncService } from './syncService';

let sessionManagerInstance: SessionManager | null = null;
let syncServiceInstance: SyncService | null = null;

/**
 * Get or create SessionManager instance
 */
export async function getSessionManager(): Promise<SessionManager> {
  if (!sessionManagerInstance) {
    const redisService = await getOptimizedRedisService();
    const syncService = await getSyncService();

    sessionManagerInstance = new SessionManager(redisService as any, syncService);
    console.log('✅ SessionManager initialized');
  }

  return sessionManagerInstance;
}

/**
 * Get or create SyncService instance
 */
export async function getSyncService(): Promise<SyncService> {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
    console.log('✅ SyncService initialized');
  }

  return syncServiceInstance;
}

/**
 * Start background sync worker
 */
export function startBackgroundSyncWorker(intervalMs: number = 60000): void {
  console.log('🚀 Starting background sync worker...');

  setInterval(async () => {
    try {
      const sessionManager = await getSessionManager();
      const syncService = await getSyncService();

      // Get sessions that need syncing
      const expiringSessions = await sessionManager.getExpiringSessions();

      if (expiringSessions.length > 0) {
        console.log(`⏰ Found ${expiringSessions.length} sessions to sync`);

        for (const session of expiringSessions) {
          try {
            // Mark as syncing
            await sessionManager.markSessionSyncing(session.teamChatId);

            // Sync to database
            await syncService.syncSessionToDb(session);

            // Remove from Redis
            await sessionManager.expireSession(session.teamChatId);

            console.log(`✅ Synced and expired session: ${session.teamChatId}`);
          } catch (error) {
            console.error(`Failed to sync session ${session.teamChatId}:`, error);
          }
        }
      }

      // Also check for sessions that need background sync (approaching limit)
      const activeSessions = await sessionManager.getAllActiveSessions();

      for (const session of activeSessions) {
        if (await sessionManager.needsBackgroundSync(session.teamChatId)) {
          console.log(`🔄 Background sync needed for: ${session.teamChatId}`);
          await sessionManager.performBackgroundSync(session.teamChatId);
        }
      }
    } catch (error) {
      console.error('Background sync worker error:', error);
    }
  }, intervalMs);
}

/**
 * Session manager utilities
 */
export const SessionManagerUtils = {
  /**
   * Get session statistics
   */
  async getGlobalStats(): Promise<{
    totalActiveSessions: number;
    totalMessages: number;
    totalParticipants: number;
    avgMessagesPerSession: number;
  }> {
    const sessionManager = await getSessionManager();
    const sessions = await sessionManager.getAllActiveSessions();

    if (sessions.length === 0) {
      return {
        totalActiveSessions: 0,
        totalMessages: 0,
        totalParticipants: 0,
        avgMessagesPerSession: 0,
      };
    }

    const totalMessages = sessions.reduce((sum: number, s: any) => sum + s.messages.length, 0);
    const allParticipants = new Set(sessions.flatMap((s: any) => s.participants));

    return {
      totalActiveSessions: sessions.length,
      totalMessages,
      totalParticipants: allParticipants.size,
      avgMessagesPerSession: Math.round(totalMessages / sessions.length),
    };
  },

  /**
   * Force sync all active sessions
   */
  async forceSyncAll(): Promise<void> {
    const sessionManager = await getSessionManager();
    const syncService = await getSyncService();
    const sessions = await sessionManager.getAllActiveSessions();

    console.log(`🔄 Force syncing ${sessions.length} active sessions...`);

    for (const session of sessions) {
      try {
        await syncService.syncSessionToDb(session);
        console.log(`✅ Force synced: ${session.teamChatId}`);
      } catch (error) {
        console.error(`Failed to force sync ${session.teamChatId}:`, error);
      }
    }
  },

  /**
   * Clear all sessions (emergency use only)
   */
  async clearAllSessions(): Promise<void> {
    const sessionManager = await getSessionManager();
    const sessions = await sessionManager.getAllActiveSessions();

    console.warn(`⚠️ Clearing ${sessions.length} active sessions...`);

    for (const session of sessions) {
      try {
        await sessionManager.expireSession(session.teamChatId);
      } catch (error) {
        console.error(`Failed to clear session ${session.teamChatId}:`, error);
      }
    }
  },
};

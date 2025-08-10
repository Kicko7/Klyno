import { CreditSyncService } from '@/services/creditSyncService';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class CreditSyncJob {
  private syncService = new CreditSyncService();
  private intervalId?: NodeJS.Timeout;

  start() {
    if (this.intervalId) return;

    const runSync = async () => {
      try {
        await this.syncService.syncAllCredits();
      } catch (error) {
        console.error('Error in credit sync job:', error);
      }
    };

    // Run immediately
    runSync();

    // Schedule periodic runs
    this.intervalId = setInterval(runSync, SYNC_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

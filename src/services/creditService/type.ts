export interface ICreditService {
  trackCredits(userId: string, messageId: string, credits: number, metadata?: any): Promise<void>;
  getUnsyncedCredits(userId: string): Promise<any[]>;
  markCreditsSynced(userId: string, messageIds: string[]): Promise<void>;
  getTotalCredits(userId: string): Promise<number>;
}

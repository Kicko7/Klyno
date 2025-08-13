import { isDesktop } from '@/const/version';

import { ClientService } from './creditService/client';
import { ServerService } from './creditService/server';
import type { ICreditService } from './creditService/type';

// Create instances
const serverService = new ServerService();
const clientService = new ClientService();

// Choose service based on environment
export const creditService =
  process.env.NEXT_PUBLIC_SERVICE_MODE === 'server' || isDesktop ? serverService : clientService;

// Export individual services
export const creditServerService = serverService;
export const creditClientService = clientService;

// Export interface
export type { ICreditService };

// Legacy class for backward compatibility
export class CreditService implements ICreditService {
  private service = creditService;

  async trackCredits(userId: string, messageId: string, credits: number, metadata = {}) {
    return this.service.trackCredits(userId, messageId, credits, metadata);
  }

  async getUnsyncedCredits(userId: string) {
    return this.service.getUnsyncedCredits(userId);
  }

  async markCreditsSynced(userId: string, messageIds: string[]) {
    return this.service.markCreditsSynced(userId, messageIds);
  }

  async getTotalCredits(userId: string) {
    return this.service.getTotalCredits(userId);
  }
}

import { ClientService } from './client';

// Client-facing service. Server-side enforcement is handled in tRPC router.
export const teamChatCreditService = new ClientService();

export type { ITeamChatCreditService, TeamChatCreditTracking } from './type';

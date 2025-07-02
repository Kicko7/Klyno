import { isDesktop } from '@/const/version';

import { ServerService } from './server';

// Only export ServerService for SSR and isDesktop
export const userService =
  process.env.NEXT_PUBLIC_SERVICE_MODE === 'server' || isDesktop ? new ServerService() : null;

export const userClientService = null;

import { isDesktop } from '@/const/version';

import { ServerService } from './server';

// Only import deprecated service on client side to avoid SSR issues
let DeprecatedService: any;
let ClientService: any;

if (typeof window !== 'undefined') {
  // Dynamic imports to avoid SSR issues
  const { ClientService: DeprecatedServiceClass } = require('./_deprecated');
  const { ClientService: ClientServiceClass } = require('./client');
  DeprecatedService = DeprecatedServiceClass;
  ClientService = ClientServiceClass;
}

const clientService =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite' 
    ? new ClientService() 
    : typeof window !== 'undefined' 
      ? new DeprecatedService() 
      : null;

export const userService =
  process.env.NEXT_PUBLIC_SERVICE_MODE === 'server' || isDesktop
    ? new ServerService()
    : clientService;

export const userClientService = clientService;

// Client-only export for deprecated user service
import type { IUserService } from './type';

let ClientService: new () => IUserService;

if (typeof window !== 'undefined') {
  // Only require on the client
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ClientService = require('./_deprecated').ClientService;
} else {
  // On the server, throw if accessed
  ClientService = class {
    constructor() {
      throw new Error('ClientService is only available in the browser.');
    }
  } as new () => IUserService;
}

export { ClientService };

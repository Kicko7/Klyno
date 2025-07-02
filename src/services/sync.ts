// DO NOT import this file in shared or server code. This is a stub for SSR safety.
// All real sync logic is in sync.client.ts. See https://nextjs.org/docs/messages/react-hydration-error

class SyncServiceStub {
  enabledSync() {
    throw new Error('syncService is only available in the browser (client-side).');
  }
  disableSync() {
    throw new Error('syncService is only available in the browser (client-side).');
  }
}

export const syncService = new SyncServiceStub();

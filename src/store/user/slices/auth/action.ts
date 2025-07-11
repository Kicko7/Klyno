import { StateCreator } from 'zustand/vanilla';

import { enableAuth, enableClerk } from '@/const/auth';

import { UserStore } from '../../store';

export interface UserAuthAction {
  enableAuth: () => boolean;
  /**
   * universal logout method
   */
  logout: () => Promise<void>;
  /**
   * universal login method
   */
  openLogin: () => Promise<void>;
}

export const createAuthSlice: StateCreator<
  UserStore,
  [['zustand/devtools', never]],
  [],
  UserAuthAction
> = (set, get) => ({
  enableAuth: () => {
    return enableAuth;
  },
  logout: async () => {
    if (enableClerk) {
      get().clerkSignOut?.({ redirectUrl: location.toString() });

      return;
    }

    // NextAuth is disabled - only Clerk is supported
  },
  openLogin: async () => {
    if (enableClerk) {
      const reditectUrl = location.toString();
      get().clerkSignIn?.({
        fallbackRedirectUrl: reditectUrl,
        signUpForceRedirectUrl: reditectUrl,
        signUpUrl: '/signup',
      });

      return;
    }

    // NextAuth is disabled - only Clerk is supported
  },
});

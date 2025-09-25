'use client';

import { useRouter } from 'next/navigation';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createStoreUpdater } from 'zustand-utils';

import { useIsMobile } from '@/hooks/useIsMobile';
import { useEnabledDataSync } from '@/hooks/useSyncData';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useAgentStore } from '@/store/agent';
import { useAiInfraStore } from '@/store/aiInfra';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useServerConfigStore } from '@/store/serverConfig';
// import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

const StoreInitialization = memo(() => {
  // prefetch error ns to avoid don't show error content correctly
  useTranslation('error');

  const router = useRouter();
  const [isLogin, useInitUserState] = useUserStore((s) => [
    authSelectors.isLogin(s),
    s.useInitUserState,
  ]);

  const { serverConfig } = useServerConfigStore();

  const useInitSystemStatus = useGlobalStore((s) => s.useInitSystemStatus);

  const useInitAgentStore = useAgentStore((s) => s.useInitInboxAgentStore);
  const useInitAiProviderKeyVaults = useAiInfraStore((s) => s.useFetchAiProviderRuntimeState);

  // Get subscription data
  const { subscriptionInfo: subscription, fetchSubscriptionInfo } = useUserSubscription();

  // Fetch subscription info only once when subscription is null/undefined
  useEffect(() => {
    if (!subscription) {
      fetchSubscriptionInfo();
    }
  }, [subscription, fetchSubscriptionInfo]);

  // init the system preference
  useInitSystemStatus();

  // fetch server config
  const useFetchServerConfig = useServerConfigStore((s) => s.useInitServerConfig);
  useFetchServerConfig();

  // Update NextAuth status
  // const useUserStoreUpdater = createStoreUpdater(useUserStore);
  // const oAuthSSOProviders = []; // TODO: Implement OAuth
  // useUserStoreUpdater('oAuthSSOProviders', oAuthSSOProviders);

  /**
   * The store function of `isLogin` will both consider the values of `enableAuth` and `isSignedIn`.
   * But during initialization, the value of `enableAuth` might be incorrect cause of the async fetch.
   * So we need to use `isSignedIn` only to determine whether request for the default agent config and user state.
   */
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const isLoginOnInit = isDBInited && isLogin;

  // init inbox agent and default agent config
  useInitAgentStore(isLoginOnInit, serverConfig.defaultAgent?.config);

  // init user provider key vaults with subscription data
  useInitAiProviderKeyVaults(isLoginOnInit, subscription);

  // init user state
  useInitUserState(isLoginOnInit, serverConfig, {
    onSuccess: (state) => {
      if (state.isOnboard === false) {
        router.push('/onboard');
      }
    },
  });

  useEnabledDataSync();

  const useStoreUpdater = createStoreUpdater(useGlobalStore);

  const mobile = useIsMobile();

  useStoreUpdater('isMobile', mobile);
  useStoreUpdater('router', router);

  return null;
});

export default StoreInitialization;
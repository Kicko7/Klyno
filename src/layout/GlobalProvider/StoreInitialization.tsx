'use client';

import { useRouter } from 'next/navigation';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createStoreUpdater } from 'zustand-utils';

import { enableNextAuth } from '@/const/auth';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAgentStore } from '@/store/agent';
import { useAiInfraStore } from '@/store/aiInfra';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useServerConfigStore } from '@/store/serverConfig';
import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

const StoreInitialization = memo(() => {
  // prefetch error ns to avoid don't show error content correctly
  useTranslation('error');

  const router = useRouter();
  const [isLogin, isSignedIn, useInitUserState] = useUserStore((s) => [
    authSelectors.isLogin(s),
    s.isSignedIn,
    s.useInitUserState,
  ]);

  const { serverConfig } = useServerConfigStore();

  const useInitSystemStatus = useGlobalStore((s) => s.useInitSystemStatus);

  const useInitAgentStore = useAgentStore((s) => s.useInitInboxAgentStore);
  const useInitAiProviderKeyVaults = useAiInfraStore((s) => s.useFetchAiProviderRuntimeState);

  // init the system preference
  useInitSystemStatus();

  // fetch server config
  const useFetchServerConfig = useServerConfigStore((s) => s.useInitServerConfig);
  useFetchServerConfig();

  // Update NextAuth status
  const useUserStoreUpdater = createStoreUpdater(useUserStore);
  const oAuthSSOProviders = useServerConfigStore(serverConfigSelectors.oAuthSSOProviders);
  useUserStoreUpdater('oAuthSSOProviders', oAuthSSOProviders);

  /**
   * The store function of `isLogin` will both consider the values of `enableAuth` and `isSignedIn`.
   * But during initialization, the value of `enableAuth` might be incorrect cause of the async fetch.
   * So we need to use `isSignedIn` only to determine whether request for the default agent config and user state.
   */
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const isLoginOnInit = isDBInited && (enableNextAuth ? isSignedIn : isLogin);

  // init inbox agent and default agent config
  useInitAgentStore(isLoginOnInit, serverConfig.defaultAgent?.config);

  // init user provider key vaults
  useInitAiProviderKeyVaults(isLoginOnInit);

  // init user state
  useInitUserState(isLoginOnInit, serverConfig, {
    onSuccess: () => {
      // TODO: If onboarding UI is present, keep this redirect. Otherwise, comment out to avoid 404.
      // if (state.isOnboard === false) {
      //   router.push('/onboard');
      // }
    },
  });

  // Client-only DataSync initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Dynamic import to ensure DataSync only runs in the browser
      import('@/hooks/useSyncData').then(({ useEnabledDataSync }) => {
        // Create a temporary component to use the hook
        const TempComponent = () => {
          useEnabledDataSync();
          return null;
        };
        
        // Render the temporary component
        const { createRoot } = require('react-dom/client');
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.append(container);
        
        const root = createRoot(container);
        root.render(<TempComponent />);
        
        // Cleanup after a short delay
        setTimeout(() => {
          root.unmount();
          container.remove();
        }, 100);
        
      }).catch((error) => {
        console.error('Failed to load DataSync hook:', error);
      });
    }
  }, []);

  const useStoreUpdater = createStoreUpdater(useGlobalStore);

  const mobile = useIsMobile();

  useStoreUpdater('isMobile', mobile);
  useStoreUpdater('router', router);

  return null;
});

export default StoreInitialization;

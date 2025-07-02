import isEqual from 'fast-deep-equal';
import { useContext } from 'react';

import { isDeprecatedEdition } from '@/const/version';
import { LoadingContext } from '@/features/Conversation/Error/APIKeyForm/LoadingContext';
import { aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';
import { useUserStore } from '@/store/user';
import { keyVaultsConfigSelectors } from '@/store/user/selectors';

export const useApiKey = (provider: string) => {
  const [apiKey, baseUrl, setConfig] = useUserStore((s) => [
    keyVaultsConfigSelectors.getVaultByProvider(provider as any)(s)?.apiKey,
    keyVaultsConfigSelectors.getVaultByProvider(provider as any)(s)?.baseUrl,
    s.updateKeyVaultConfig,
  ]);
  const { setLoading } = useContext(LoadingContext);
  const updateAiProviderConfig = useAiInfraStore((s) => s.updateAiProviderConfig);
  const data = useAiInfraStore(aiProviderSelectors.providerConfigById(provider), isEqual);

  // TODO: remove this in V2
  if (isDeprecatedEdition) return { apiKey, baseUrl, setConfig };
  //

  return {
    apiKey: data?.keyVaults.apiKey,
    baseUrl: data?.keyVaults?.baseUrl,
    setConfig: async (id: string, params: Record<string, string>) => {
      const next = { ...data?.keyVaults, ...params };
      if (isEqual(data?.keyVaults, next)) return;

      setLoading(true);
      await updateAiProviderConfig(id, {
        keyVaults: { ...data?.keyVaults, ...params },
      });
      setLoading(false);
    },
  };
};

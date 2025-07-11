import { mapFeatureFlagsEnvToState } from '@/config/featureFlags';

import { ServerConfigStore } from './store';

export const featureFlagsSelectors = (s: ServerConfigStore) =>
  mapFeatureFlagsEnvToState(s.featureFlags);

export const serverConfigSelectors = {
  enableUploadFileToServer: (s: ServerConfigStore) => s.serverConfig.enableUploadFileToServer,
  enabledAccessCode: (s: ServerConfigStore) => !!s.serverConfig?.enabledAccessCode,
  isMobile: (s: ServerConfigStore) => s.isMobile || false,
};
